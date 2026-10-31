import { judgeSubmission, JudgingConfigurationError } from "../services/judgingService.js";
import mongoose from "mongoose";
import { Contest } from "../models/Contest.js";
import { Problem } from "../models/Problem.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { Submission } from "../models/Submission.js";
import { StudentStats } from "../models/StudentStats.js";
import { processRatingsForContest } from "../utils/contestRatings.js";
import { rankContestParticipants } from "../utils/contestStandings.js";
import { userIdentityFilter, getUserAuthId } from "../utils/userIdentity.js";
import { PUBLIC_PROBLEM_FIELDS } from "../utils/publicProblem.js";
import { validateContestSchedule } from "../utils/contestSchedule.js";
import { withSubmissionTransaction } from "../utils/submissionPersistence.js";

const validateContestProblems = async problems => {
    if (!Array.isArray(problems) || problems.length === 0) {
        return "Contest must have at least 1 problem selected";
    }
    if (problems.some(id => typeof id !== 'string' || !mongoose.isObjectIdOrHexString(id))) {
        return "Every contest problem must have a valid problem ID";
    }
    if (new Set(problems.map(id => id.toLowerCase())).size !== problems.length) {
        return "Select each contest problem only once";
    }
    const approvedCount = await Problem.countDocuments({ _id: { $in: problems }, status: 'approved' });
    if (approvedCount !== problems.length) {
        return "Every selected problem must exist and be approved. Refresh the problem list and try again.";
    }
    return null;
};

// Helper to auto-update contest status in DB if it changes
const autoUpdateContestStatus = async (contest) => {
    const now = new Date();
    
    if (contest.status === 'Ended') {
        if (!contest.ratingsCalculated) {
            await processRatingsForContest(contest);
        }
        return contest;
    }

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
        if (newStatus === 'Ended') {
            await processRatingsForContest(contest);
        }
    }
    return contest;
};

// Helper to safely attach creator and participant user info without Mongoose CastError on String IDs
const populateContestUsers = async (contestDoc) => {
    if (!contestDoc) return contestDoc;
    const contestObj = contestDoc.toObject ? contestDoc.toObject() : { ...contestDoc };
    
    // Safely populate createdBy
    if (contestObj.createdBy && typeof contestObj.createdBy === 'string') {
        try {
            const user = await User.findOne(userIdentityFilter(contestObj.createdBy)).select("name id");
            if (user) {
                contestObj.createdBy = user;
            }
        } catch (e) {
            // Ignore invalid ID lookups
        }
    }
    
    // Safely populate participants.userId
    if (Array.isArray(contestObj.participants)) {
        contestObj.participants = await Promise.all(
            contestObj.participants.map(async (p) => {
                if (p && p.userId && typeof p.userId === 'string') {
                    try {
                        const user = await User.findOne(userIdentityFilter(p.userId)).select("name id");
                        if (user) {
                            p.userId = user;
                        }
                    } catch (e) {
                        // Ignore invalid ID lookups
                    }
                }
                return p;
            })
        );
    }
    
    return contestObj;
};

