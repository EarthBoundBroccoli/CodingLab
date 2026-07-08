import express from "express";
import { getPendingSetterRequests, decideSetterRequest } from "../controllers/adminController.js";

const router = express.Router();

router.get("/setter-requests", getPendingSetterRequests);
router.put("/setter-requests/:id/decide", decideSetterRequest);

export default router;
