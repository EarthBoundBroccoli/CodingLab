import axios from "axios";
import mongoose from "mongoose";
import { Problem } from "../models/Problem.js";
import { StudentStats } from "../models/StudentStats.js";
import { Submission } from "../models/Submission.js";
import { auth } from "../lib/auth.js";
import { getJDoodleConfig } from "../lib/jdoodle.js";
import { buildSubmissionActivity } from "../utils/submissionActivity.js";
import { withSubmissionTransaction } from "../utils/submissionPersistence.js";
import { wrapCpp, wrapPython, wrapJava, createRuntimeMarker, readRuntimeFailure, readCompilationFailure } from "../utils/judgingRuntime.js";

// Helper function to fetch content from Cloudinary URL if needed
const fetchIfNeeded = async (urlOrContent) => {
  if (urlOrContent && (urlOrContent.startsWith("http://") || urlOrContent.startsWith("https://"))) {
    try {
      console.log(`Fetching remote testcase content from: ${urlOrContent}`);
      const response = await axios.get(urlOrContent, { responseType: 'text' });
      return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } catch (err) {
      console.error(`Failed to fetch remote testcase content: ${err.message}`);
      throw new Error(`Failed to retrieve test case files from host.`);
    }
  }
  return urlOrContent;
};

// @desc    Submit problem solution for evaluation
// @route   POST /api/submissions/submit
// @access  Protected
export const submitProblemSolution = async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user.id;
    const { problemId, code, language } = req.body;

    if (!problemId || !code || !language) {
      return res.status(400).json({ message: "problemId, code, and language are required fields." });
    }

    if (!mongoose.isObjectIdOrHexString(problemId)) {
      return res.status(404).json({ message: "Problem not found." });
    }

    // Keep unavailable problems private, including direct API submissions.
    const problem = await Problem.findOne({ _id: problemId, status: "approved" });
    if (!problem) {
      return res.status(404).json({ message: "Problem not found." });
    }

    const { hiddenInput: rawHiddenInput, hiddenOutput: rawHiddenOutput, memoryLimit, timeLimit } = problem;

    // Fetch actual text from Cloudinary/external links if needed
    const hiddenInput = await fetchIfNeeded(rawHiddenInput);
    const hiddenOutput = await fetchIfNeeded(rawHiddenOutput);

    // 2. Prepare test cases
    const splitDelimiter = /(?:\r?\n)?\/\/\/(?:\r?\n)?/;
    const trimmedInput = hiddenInput.trim();
    const trimmedOutput = hiddenOutput.trim();
    
    const inputsArray = trimmedInput.includes('///') ? trimmedInput.split(splitDelimiter) : [trimmedInput];
    const outputsArray = trimmedOutput.includes('///') ? trimmedOutput.split(splitDelimiter) : [trimmedOutput];

    // Combine test cases into single batch input
    const combinedInput = inputsArray.join('\n///\n');

    // Wrap the code according to language
    const runtimeMarker = createRuntimeMarker();
    let wrappedCode = code;
    if (language === 'cpp') {
      wrappedCode = wrapCpp(code, runtimeMarker);
    } else if (language === 'python') {
      wrappedCode = wrapPython(code, runtimeMarker);
    } else if (language === 'java') {
      wrappedCode = wrapJava(code, runtimeMarker);
    }

    // JDoodle Configuration
    const jdoodleConfig = getJDoodleConfig(language);
    if (!jdoodleConfig) {
      return res.status(400).json({ message: `Unsupported language selection: ${language}` });
    }

    const clientId = process.env.JDOODLE_CLIENT_ID;
    const clientSecret = process.env.JDOODLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("JDoodle API Client ID or Client Secret is missing from environment config.");
      return res.status(500).json({ message: "Code execution service is currently misconfigured." });
    }

    const payload = {
      clientId,
      clientSecret,
      script: wrappedCode,
      language: jdoodleConfig.language,
      versionIndex: jdoodleConfig.versionIndex,
      stdin: combinedInput,
    };

    console.log(`Sending batch execution request to JDoodle for problem: "${problem.title}" [${language}]...`);
    const response = await axios.post("https://api.jdoodle.com/v1/execute", payload);

    console.log("JDoodle execution response:", response.data);

    const jdoodleOutput = response.data.output || "";
    const statusCode = response.data.statusCode;
    const runtimeOutput = readRuntimeFailure(response.data, runtimeMarker);
    const compilationOutput = readCompilationFailure(response.data, runtimeMarker);
    const cpuTime = response.data.cpuTime;
    const reportedMemory = response.data.memory;
    const memory = Number(reportedMemory);
    const hasMemory = (typeof reportedMemory === 'number' || (typeof reportedMemory === 'string' && reportedMemory.trim() !== ''))
      && Number.isFinite(memory) && memory >= 0;
    if ((statusCode === 0 || statusCode === 200) && !hasMemory && !runtimeOutput && !compilationOutput) {
      throw new Error('Execution service did not report valid memory usage. Please retry.');
    }

    // Check for Time Limit Exceeded (TLE)
    const cpuTimeMs = parseFloat(cpuTime) * 1000;
    
    let evaluationVerdict = '';
    if (compilationOutput || (statusCode !== 0 && statusCode !== 200)) {
      evaluationVerdict = 'CE';
    } else if (cpuTimeMs > timeLimit) {
      evaluationVerdict = 'TLE';
    } else if (hasMemory && memory > memoryLimit * 1024) {
      evaluationVerdict = 'MLE';
    } else if (runtimeOutput) {
      evaluationVerdict = 'RE';
    } else {
      // Split JDoodle's output block back down using our delimiter
      const actualOutputs = jdoodleOutput.trim().split(splitDelimiter);
      
      let isMatch = true;
      if (actualOutputs.length !== outputsArray.length) {
        isMatch = false;
      } else {
        for (let i = 0; i < outputsArray.length; i++) {
          const expected = outputsArray[i].replace(/\r/g, '').trim();
          const actual = actualOutputs[i].replace(/\r/g, '').trim();
          if (expected !== actual) {
            isMatch = false;
            break;
          }
        }
      }
      evaluationVerdict = isMatch ? 'AC' : 'WA';
    }

    // Map evaluation verdict to DB verdict enum
    let dbVerdict = 'Wrong Answer';
    if (evaluationVerdict === 'AC') {
      dbVerdict = 'Accepted';
    } else if (evaluationVerdict === 'TLE') {
      dbVerdict = 'Time Limit Exceeded';
    } else if (evaluationVerdict === 'MLE') {
      dbVerdict = 'Memory Limit Exceeded';
    } else if (evaluationVerdict === 'RE') {
      dbVerdict = 'Runtime Error';
    } else if (evaluationVerdict === 'CE') {
      dbVerdict = 'Compilation Error';
    } else {
      if (statusCode !== 0 && statusCode !== 200) {
        dbVerdict = 'Compilation Error';
      } else {
        dbVerdict = 'Wrong Answer';
      }
    }

    // 3. User statistics update mutation
    await withSubmissionTransaction(async session => {
      let stats = await StudentStats.findOne({ userId }).session(session);
      if (!stats) {
        stats = new StudentStats({ userId });
      }

      const todayStr = new Date().toISOString().split('T')[0];

      if (evaluationVerdict === 'AC') {
        // Solved problem handling (ensure uniqueness)
        const alreadySolved = stats.solvedProblems.some(id => id.toString() === problemId.toString());
        if (!alreadySolved) {
          stats.solvedProblems.push(problemId);

          // Difficulty breakdown increment
          const diffKey = problem.difficulty.toLowerCase();
          if (stats.difficultyBreakdown[diffKey] !== undefined) {
            stats.difficultyBreakdown[diffKey] += 1;
          }

          // Award Practice XP Points based on difficulty
          if (diffKey === 'easy') {
            stats.points = (stats.points || 0) + 10;
          } else if (diffKey === 'medium') {
            stats.points = (stats.points || 0) + 30;
          } else if (diffKey === 'hard') {
            stats.points = (stats.points || 0) + 50;
          }
        }

        // Pull from attempted problems
        stats.attemptedProblems = stats.attemptedProblems.filter(id => id.toString() !== problemId.toString());

        // Calculate streak
        if (!stats.lastActiveDate) {
          stats.currentStreak = 1;
          stats.longestStreak = Math.max(stats.longestStreak || 0, 1);
        } else if (stats.lastActiveDate === todayStr) {
          // Streak remains same, already active today
        } else {
          const lastDate = new Date(stats.lastActiveDate);
          const todayDate = new Date(todayStr);
          const diffTime = Math.abs(todayDate - lastDate);
          const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            stats.currentStreak += 1;
          } else {
            stats.currentStreak = 1;
          }
          stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);
        }
        stats.lastActiveDate = todayStr;

        // Update activity history timeline map
        const historyIndex = stats.activityHistory.findIndex(entry => entry.date === todayStr);
        if (historyIndex !== -1) {
          stats.activityHistory[historyIndex].count += 1;
        } else {
          stats.activityHistory.push({ date: todayStr, count: 1 });
        }
      } else {
        // WA or TLE (or compilation error which we treat similarly for attempted tracking)
        const alreadySolved = stats.solvedProblems.some(id => id.toString() === problemId.toString());
        const alreadyAttempted = stats.attemptedProblems.some(id => id.toString() === problemId.toString());
        if (!alreadySolved && !alreadyAttempted) {
          stats.attemptedProblems.push(problemId);
        }
      }

      // Increment overall submissions count across all execution paths
      stats.totalSubmissionsCount = (stats.totalSubmissionsCount || 0) + 1;
      await stats.save({ session });

      // Create and save submission document
      const newSubmission = new Submission({
        problemId,
        userId,
        code,
        language,
        verdict: dbVerdict,
        timeTaken: Math.round(cpuTimeMs) || 0,
        memoryUsed: hasMemory ? memory : 0,
        compileOutput: dbVerdict === 'Runtime Error' ? runtimeOutput : dbVerdict === 'Compilation Error' ? compilationOutput || jdoodleOutput : ""
      });
      await newSubmission.save({ session });
    });

    return res.status(200).json({
      message: "Submission evaluated successfully",
      verdict: dbVerdict,
      evaluationVerdict, // 'AC', 'WA', 'TLE', or 'MLE' for frontend status badges
      timeTaken: Math.round(cpuTimeMs) || 0,
      memoryUsed: hasMemory ? memory : 0,
      compileOutput: dbVerdict === 'Runtime Error' ? runtimeOutput : dbVerdict === 'Compilation Error' ? compilationOutput || jdoodleOutput : "",
      jdoodleOutput: jdoodleOutput
    });
  } catch (error) {
    console.error("Submission evaluation error:", error);
    return res.status(500).json({
      message: "An internal error occurred during submission processing.",
      error: error.message
    });
  }
};

