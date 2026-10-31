import express from "express";
import { getGlobalUniversities, getCampusLeaderboard, getMyLeaderboardStats } from "../controllers/leaderboardController.js";
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

router.get("/universities", getGlobalUniversities);
router.get("/university/:universityId", getCampusLeaderboard);
router.get("/me", protect, getMyLeaderboardStats);

export default router;
