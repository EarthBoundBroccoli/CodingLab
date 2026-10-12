import express from "express";
import { runCodeExecution } from "../controllers/executionController.js";
import { submitProblemSolution, getStudentProfileStats, getUserStats, getRecentSubmissions } from "../controllers/submissionController.js";
import { auth } from "../lib/auth.js";

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

export default router;
