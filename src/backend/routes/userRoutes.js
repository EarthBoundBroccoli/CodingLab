import express from "express";
import { getUserSettings, updateUserSettings, getUniversities, getPublicUserProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.get("/settings", requireAuth, getUserSettings);
router.patch("/settings", requireAuth, updateUserSettings);
router.get("/universities", getUniversities);
router.get("/profile/:userId", getPublicUserProfile);

export default router;
