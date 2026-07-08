import express from "express";
import { runCodeExecution } from "../controllers/executionController.js";
import { submitProblemSolution, getStudentProfileStats } from "../controllers/submissionController.js";

const router = express.Router();

router.post("/run", runCodeExecution);
router.post("/submit", submitProblemSolution);
router.get("/profile-stats", getStudentProfileStats);

export default router;
