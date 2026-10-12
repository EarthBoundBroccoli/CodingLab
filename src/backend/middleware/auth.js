import { auth } from "../lib/auth.js";
import { User } from "../models/User.js";

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

// Ensure user is admin (with header bypass support)
export const requireAdmin = async (req, res, next) => {
    try {
        const adminToken = req.headers['x-admin-token'];
        const isBypass = adminToken === 'admin123';

        if (isBypass) {
            req.user = {
                id: "admin-bypass-id",
                role: "admin",
                email: "admin@example.com",
                name: "Bypass Admin"
            };
            return next();
        }

        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Auto-upgrade admin@example.com to role 'admin' in database if not already done
        if (session.user.email === 'admin@example.com' && session.user.role !== 'admin') {
            await User.updateOne({ email: 'admin@example.com' }, { $set: { role: 'admin' } });
            session.user.role = 'admin';
        }

        if (session.user.role !== 'admin') {
            return res.status(403).json({ message: "Forbidden: Admin access only" });
        }

        req.session = session;
        req.user = session.user;
        next();
    } catch (error) {
        console.error("Admin auth middleware error:", error);
        res.status(500).json({ message: "Internal server error" });
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
