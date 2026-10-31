import express from "express";
import { getSetterStatus, applyForSetter } from "../controllers/setterController.js";

const router = express.Router();

router.get("/status", getSetterStatus);
router.post("/apply", applyForSetter);

export default router;