// @desc    Get current student's statistics
// @route   GET /api/submissions/profile-stats
// @access  Protected
export const getStudentProfileStats = async (req, res) => {
  try {
    const session = await auth.api.getSession({
      headers: req.headers
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const userId = session.user.id;
    let stats = await StudentStats.findOne({ userId });
    if (!stats) {
      stats = new StudentStats({
        userId,
        solvedProblems: [],
        attemptedProblems: [],
        difficultyBreakdown: { easy: 0, medium: 0, hard: 0 },
        totalSubmissionsCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActiveDate: "",
        activityHistory: []
      });
      await stats.save();
    }

    // Fetch user's latest submissions to map latest verdict per problem
    const submissions = await Submission.find({ userId }).sort({ createdAt: -1 });
    const latestVerdicts = {};
    for (const sub of submissions) {
      const pidStr = sub.problemId.toString();
      if (!latestVerdicts[pidStr]) {
        latestVerdicts[pidStr] = sub.verdict;
      }
    }

    const statsObj = stats.toObject();
    statsObj.latestVerdicts = latestVerdicts;

    return res.status(200).json(statsObj);
  } catch (error) {
    console.error("Error fetching student profile stats:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// @desc    Get user overall problem stats
// @route   GET /api/submissions/user-stats
// @access  Protected
export const getUserStats = async (req, res) => {
  try {
    const userId = req.query.userId || req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const statsPipeline = await Submission.aggregate([
      { $match: { userId: userId } },
      {
        $group: {
          _id: "$problemId",
          isSolved: {
            $max: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] }
          }
        }
      },
      {
        $lookup: {
          from: "problems",
          localField: "_id",
          foreignField: "_id",
          as: "problemDetails"
        }
      },
      { $unwind: { path: "$problemDetails", preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: null,
          totalAttempted: { $sum: 1 },
          totalSolved: { $sum: "$isSolved" },
          
          easyAttempted: { $sum: { $cond: [{ $eq: ["$problemDetails.difficulty", "Easy"] }, 1, 0] } },
          easySolved: { $sum: { $cond: [{ $eq: ["$problemDetails.difficulty", "Easy"] }, "$isSolved", 0] } },
          
          mediumAttempted: { $sum: { $cond: [{ $eq: ["$problemDetails.difficulty", "Medium"] }, 1, 0] } },
          mediumSolved: { $sum: { $cond: [{ $eq: ["$problemDetails.difficulty", "Medium"] }, "$isSolved", 0] } },
          
          hardAttempted: { $sum: { $cond: [{ $eq: ["$problemDetails.difficulty", "Hard"] }, 1, 0] } },
          hardSolved: { $sum: { $cond: [{ $eq: ["$problemDetails.difficulty", "Hard"] }, "$isSolved", 0] } }
        }
      }
    ]);

    let totalAttempted = 0;
    let totalSolved = 0;
    let successRate = 0.0;
    let difficultyStats = {
      easy: { solved: 0, attempted: 0, rate: 0 },
      medium: { solved: 0, attempted: 0, rate: 0 },
      hard: { solved: 0, attempted: 0, rate: 0 }
    };

    if (statsPipeline.length > 0) {
      const stats = statsPipeline[0];
      totalAttempted = stats.totalAttempted;
      totalSolved = stats.totalSolved;
      if (totalAttempted > 0) {
        successRate = (totalSolved / totalAttempted) * 100;
      }
      
      difficultyStats.easy.attempted = stats.easyAttempted || 0;
      difficultyStats.easy.solved = stats.easySolved || 0;
      if (difficultyStats.easy.attempted > 0) {
        difficultyStats.easy.rate = (difficultyStats.easy.solved / difficultyStats.easy.attempted) * 100;
      }
      
      difficultyStats.medium.attempted = stats.mediumAttempted || 0;
      difficultyStats.medium.solved = stats.mediumSolved || 0;
      if (difficultyStats.medium.attempted > 0) {
        difficultyStats.medium.rate = (difficultyStats.medium.solved / difficultyStats.medium.attempted) * 100;
      }
      
      difficultyStats.hard.attempted = stats.hardAttempted || 0;
      difficultyStats.hard.solved = stats.hardSolved || 0;
      if (difficultyStats.hard.attempted > 0) {
        difficultyStats.hard.rate = (difficultyStats.hard.solved / difficultyStats.hard.attempted) * 100;
      }
    }

    // Dynamically calculate Codeforces-style windowed solves & streaks + GitHub 365-day heatmap
    const acSubmissions = await Submission.find({ userId: userId, verdict: "Accepted" })
      .select("problemId createdAt")
      .lean();

    const studentStatsDoc = await StudentStats.findOne({ userId: userId });
    // Submission records are the source of truth; cached activity is not added again.
    const { currentStreak, codeforcesStats, heatmap365, activityHistory, firstSolveHistory } = buildSubmissionActivity(acSubmissions);

    let competitiveStats = {
      contestRating: 1000,
      maxRating: 1000,
      ratingTier: "NOVICE",
      points: 0,
      ratingHistory: [],
      currentStreak,
      longestStreak: codeforcesStats.maxStreakAllTime,
      activityHistory
    };

    if (studentStatsDoc) {
      const rating = studentStatsDoc.contestRating || 1000;
      const maxRating = (studentStatsDoc.ratingHistory || []).reduce((maximum, entry) => {
        return Math.max(
          maximum,
          Number.isFinite(entry.oldRating) ? entry.oldRating : rating,
          Number.isFinite(entry.newRating) ? entry.newRating : rating
        );
      }, Math.max(rating, studentStatsDoc.maxRating ?? rating));
      let tier = "NOVICE";
      if (rating >= 2400) tier = "GRANDMASTER";
      else if (rating >= 2100) tier = "MASTER";
      else if (rating >= 1900) tier = "CANDIDATE MASTER";
      else if (rating >= 1600) tier = "EXPERT";
      else if (rating >= 1400) tier = "SPECIALIST";
      else if (rating >= 1200) tier = "APPRENTICE";

      competitiveStats = {
        contestRating: rating,
        maxRating,
        ratingTier: tier,
        points: studentStatsDoc.points || 0,
        ratingHistory: studentStatsDoc.ratingHistory || [],
        currentStreak,
        longestStreak: codeforcesStats.maxStreakAllTime,
        activityHistory
      };
    }

    return res.status(200).json({
      totalAttempted,
      totalSolved: codeforcesStats.solvedAllTime,
      successRate: Number(successRate.toFixed(1)),
      difficultyStats,
      codeforcesStats,
      heatmap365,
      firstSolveHistory,
      ...competitiveStats
    });
  } catch (error) {
    console.error("Error in getUserStats:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

// @desc    Get recent submissions for the active user
// @route   GET /api/submissions/recent
// @access  Protected
export const getRecentSubmissions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch last 50 submissions, newest first
    const submissions = await Submission.find({ userId: userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('problemId', 'title difficulty status'); // Include availability for retry links.
      
    return res.status(200).json(submissions);
  } catch (error) {
    console.error("Error fetching recent submissions:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
};
