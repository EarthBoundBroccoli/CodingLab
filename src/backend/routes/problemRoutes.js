import express from "express";
import { addProblem, getApprovedProblems, getProblemById, getDailyChallenge } from "../controllers/problemController.js";

const router = express.Router();

router.post("/add", addProblem);
router.get("/", getApprovedProblems);
router.get("/daily", getDailyChallenge);
router.get("/:id", getProblemById);

export default router;
