import { SetterRequest } from "../models/SetterRequest.js";
import { User } from "../models/User.js";
import { auth } from "../lib/auth.js";
import { userIdentityFilter } from "../utils/accountAccess.js";

// @desc    Get setter application status
// @route   GET /api/setter/status
// @access  Protected
export const getSetterStatus = async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const request = await SetterRequest.findOne({ userId: session.user.id }).sort({ createdAt: -1, _id: -1 });
        res.set('Cache-Control', 'no-store');
        if (!request) {
            return res.json({ status: null });
        }

        res.json({
            status: request.status,
            request
        });
    } catch (error) {
        console.error('Error fetching setter status:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Submit setter application
// @route   POST /api/setter/apply
// @access  Protected
export const applyForSetter = async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const fields = ['institute', 'deptProgram', 'currSemester', 'cgpa', 'profileLinks', 'motivation'];
        if (fields.some(key => typeof req.body?.[key] !== 'string' || !req.body[key].trim() || req.body[key].length > 5000)) {
            return res.status(400).json({ message: "Complete all application fields with text up to 5000 characters each." });
        }
        const details = Object.fromEntries(fields.map(key => [key, req.body[key].trim()]));

        await SetterRequest.db.transaction(async transaction => {
            // Serialize applications for this student so two tabs cannot both
            // create a pending request, including their very first application.
            const user = await User.findOneAndUpdate({
                ...userIdentityFilter(session.user.id), role: 'student',
                banned: { $ne: true }, disabledAt: null,
            }, { $inc: { setterApplicationVersion: 1 } }, { new: true, session: transaction });
            if (!user) {
                throw Object.assign(new Error('Only active student accounts can apply.'), { statusCode: 403 });
            }
            const existing = await SetterRequest.findOne({
                userId: session.user.id, status: { $in: ['pending', 'accepted'] },
            }).session(transaction);
            if (existing) {
                throw Object.assign(new Error(existing.status === 'pending'
                    ? 'You already have an application under review.' : 'Your application has already been accepted.'), { statusCode: 409 });
            }
            // Keep rejected applications and their decisions unchanged.
            await new SetterRequest({ ...details, userId: session.user.id, status: 'pending' }).save({ session: transaction });
        });

        res.status(201).json({
            message: "Application submitted successfully under review",
            status: 'pending'
        });
    } catch (error) {
        if (error.statusCode) return res.status(error.statusCode).json({ message: error.message });
        console.error('Error submitting setter application:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
