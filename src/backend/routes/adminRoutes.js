import express from "express";
import { 
    getPendingSetterRequests, 
    decideSetterRequest,
    getDashboardSummary,
    updateProblemStatus,
    getAllUsers
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/setter-requests", getPendingSetterRequests);
router.put("/setter-requests/:id/decide", decideSetterRequest);
router.get("/dashboard-summary", getDashboardSummary);
router.put("/problems/:id/status", updateProblemStatus);
router.get("/users", getAllUsers);

export default router;
