import { Notification } from "../models/Notification.js";
import { auth } from "../lib/auth.js";

// @desc    Get all notifications for the logged-in user
// @route   GET /api/notifications
// @access  Protected
export const getNotifications = async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const notifications = await Notification.find({ userId: session.user.id })
            .sort({ createdAt: -1 });

        res.json(notifications);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Protected
export const readAllNotifications = async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        await Notification.updateMany(
            { userId: session.user.id, isRead: false },
            { $set: { isRead: true } }
        );

        res.json({ message: "All notifications marked as read." });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
