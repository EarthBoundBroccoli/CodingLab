import express from "express";
import { runCodeExecution } from "../controllers/executionController.js";
import { submitProblemSolution, getStudentProfileStats, getUserStats, getRecentSubmissions } from "../controllers/submissionController.js";
import { auth } from "../lib/auth.js";
import { Submission } from "../models/Submission.js";
import { Problem } from "../models/Problem.js";
import { StudentStats } from "../models/StudentStats.js";

const router = express.Router();

const protect = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        req.user = session.user;
        next();
    } catch (error) {
        return res.status(500).json({ message: "Authentication error" });
    }
};

router.post("/run", runCodeExecution);
router.post("/submit", submitProblemSolution);
router.get("/profile-stats", getStudentProfileStats);
router.get("/user-stats", protect, getUserStats);
router.get("/recent", protect, getRecentSubmissions);

router.get("/seed-active-user", protect, async (req, res) => {
    try {
        const problems = await Problem.find().limit(3);
        if (problems.length < 3) {
            return res.status(400).json({ message: "Please ensure at least 3 problems exist in the database first." });
        }

        // Wipe previous submissions for a clean slate
        await Submission.deleteMany({ userId: req.user.id });

        const p1 = problems[0]._id;
        const p2 = problems[1]._id;
        const p3 = problems[2]._id;

        await Submission.create([
            { userId: req.user.id, problemId: p1, verdict: 'Wrong Answer', code: '// seed WA', language: 'cpp' },
            { userId: req.user.id, problemId: p1, verdict: 'Wrong Answer', code: '// seed WA', language: 'cpp' },
            { userId: req.user.id, problemId: p1, verdict: 'Accepted', code: '// seed AC', language: 'cpp' },
            
            { userId: req.user.id, problemId: p2, verdict: 'Accepted', code: '// seed AC', language: 'cpp' },

            { userId: req.user.id, problemId: p3, verdict: 'Wrong Answer', code: '// seed WA', language: 'cpp' }
        ]);

        // Seed the user's competitive profile stats too
        let stats = await StudentStats.findOne({ userId: req.user.id });
        if (!stats) {
            stats = new StudentStats({ userId: req.user.id });
        }
        
        stats.contestRating = 1040;
        stats.ratingTier = "NOVICE";
        stats.points = 40;
        stats.ratingHistory = [
            { contestName: "Weekly Mock #1", ratingChange: "+40", newRating: 1040 }
        ];
        await stats.save();

        return res.json({ 
            message: "Seed successful with real problems and competitive stats!",
            statsShouldBe: { attempted: 3, solved: 2, successRate: "66.7%" },
            competitiveStats: { rating: 1040, tier: "NOVICE", points: 40 }
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

export default router;
