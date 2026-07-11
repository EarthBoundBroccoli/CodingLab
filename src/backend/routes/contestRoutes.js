import express from "express";
import {
    getAllContests,
    getContestById,
    createContest,
    updateContest,
    deleteContest,
    endContest,
    getContestLeaderboard,
    registerForContest,
    submitContestSolution
} from "../controllers/contestController.js";
import { requireAdmin, requireStudent } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllContests);
router.get("/:id", getContestById);
router.get("/:id/leaderboard", getContestLeaderboard);

// Admin-only routes
router.post("/", requireAdmin, createContest);
router.put("/:id", requireAdmin, updateContest);
router.delete("/:id", requireAdmin, deleteContest);
router.put("/:id/end", requireAdmin, endContest);

// Student-only routes
router.post("/:id/register", requireStudent, registerForContest);
router.post("/:id/submit", requireStudent, submitContestSolution);

export default router;
