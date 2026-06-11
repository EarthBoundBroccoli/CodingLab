import express from "express";
import { addProblem } from "../controllers/problemController.js";

const router = express.Router();

router.post("/add", addProblem);

export default router;
