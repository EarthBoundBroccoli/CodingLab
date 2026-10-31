import express from "express";
import {
    getAllContests,
    getContestById,
    createContest,
    updateContest,
    deleteContest,
    endContest,
    getLeaderboard,
    registerForContest,
    submitToContest,
    calculateContestRatingsForContest
} from "../controllers/contestController.js";
import { requireAdmin, requireAdminOrSetter, requireStudent } from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", getAllContests);
router.get("/:id", getContestById);
router.get("/:id/leaderboard", getLeaderboard);

// Admin / Rating Calculation routes
router.post("/", requireAdmin, createContest);
router.put("/:id", requireAdmin, updateContest);
router.delete("/:id", requireAdmin, deleteContest);
router.put("/:id/end", requireAdmin, endContest);
router.post("/:id/calculate-ratings", requireAdminOrSetter, calculateContestRatingsForContest);

// Student-only routes
router.post("/:id/register", requireStudent, registerForContest);
router.post("/:id/submit", requireStudent, submitToContest);

export default router;