// @desc    Get all contests (sorted by startTime desc)
// @route   GET /api/contests
// @access  Public
export const getAllContests = async (req, res) => {
    try {
        const contests = await Contest.find({}).sort({ startTime: -1 });
        const populatedContests = await Promise.all(
            contests.map(async (contest) => {
                await autoUpdateContestStatus(contest);
                return await populateContestUsers(contest);
            })
        );
        res.json(populatedContests);
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
        let contest = await Contest.findById(req.params.id)
            .populate({ path: "problems", match: { status: "approved" }, select: PUBLIC_PROBLEM_FIELDS });
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        await autoUpdateContestStatus(contest);
        const populatedContest = await populateContestUsers(contest);
        // Hide problems if status is 'Upcoming' so problems are not visible before contest starts
        if (populatedContest.status === 'Upcoming') {
            populatedContest.problems = [];
        }
        res.json(populatedContest);
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
        
        const { start, end, error: scheduleError } = validateContestSchedule(startTime, endTime);
        if (scheduleError) return res.status(400).json({ message: scheduleError });

        const problemError = await validateContestProblems(problems);
        if (problemError) return res.status(400).json({ message: problemError });

        const newContest = new Contest({
            name,
            description,
            startTime: start,
            endTime: end,
            problems,
            createdBy: req.user.id,
            status: 'Upcoming'
        });

        // Publish the contest and its inbox announcements together. A failed
        // notification write must not silently leave an unannounced contest.
        await Contest.db.transaction(async session => {
                await newContest.save({ session });
                const users = await User.find({ banned: { $ne: true }, disabledAt: null }).session(session);
                const recipientIds = [...new Set(users.map(getUserAuthId))];
                const notifications = recipientIds.map(userId => ({
                    userId,
                    title: "New Contest Created",
                    message: `A new contest "${newContest.name}" has been created!`,
                    type: "contest",
                    contestId: newContest._id,
                    isRead: false
                }));

                if (notifications.length > 0) {
                    await Notification.insertMany(notifications, { session });
                }
        });

        res.status(201).json(newContest);
    } catch (error) {
        console.error("Error creating contest:", error.message, error.stack);
        res.status(500).json({ message: "Internal server error", error: error.message });
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
        if (contest.ratingsCalculated) {
            return res.status(409).json({ message: "A rated contest is finalized and cannot be edited." });
        }

        const { start, end, error: scheduleError } = validateContestSchedule(
            startTime !== undefined ? startTime : contest.startTime,
            endTime !== undefined ? endTime : contest.endTime
        );
        if (scheduleError) return res.status(400).json({ message: scheduleError });

        const selectedProblems = problems !== undefined ? problems : contest.problems.map(id => id.toString());
        const problemError = await validateContestProblems(selectedProblems);
        if (problemError) return res.status(400).json({ message: problemError });

        if (name !== undefined) contest.name = name;
        if (description !== undefined) contest.description = description;
        if (startTime !== undefined) contest.startTime = start;
        if (endTime !== undefined) contest.endTime = end;
        if (problems !== undefined) {
            contest.problems = problems;
        }
        if (status !== undefined) {
            if (!['Upcoming', 'Ongoing', 'Ended'].includes(status)) {
                return res.status(400).json({ message: "Invalid status value" });
            }
            contest.status = status;
        }

        // Do not overwrite a rating finalization committed since this read.
        contest.$where = { ratingsCalculated: { $ne: true } };
        await contest.save();
        res.json(contest);
    } catch (error) {
        if (error.name === 'DocumentNotFoundError') return res.status(409).json({ message: "Contest changed. Refresh before editing." });
        console.error("Error updating contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Delete contest (admin only)
// @route   DELETE /api/contests/:id
// @access  Protected (Admin Only)
export const deleteContest = async (req, res) => {
    try {
        const contest = await Contest.findOneAndDelete({ _id: req.params.id, ratingsCalculated: { $ne: true } });
        if (!contest) {
            if (await Contest.exists({ _id: req.params.id })) {
                return res.status(409).json({ message: "A rated contest cannot be deleted because leaderboards depend on its results." });
            }
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
        if (contest.status === 'Ended' || contest.ratingsCalculated) {
            await autoUpdateContestStatus(contest);
            return res.json({ message: "Contest already ended", contest });
        }
        contest.status = 'Ended';
        contest.endTime = new Date();
        contest.$where = { ratingsCalculated: { $ne: true } };
        await contest.save();
        await processRatingsForContest(contest);
        res.json({ message: "Contest ended successfully", contest });
    } catch (error) {
        if (error.name === 'DocumentNotFoundError') return res.status(409).json({ message: "Contest changed. Refresh before ending it." });
        console.error("Error ending contest:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Get contest leaderboard
// @route   GET /api/contests/:id/leaderboard
// @access  Public
export const getLeaderboard = async (req, res) => {
    try {
        const contest = await Contest.findById(req.params.id);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found" });
        }
        await autoUpdateContestStatus(contest);
        const populatedContest = await populateContestUsers(contest);
        // Sort participants: score DESC, penalty ASC
        const leaderboard = rankContestParticipants(populatedContest.participants || []);
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
        const id = req.params.id;
        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(404).json({ message: "Contest not found" });
        }
        const userId = req.user.id;
        // MongoDB evaluates the deadline and membership in the same atomic write.
        // Use database time so a request waiting on a write cannot register late.
        const contest = await Contest.findOneAndUpdate({
            _id: id,
            status: { $in: ['Upcoming', 'Ongoing'] },
            $expr: { $gt: ['$endTime', '$$NOW'] },
            'participants.userId': { $ne: userId },
        }, {
            $push: { participants: { userId, score: 0, penalty: 0, solved: [] } },
        }, { new: true, runValidators: true });
        if (contest) return res.json({ message: "Registered successfully", contest });

        // A failed match is read only to explain the result; never write from it.
        const current = await Contest.findById(id);
        if (!current) {
            return res.status(404).json({ message: "Contest not found" });
        }
        if (current.status === 'Ended' || new Date(current.endTime) <= new Date()) {
            return res.status(400).json({ message: "Cannot register for an ended contest" });
        }
        const isRegistered = current.participants.some(p => p.userId.toString() === userId.toString());
        if (isRegistered) {
            return res.status(400).json({ message: "You are already registered for this contest" });
        }

        return res.status(409).json({ message: "Contest registration is unavailable. Please refresh and try again." });
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

        if (!mongoose.isObjectIdOrHexString(problemId)) {
            return res.status(404).json({ message: "Problem not found." });
        }
        if (!mongoose.isObjectIdOrHexString(contestId)) {
            return res.status(404).json({ message: "Contest not found." });
        }

        const contest = await Contest.findById(contestId);
        if (!contest) {
            return res.status(404).json({ message: "Contest not found." });
        }

        // Reject unavailable problems before status updates, judging, or scoring.
        const problem = await Problem.findOne({ _id: problemId, status: "approved" });
        if (!problem) {
            return res.status(404).json({ message: "Problem not found." });
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

        const { dbVerdict, evaluationVerdict, timeTaken, memoryUsed, compileOutput } =
            await judgeSubmission({ problem, code, language });

        const participant = await withSubmissionTransaction(async session => {
            // Read fresh scores inside the transaction so concurrent submissions
            // cannot overwrite each other's score, penalty, or solved problems.
            const currentContest = await Contest.findById(contestId).session(session);
            if (!currentContest || currentContest.status !== 'Ongoing' || new Date() > currentContest.endTime) {
                const error = new Error('Contest is no longer ongoing. This result was not saved.');
                error.statusCode = 409;
                throw error;
            }
            // 3. Update Contest Participant Stats if not yet solved
            const participant = currentContest.participants.find(p => p.userId.toString() === userId.toString());
            if (!participant || !currentContest.problems.some(id => id.toString() === problemId.toString())) {
                const error = new Error("Contest registration or problem selection changed. Please refresh.");
                error.statusCode = 409;
                throw error;
            }
            const alreadySolvedInContest = participant.solved.some(id => id.toString() === problemId.toString());

            if (!alreadySolvedInContest) {
                if (evaluationVerdict === 'AC') {
                    const elapsedMinutes = Math.round((new Date() - currentContest.startTime) / 60000);
                    participant.solved.push(problemId);
                    participant.score += 100; // 100 points per problem
                    participant.penalty += elapsedMinutes;
                    await currentContest.save({ session });
                } else {
                    // Wrong Answer / non-AC attempt adds 20 minutes penalty immediately
                    participant.penalty += 20;
                    await currentContest.save({ session });
                }
            }

            // 4. Update Student Stats generally
            let stats = await StudentStats.findOne({ userId }).session(session);
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
            await stats.save({ session });

            // 5. Save Submission Document
            const newSubmission = new Submission({
                problemId,
                userId,
                contestId,
                code,
                language,
                verdict: dbVerdict,
                timeTaken,
                memoryUsed,
                compileOutput
        });
        await newSubmission.save({ session });

        return { score: participant.score, penalty: participant.penalty };
        });

        return res.status(200).json({
            message: "Contest submission evaluated successfully",
            verdict: dbVerdict,
            evaluationVerdict,
            timeTaken,
            memoryUsed,
            compileOutput,
            score: participant.score,
            penalty: participant.penalty
        });
    } catch (error) {
        if (error instanceof JudgingConfigurationError) {
            return res.status(error.statusCode).json({ message: error.message });
        }
        if (['ECONNABORTED', 'ETIMEDOUT'].includes(error.code)) {
            return res.status(504).json({ message: 'The judging service or test-data download timed out. This attempt was not scored. Please try again.' });
        }
        console.error("Contest submission evaluation error:", error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "An internal error occurred during submission processing.",
            error: error.message
        });
    }
};

// Alias for route file compatibility
export const submitContestSolution = submitToContest;

// @desc    Calculate and update ELO ratings for all participants after contest ends
// @route   POST /api/contests/:id/calculate-ratings
// @access  Protected (Admin / Problem Setter)
export const calculateContestRatingsForContest = async (req, res) => {
    try {
        const contestId = req.params.id;
        let contest = await Contest.findById(contestId);

        if (!contest) {
            return res.status(404).json({ message: "Contest not found." });
        }

        if (contest.status !== 'Ended' && new Date() <= new Date(contest.endTime)) {
            return res.status(400).json({ message: "Ratings can only be calculated after the contest ends." });
        }

        const alreadyCalculated = contest.ratingsCalculated;
        contest = await autoUpdateContestStatus(contest);

        if (!contest.participants || contest.participants.length === 0) {
            return res.status(400).json({ message: "No participants registered in this contest." });
        }


        return res.status(200).json({
            message: alreadyCalculated
                ? "Ratings were already calculated. Returning saved results."
                : `Successfully calculated and updated ELO ratings for ${contest.participants.length} participants!`,
            contestId: contest._id,
            contestName: contest.name,
            participants: contest.participants,
            ratingsCalculated: contest.ratingsCalculated
        });
    } catch (error) {
        console.error("Error calculating contest ratings:", error);
        return res.status(500).json({ message: "Failed to calculate contest ratings.", error: error.message });
    }
};
