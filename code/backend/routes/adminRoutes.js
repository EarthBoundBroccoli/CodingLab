import { requireAdmin } from "../middleware/auth.js";
import express from "express";
import { getSupportRequests, updateSupportStatus } from "../controllers/supportController.js";
import { 
    getPendingSetterRequests, 
    decideSetterRequest,
    getDashboardSummary,
    updateProblemStatus,
    getAllUsers,
    getProblemRequests,
    updateUserAccess
} from "../controllers/adminController.js";

const router = express.Router();

router.use(requireAdmin);
router.get("/session", (req, res) => {
    const { id, name, email, role } = req.user;
    res.set("Cache-Control", "no-store");
    res.json({ user: { id, name, email, role } });
});

router.get("/setter-requests", getPendingSetterRequests);
router.put("/setter-requests/:id/decide", decideSetterRequest);
router.get("/dashboard-summary", getDashboardSummary);
router.get("/problems", getProblemRequests);
router.put("/problems/:id/status", updateProblemStatus);
router.get("/users", getAllUsers);
router.patch("/users/:id/access", updateUserAccess);
router.get("/support-requests", getSupportRequests);
router.patch("/support-requests/:id/status", updateSupportStatus);

export default router;
