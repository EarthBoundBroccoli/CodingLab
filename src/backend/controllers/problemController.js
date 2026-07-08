import { Problem } from "../models/Problem.js";
import { auth } from "../lib/auth.js";
import { uploadTextFile } from "../lib/cloudinary.js";

// @desc    Add a new coding problem
// @route   POST /api/problem/add
// @access  Protected (Problem Setter Only)
export const addProblem = async (req, res) => {
    try {
        const session = await auth.api.getSession({
            headers: req.headers
        });

        if (!session) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Verify that the user is a problem setter
        if (session.user.role !== 'problem_setter') {
            return res.status(403).json({ message: "Forbidden: Only problem setters can add problems." });
        }

        const {
            title,
            difficulty,
            tags,
            statement,
            inputFormat,
            outputFormat,
            timeLimit,
            memoryLimit,
            samples,
            hiddenInput, // Raw text content from request
            hiddenOutput  // Raw text content from request
        } = req.body;

        // Validation
        if (!title || !difficulty || !tags || !statement || !inputFormat || !outputFormat || !timeLimit || !memoryLimit || !samples || !hiddenInput || !hiddenOutput) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!Array.isArray(samples) || samples.length < 1 || samples.length > 5) {
            return res.status(400).json({ message: "Between 1 and 5 sample cases are required." });
        }

        console.log(`Uploading testcase files to Cloudinary for problem: "${title}"...`);

        // Upload testcases to Cloudinary and get URLs
        const hiddenInputUrl = await uploadTextFile(hiddenInput, 'input');
        const hiddenOutputUrl = await uploadTextFile(hiddenOutput, 'output');

        console.log(`Successfully uploaded testcases:`);
        console.log(`- Input URL: ${hiddenInputUrl}`);
        console.log(`- Output URL: ${hiddenOutputUrl}`);

        const newProblem = new Problem({
            title,
            difficulty,
            tags,
            statement,
            inputFormat,
            outputFormat,
            timeLimit,
            memoryLimit,
            samples,
            hiddenInput: hiddenInputUrl,   // Cloudinary URL
            hiddenOutput: hiddenOutputUrl, // Cloudinary URL
            setterId: session.user.id,
            status: 'approved' // Auto-approved for now
        });

        const savedProblem = await newProblem.save();

        res.status(201).json({
            message: "Problem created successfully",
            problemId: savedProblem._id
        });
    } catch (error) {
        console.error('Error creating problem:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get all problems
// @route   GET /api/problem
// @access  Public
export const getApprovedProblems = async (req, res) => {
    try {
        const problems = await Problem.find({}).sort({ createdAt: -1 });
        res.json(problems);
    } catch (error) {
        console.error('Error fetching problems:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// @desc    Get a single problem by ID
// @route   GET /api/problem/:id
// @access  Public
export const getProblemById = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = await Problem.findById(id);
        if (!problem) {
            return res.status(404).json({ message: "Problem not found" });
        }
        res.json(problem);
    } catch (error) {
        console.error('Error fetching problem details:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
