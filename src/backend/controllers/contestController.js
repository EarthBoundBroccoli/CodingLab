import axios from "axios";
import { Contest } from "../models/Contest.js";
import { Problem } from "../models/Problem.js";
import { User } from "../models/User.js";
import { Submission } from "../models/Submission.js";
import { StudentStats } from "../models/StudentStats.js";
import { getJDoodleConfig } from "../lib/jdoodle.js";

// Helper to auto-update contest status in DB if it changes
const autoUpdateContestStatus = async (contest) => {
    const now = new Date();
    if (contest.status === 'Ended') return contest;

    let newStatus = contest.status;
    if (now < contest.startTime) {
        newStatus = 'Upcoming';
    } else if (now >= contest.startTime && now <= contest.endTime) {
        newStatus = 'Ongoing';
    } else {
        newStatus = 'Ended';
    }

    if (contest.status !== newStatus) {
        contest.status = newStatus;
        await contest.save();
    }
    return contest;
};

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

// C++ code wrapper
const wrapCpp = (studentCode) => {
  const usesArgc = /\bmain\s*\(\s*int\b/.test(studentCode);
  const dummyDefinition = usesArgc 
    ? "int user_main() { return 0; }" 
    : "int user_main(int argc, char** argv) { return 0; }";

  return `
#include <iostream>
#include <string>
#include <sstream>
#include <vector>

// Dummy for the signature NOT used by the student
${dummyDefinition}

#define main user_main
${studentCode}
#undef main

int main() {
    std::string all_input;
    std::string line;
    while (std::getline(std::cin, line)) {
        all_input += line + "\\n";
    }
    
    std::vector<std::string> inputs;
    std::string delimiter = "///";
    size_t pos = 0;
    while ((pos = all_input.find(delimiter)) != std::string::npos) {
        inputs.push_back(all_input.substr(0, pos));
        all_input.erase(0, pos + delimiter.length());
    }
    inputs.push_back(all_input);
    
    std::streambuf* orig_cin = std::cin.rdbuf();
    
    for (size_t i = 0; i < inputs.size(); ++i) {
        if (i > 0) {
            std::cout << "///\\n";
        }
        
        std::istringstream iss(inputs[i]);
        std::cin.rdbuf(iss.rdbuf());
        
        // Execute student code
        user_main();
        user_main(0, nullptr);
        
        std::cin.clear();
    }
    
    std::cin.rdbuf(orig_cin);
    return 0;
}
`;
};

// Python code wrapper
const wrapPython = (studentCode) => {
  return `
import sys
import io

student_raw_code = ${JSON.stringify(studentCode)}

# Intercept the massive batched stream string
full_input = sys.stdin.read()
test_cases = full_input.split('///')

original_stdout = sys.stdout
original_stdin = sys.stdin

for i, case in enumerate(test_cases):
    if i > 0:
        original_stdout.write('///\\n')
        original_stdout.flush()
    
    # Reset virtual streams for this specific test block
    sys.stdin = io.StringIO(case.strip())
    captured_output = io.StringIO()
    sys.stdout = captured_output
    
    try:
        # Run code globally with __name__ properly initialized to "__main__"
        exec(student_raw_code, {"__name__": "__main__", "__builtins__": __builtins__})
    except SystemExit:
        pass
    except Exception as e:
        captured_output.write(str(e) + '\\n')
        
    sys.stdout = original_stdout
    original_stdout.write(captured_output.getvalue())
    original_stdout.flush()
`;
};

// Java code wrapper
const wrapJava = (studentCode) => {
  const classMatch = studentCode.match(/(?:public\s+)?class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : "Main";
  
  let modifiedStudentCode = studentCode;
  if (classMatch) {
    modifiedStudentCode = modifiedStudentCode.replace(/public\s+class\s+/, "class ");
  }
  
  modifiedStudentCode = modifiedStudentCode.replace(/public\s+static\s+void\s+main\s*\(/, "public static void studentMain(");
  
  return `
import java.io.*;
import java.util.*;

${modifiedStudentCode}

public class JDoodleWrapper {
    public static void main(String[] args) throws Exception {
        BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line).append("\\n");
        }
        String[] inputs = sb.toString().split("///", -1);
        
        InputStream origIn = System.in;
        PrintStream origOut = System.out;
        
        for (int i = 0; i < inputs.length; i++) {
            if (i > 0) {
                origOut.println("///");
            }
            
            System.setIn(new ByteArrayInputStream(inputs[i].getBytes()));
            
            try {
                ${className}.studentMain(new String[0]);
            } catch (Throwable t) {
                t.printStackTrace(origOut);
            }
        }
        System.setIn(origIn);
    }
}
`;
};

// @desc    Get all contests (sorted by startTime desc)
// @route   GET /api/contests
// @access  Public
export const getAllContests = async (req, res) => {
    try {
        const contests = await Contest.find({}).sort({ startTime: -1 });
        // Auto-update status for each contest
        for (const contest of contests) {
            await autoUpdateContestStatus(contest);
        }
        res.json(contests);
    } catch (error) {
        console.error("Error getting contests:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Get single contest with populated problems
// @route   GET /api/contests/:id
// @access  Public
export const getContestById = async (req, res) => {
    try {
        let contest = await Contest.findById(req.params.id).populate("problems");
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        await autoUpdateContestStatus(contest);
        res.json(contest);
    } catch (error) {
        console.error("Error getting contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Create new contest (admin only)
// @route   POST /api/contests
// @access  Protected (Admin Only)
export const createContest = async (req, res) => {
    try {
        const { name, description, startTime, endTime, problems } = req.body;
        if (!name || !startTime || !endTime) {
            return res.status(400).json({ message: "Name, startTime, and endTime are required" });
        }
        
        const start = new Date(startTime);
        const end = new Date(endTime);
        if (end <= start) {
            return res.status(400).json({ message: "endTime must be after startTime" });
        }

        const newContest = new Contest({
            name,
            description,
            startTime: start,
            endTime: end,
            problems: problems || [],
            createdBy: req.user.id,
            status: 'Upcoming'
        });

        await newContest.save();
        res.status(201).json(newContest);
    } catch (error) {
        console.error("Error creating contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Update contest (admin only)
// @route   PUT /api/contests/:id
// @access  Protected (Admin Only)
export const updateContest = async (req, res) => {
    try {
        const { name, description, startTime, endTime, problems, status } = req.body;
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }

        if (name !== undefined) contest.name = name;
        if (description !== undefined) contest.description = description;
        if (startTime !== undefined) contest.startTime = new Date(startTime);
        if (endTime !== undefined) contest.endTime = new Date(endTime);
        if (problems !== undefined) contest.problems = problems;
        if (status !== undefined) {
            if (!['Upcoming', 'Ongoing', 'Ended'].includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }
            contest.status = status;
        }

        if (contest.endTime <= contest.startTime) {
            return res.status(400).json({ message: "endTime must be after startTime" });
        }

        await contest.save();
        res.json(contest);
    } catch (error) {
        console.error("Error updating contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Delete contest (admin only)
// @route   DELETE /api/contests/:id
// @access  Protected (Admin Only)
export const deleteContest = async (req, res) => {
    try {
        const contest = await Contest.findByIdAndDelete(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        res.json({ message: "Contest deleted successfully" });
    } catch (error) {
        console.error("Error deleting contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Manually end contest (admin only)
// @route   PUT /api/contests/:id/end
// @access  Protected (Admin Only)
export const endContest = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        contest.status = 'Ended';
        contest.endTime = new Date();
        await contest.save();
        res.json({ message: "Contest ended successfully", contest });
    } catch (error) {
        console.error("Error ending contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Get contest leaderboard
// @route   GET /api/contests/:id/leaderboard
// @access  Public
export const getLeaderboard = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id).populate("participants.userId", "name email");
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        // Sort participants: score DESC, penalty ASC
        const leaderboard = [...contest.participants].sort((a, b) => {
            if (b.score !== a.score) {
                return b.score - a.score;
            }
            return a.penalty - b.penalty;
        });
        res.json(leaderboard);
    } catch (error) {
        console.error("Error getting contest leaderboard:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Alias for route file compatibility
export const getContestLeaderboard = getLeaderboard;

// @desc    Register for contest (student only)
// @route   POST /api/contests/:id/register
// @access  Protected (Student Only)
export const registerForContest = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        if (contest.status === 'Ended') {
            return res.status(400).json({ message: "Cannot register for an ended contest" });
        }

        const userId = req.user.id;
        const isRegistered = contest.participants.some(p => p.userId.toString() === userId.toString());
        if (isRegistered) {
            return res.status(400).json({ message: "You are already registered for this contest" });
        }

        contest.participants.push({
            userId,
            score: 0,
            penalty: 0,
            solved: []
        });

        await contest.save();
        res.json({ message: "Registered successfully", contest });
    } catch (error) {
        console.error("Error registering for contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Submit solution inside contest (student only)
// @route   POST /api/contests/:id/submit
// @access  Protected (Student Only)
export const submitToContest = async (req, res) => {
    try {
        const userId = req.user.id;
        const contestId = req.params.id;
        const { problemId, code, language } = req.body;

        if (!problemId || !code || !language) {
            return res.status(400).json({ message: "problemId, code, and language are required fields." });
        }

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found." });
        }

        // Auto-update status first
        await autoUpdateContestStatus(contest);

        if (contest.status !== 'Ongoing') {
            return res.status(400).json({ message: "Contest is not Ongoing." });
        }

        // Verify registration
        const participantIndex = contest.participants.findIndex(p => p.userId.toString() === userId.toString());
        if (participantIndex === -1) {
            return res.status(400).json({ message: "You must register for this contest before submitting solutions." });
        }

        // Verify problem is part of the contest
        const isContestProblem = contest.problems.some(pId => pId.toString() === problemId.toString());
        if (!isContestProblem) {
            return res.status(400).json({ message: "This problem is not part of this contest." });
        }

        // 1. Fetch targeted problem document
        const problem = await Problem.findById(problemId);
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

        const combinedInput = inputsArray.join('\n///\n');

        // Wrap the code according to language
        let wrappedCode = code;
        if (language === 'cpp') {
            wrappedCode = wrapCpp(code);
        } else if (language === 'python') {
            wrappedCode = wrapPython(code);
        } else if (language === 'java') {
            wrappedCode = wrapJava(code);
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

        console.log(`Sending batch execution request to JDoodle for contest problem: "${problem.title}" [${language}]...`);
        const response = await axios.post("https://api.jdoodle.com/v1/execute", payload);

        const jdoodleOutput = response.data.output || "";
        const statusCode = response.data.statusCode;
        const cpuTime = response.data.cpuTime;
        const memory = response.data.memory;

        const cpuTimeMs = parseFloat(cpuTime) * 1000;
        
        let evaluationVerdict = '';
        if (cpuTimeMs > timeLimit) {
            evaluationVerdict = 'TLE';
        } else {
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

        let dbVerdict = 'Wrong Answer';
        if (evaluationVerdict === 'AC') {
            dbVerdict = 'Accepted';
        } else if (evaluationVerdict === 'TLE') {
            dbVerdict = 'Time Limit Exceeded';
        } else {
            if (statusCode !== 0 && statusCode !== 200) {
                dbVerdict = 'Compilation Error';
            } else {
                dbVerdict = 'Wrong Answer';
            }
        }

        // 3. Update Contest Participant Stats if first AC
        const participant = contest.participants[participantIndex];
        const alreadySolvedInContest = participant.solved.some(id => id.toString() === problemId.toString());

        if (evaluationVerdict === 'AC' && !alreadySolvedInContest) {
            // Calculate penalty: elapsed time in minutes from contest start
            const elapsedMinutes = Math.round((new Date() - contest.startTime) / 60000);
            
            // Count previous wrong attempts for this problem in this contest
            const wrongAttempts = await Submission.countDocuments({
                userId,
                problemId,
                contestId,
                verdict: { $ne: 'Accepted' }
            });

            const penaltyForProblem = elapsedMinutes + (wrongAttempts * 20);

            participant.solved.push(problemId);
            participant.score += 100; // 100 points per problem
            participant.penalty += penaltyForProblem;

            await contest.save();
        }

        // 4. Update Student Stats generally
        let stats = await StudentStats.findOne({ userId });
        if (!stats) {
            stats = new StudentStats({ userId });
        }

        const todayStr = new Date().toISOString().split('T')[0];

        if (evaluationVerdict === 'AC') {
            const alreadySolvedGlobal = stats.solvedProblems.some(id => id.toString() === problemId.toString());
            if (!alreadySolvedGlobal) {
                stats.solvedProblems.push(problemId);
                const diffKey = problem.difficulty.toLowerCase();
                if (stats.difficultyBreakdown[diffKey] !== undefined) {
                    stats.difficultyBreakdown[diffKey] += 1;
                }
                if (diffKey === 'easy') stats.points += 10;
                else if (diffKey === 'medium') stats.points += 30;
                else if (diffKey === 'hard') stats.points += 50;
            }
            stats.attemptedProblems = stats.attemptedProblems.filter(id => id.toString() !== problemId.toString());
            stats.lastActiveDate = todayStr;
        } else {
            const alreadySolvedGlobal = stats.solvedProblems.some(id => id.toString() === problemId.toString());
            const alreadyAttemptedGlobal = stats.attemptedProblems.some(id => id.toString() === problemId.toString());
            if (!alreadySolvedGlobal && !alreadyAttemptedGlobal) {
                stats.attemptedProblems.push(problemId);
            }
        }
        stats.totalSubmissionsCount = (stats.totalSubmissionsCount || 0) + 1;
        await stats.save();

        // 5. Save Submission Document
        const newSubmission = new Submission({
            problemId,
            userId,
            contestId,
            code,
            language,
            verdict: dbVerdict,
            timeTaken: Math.round(cpuTimeMs) || 0,
            memoryUsed: memory || 0,
            compileOutput: dbVerdict === 'Compilation Error' ? jdoodleOutput : ""
        });
        await newSubmission.save();

        return res.status(200).json({
            message: "Contest submission evaluated successfully",
            verdict: dbVerdict,
            evaluationVerdict,
            timeTaken: Math.round(cpuTimeMs) || 0,
            memoryUsed: memory || 0,
            compileOutput: dbVerdict === 'Compilation Error' ? jdoodleOutput : ""
        });
    } catch (error) {
        console.error("Contest submission evaluation error:", error);
        return res.status(500).json({
            message: "An internal error occurred during submission processing.",
            error: error.message
        });
    }
};

// Alias for route file compatibility
export const submitContestSolution = submitToContest;
