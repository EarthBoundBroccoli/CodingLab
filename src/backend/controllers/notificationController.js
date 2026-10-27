import { Notification } from "../models/Notification.js";
import { auth } from "../lib/auth.js";
import mongoose from "mongoose";
import { Contest } from "../models/Contest.js";

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

        // Older announcements did not store a contest ID. Resolve only unambiguous names.
        const legacyName = item => item.type === 'contest' && !item.contestId
            ? /^A new contest "(.+)" has been created!$/.exec(item.message)?.[1] : null;
        const names = [...new Set(notifications.map(legacyName).filter(Boolean))];
        const contests = names.length ? await Contest.find({ name: { $in: names } }).select('_id name').lean() : [];
        res.json(notifications.map(item => {
            const matches = contests.filter(contest => contest.name === legacyName(item));
            return matches.length === 1
                ? { ...item.toObject(), contestId: matches[0]._id } : item;
        }));
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

        const ids = req.body?.ids;
        if (ids !== undefined && (!Array.isArray(ids) || ids.some(id => typeof id !== "string" || !mongoose.isObjectIdOrHexString(id)))) {
            return res.status(400).json({ message: "Notification IDs must be a list of valid IDs." });
        }

        await Notification.updateMany(
            { userId: session.user.id, isRead: false, ...(ids !== undefined ? { _id: { $in: ids } } : {}) },
            { $set: { isRead: true } }
        );

        res.json({ message: "All notifications marked as read." });
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
