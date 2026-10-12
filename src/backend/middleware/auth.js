import mongoose from "mongoose";
import { auth } from "../lib/auth.js";
import { User } from "../models/User.js";
import { accountBlocked } from "../utils/accountAccess.js";

// Ensure user is authenticated
export const requireAuth = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        req.session = session;
        req.user = session.user;
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Require a real authenticated admin or problem setter session.
export const requireAdminOrSetter = async (req, res, next) => {
    return requireAuth(req, res, () => {
        if (!['admin', 'problem_setter'].includes(req.user.role)) {
            return res.status(403).json({ message: "Forbidden: Admin or problem setter access only" });
        }

        return next();
    });
};

// Verify a real session and the current database role on every admin request.
export const requireAdmin = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        const id = session?.user?.id;
        if (typeof id !== "string" || !id) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const identities = [{ id }];
        if (mongoose.isObjectIdOrHexString(id)) identities.push({ _id: id });
        const user = await User.findOne({ $or: identities });
        if (!user || accountBlocked(user)) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (user.role !== "admin") {
            return res.status(403).json({ message: "Forbidden: Admin access only" });
        }

        req.user = { ...session.user, role: user.role };
        req.session = { ...session, user: req.user };
        return next();
    } catch (error) {
        console.error("Admin auth middleware error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// Ensure user is student
export const requireStudent = async (req, res, next) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (session.user.role !== 'student') {
            return res.status(403).json({ message: "Forbidden: Student access only" });
        }

        req.session = session;
        req.user = session.user;
        next();
    } catch (error) {
        console.error("Student auth middleware error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
