import { SetterRequest } from "../models/SetterRequest.js";
import { User } from "../models/User.js";
import { Notification } from "../models/Notification.js";
import { Problem } from "../models/Problem.js";
import mongoose from "mongoose";
import { userIdentityFilter } from "../utils/accountAccess.js";

const ADMIN_USER_FIELDS = '_id id name email role institution banned banReason disabledAt createdAt';

// All moderation statuses and test files are accessible only through the admin router.
export const getProblemRequests = async (req, res) => {
    try {
        const problems = await Problem.find({}).sort({ createdAt: -1 });
        res.set("Cache-Control", "no-store");
        return res.json(problems);
    } catch (error) {
        console.error("Error fetching problem requests:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    Get all pending setter requests
// @route   GET /api/admin/setter-requests
// @access  Protected (Admin Only)
export const getPendingSetterRequests = async (req, res) => {
    try {
        const requests = await SetterRequest.find({ status: 'pending' })
            .sort({ createdAt: -1 }).lean();
        const ids = [...new Set(requests.map(request => request.userId).filter(id => typeof id === 'string' && id))];
        const users = ids.length ? await User.find({ $or: [
            { id: { $in: ids } },
            { _id: { $in: ids.filter(id => mongoose.isObjectIdOrHexString(id)) } },
        ] }).select('_id id name email').lean() : [];
        const byAuthId = new Map(users.filter(user => typeof user.id === 'string').map(user => [user.id, user]));
        const byDatabaseId = new Map(users.map(user => [String(user._id), user]));

        res.set('Cache-Control', 'no-store');
        res.json(requests.map(request => {
            // Prefer the explicit auth identity when it differs from MongoDB's ID.
            const user = byAuthId.get(request.userId) || byDatabaseId.get(request.userId?.toLowerCase());
            return {
                ...request, applicantId: request.userId, accountMissing: !user,
                userId: user ? { _id: user._id, name: user.name, email: user.email } : null,
            };
        }));
    } catch (error) {
        console.error('Error fetching pending setter requests:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Approve or reject a setter request
// @route   PUT /api/admin/setter-requests/:id/decide
// @access  Protected (Admin Only)
export const decideSetterRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body || {};
        if (!['accepted', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status decision. Must be 'accepted' or 'rejected'." });
        }
        if (!mongoose.isObjectIdOrHexString(id)) {
            return res.status(404).json({ message: "Setter request not found" });
        }
        if (reason !== undefined && (typeof reason !== 'string' || reason.length > 2000)) {
            return res.status(400).json({ message: "Rejection reason must be text up to 2000 characters." });
        }

        const request = await SetterRequest.db.transaction(async session => {
            // A conditional write prevents concurrent admins from deciding twice.
            const decided = await SetterRequest.findOneAndUpdate(
                { _id: id, status: 'pending' }, { $set: {
                    status, decisionReason: status === 'rejected' ? reason?.trim() || 'No reason specified.' : '',
                    decidedAt: new Date(), decidedBy: req.user?.id || null,
                } }, { new: true, session }
            );
            if (!decided) {
                const existing = await SetterRequest.findById(id).session(session);
                const error = new Error(existing ? 'This request has already been decided. Refresh the list.' : 'Setter request not found');
                error.statusCode = existing ? 409 : 404;
                throw error;
            }

            const user = await User.findOne(userIdentityFilter(decided.userId)).session(session);
            if (!user) {
                const error = new Error('The applicant account no longer exists. No decision was saved.');
                error.statusCode = 409;
                throw error;
            }
            if (status === 'accepted' && (user.role !== 'student' || user.banned || user.disabledAt)) {
                const error = new Error('Only an active student account can be approved. No decision was saved.');
                error.statusCode = 409;
                throw error;
            }
            if (status === 'accepted') {
                user.role = 'problem_setter';
                await user.save({ session });
            }

            await new Notification({
                userId: decided.userId,
                title: status === 'accepted' ? 'Setter Request Approved!' : 'Setter Request Rejected',
                message: status === 'accepted'
                    ? 'Congratulations! Your request to become a Problem Setter has been approved. You can now access the Problem Studio to create problems.'
                    : 'Your application to become a Problem Setter was rejected.',
                note: status === 'rejected' ? reason?.trim() || 'No reason specified.' : '',
                type: 'role_change', isRead: false,
            }).save({ session });
            return decided;
        });

        return res.json({
            message: status === 'accepted' ? 'Request approved and role updated successfully.' : 'Request rejected successfully.',
            request,
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Error deciding setter request:', error);
        return res.status(500).json({ message: 'Could not save the decision and notification together. Please refresh and try again.' });
    }
};

// @desc    Get dashboard summary statistics
// @route   GET /api/admin/dashboard-summary
// @access  Protected (Admin Only)
export const getDashboardSummary = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({});
        const totalProblems = await Problem.countDocuments({ status: "approved" });
        const pendingProblems = await Problem.countDocuments({ status: "pending" });

        // Retrieve latest 5 pending problems, populated with setterId to resolve name and email
        const recentProblemRequests = await Problem.find({ status: "pending" })
            .sort({ createdAt: -1 })
            .limit(5)
            .populate("setterId", "name email");

        // Aggregation to find top contributors (approved problems grouped by setterId)
        const topContributorsRaw = await Problem.aggregate([
            { $match: { status: "approved" } },
            { $group: { _id: "$setterId", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        // Resolve names of top contributors
        const topContributors = [];
        for (const contributor of topContributorsRaw) {
            if (contributor._id) {
                const user = await User.findById(contributor._id);
                if (user) {
                    topContributors.push({
                        id: contributor._id,
                        name: user.name,
                        solved: contributor.count // Solved / Created count representation in UI
                    });
                }
            }
        }

        res.json({
            totalUsers,
            totalProblems,
            pendingProblems,
            recentProblemRequests,
            topContributors
        });
    } catch (error) {
        console.error('Error fetching dashboard summary:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Update problem request status
// @route   PUT /api/admin/problems/:id/status
// @access  Protected (Admin Only)
export const updateProblemStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: "Invalid status decision. Must be 'approved' or 'rejected'." });
        }

        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }

        problem.status = status;
        await problem.save();

        res.json({
            message: `Problem status updated to ${status} successfully.`,
            problem
        });
    } catch (error) {
        console.error('Error updating problem status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get all platform users
// @route   GET /api/admin/users
// @access  Protected (Admin Only)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}).select(ADMIN_USER_FIELDS).sort({ createdAt: -1 });
        res.set("Cache-Control", "no-store");
        res.json(users);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateUserAccess = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, reason } = req.body || {};
        if (!['ban', 'unban', 'disable', 'restore'].includes(action)) {
            return res.status(400).json({ message: 'Invalid account action.' });
        }
        if (action === 'ban' && (typeof reason !== 'string' || !reason.trim() || reason.trim().length > 1000)) {
            return res.status(400).json({ message: 'Provide a ban reason between 1 and 1000 characters.' });
        }
        const user = await User.findOne(userIdentityFilter(id));
        if (!user) return res.status(404).json({ message: 'User not found.' });
        if (user.role === 'admin' || [user.id, String(user._id)].includes(req.user.id)) {
            return res.status(403).json({ message: 'Administrator accounts cannot be moderated here.' });
        }
        if (user.disabledAt && ['ban', 'unban'].includes(action)) {
            return res.status(409).json({ message: 'Restore this disabled account before changing its ban status.' });
        }
        const changes = action === 'ban' ? { banned: true, banReason: reason.trim() }
            : action === 'unban' ? { banned: false, banReason: '' }
            : action === 'disable' ? { disabledAt: user.disabledAt || new Date() }
            : { disabledAt: null }; // Restoring does not override an existing ban.
        const updated = await User.findOneAndUpdate(
            { _id: user._id, role: { $ne: 'admin' },
                ...(['ban', 'unban'].includes(action) ? { disabledAt: null } : {}) },
            { $set: changes }, { new: true, projection: ADMIN_USER_FIELDS }
        );
        if (!updated) return res.status(409).json({ message: 'Account changed. Refresh the user list and try again.' });
        if (['ban', 'disable'].includes(action)) {
            const ids = [...new Set([user.id, String(user._id)].filter(Boolean))];
            const sessionIds = ids.flatMap(value => mongoose.isObjectIdOrHexString(value)
                ? [value, new mongoose.Types.ObjectId(value)] : [value]);
            await User.db.collection('session').deleteMany({ userId: { $in: sessionIds } });
        }
        return res.json({ user: updated, message: 'Account access updated.' });
    } catch (error) {
        console.error('Error updating account access:', error);
        return res.status(500).json({ message: 'Could not complete the account update. Refresh to check its current status.' });
    }
};
