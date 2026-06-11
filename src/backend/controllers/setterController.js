import { SetterRequest } from "../models/SetterRequest.js";
import { User } from "../models/User.js";
import { auth } from "../lib/auth.js";

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

        const request = await SetterRequest.findOne({ userId: session.user.id });
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

        const { institute, deptProgram, currSemester, cgpa, profileLinks, motivation } = req.body;

        if (!institute || !deptProgram || !currSemester || !cgpa || !profileLinks || !motivation) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if application already exists
        const existingRequest = await SetterRequest.findOne({ userId: session.user.id });
        if (existingRequest) {
            return res.status(400).json({ message: "Application already submitted" });
        }

        // Create the application. We default status to 'accepted' to satisfy testing requirement:
        const newRequest = new SetterRequest({
            userId: session.user.id,
            institute,
            deptProgram,
            currSemester,
            cgpa,
            profileLinks,
            motivation,
            status: 'accepted' // TESTING OVERRIDE: Directly approved (Normally 'pending')
        });

        await newRequest.save();

        // Directly upgrade user's role to 'problem_setter' for testing purposes
        await User.updateOne(
            { _id: session.user.id },
            { $set: { role: 'problem_setter' } }
        );

        res.status(201).json({
            message: "Application submitted and auto-approved for testing",
            status: 'accepted'
        });
    } catch (error) {
        console.error('Error submitting setter application:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
