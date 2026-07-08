import express from "express";
import { runCodeExecution } from "../controllers/executionController.js";

const router = express.Router();

router.post("/run", runCodeExecution);

export default router;
