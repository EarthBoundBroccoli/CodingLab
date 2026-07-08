import express from "express";
import { addProblem, getApprovedProblems } from "../controllers/problemController.js";

const router = express.Router();

router.post("/add", addProblem);
router.get("/", getApprovedProblems);

export default router;
