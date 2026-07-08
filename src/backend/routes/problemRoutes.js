import express from "express";
import { addProblem, getApprovedProblems, getProblemById } from "../controllers/problemController.js";

const router = express.Router();

router.post("/add", addProblem);
router.get("/", getApprovedProblems);
router.get("/:id", getProblemById);

export default router;
