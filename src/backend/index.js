import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

import { User } from './models/User.js';
import { SetterRequest } from './models/SetterRequest.js';
import { Problem } from './models/Problem.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: "http://localhost:5173", // Frontend URL
    credentials: true
}));

app.use(express.json());

// Better Auth handler
app.all("/api/auth/*splat", toNodeHandler(auth));

// Basic Route
app.get('/', (req, res) => {
  res.send('CodingLab Backend API is running...');
});

// Example Protected Route
app.get('/api/me', async (req, res) => {
    const session = await auth.api.getSession({
        headers: req.headers
    });
    
    if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    
    res.json(session);
});

// GET setter application status
app.get('/api/setter/status', async (req, res) => {
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
});

// POST submit setter application
app.post('/api/setter/apply', async (req, res) => {
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
        // "after submitting the form i directly become setter (for now) as i need to test things out."
        // We will keep 'pending' logic commented out or structured so it's there as requested.
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
});

// POST add new problem
app.post('/api/problem/add', async (req, res) => {
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
            hiddenInput,
            hiddenOutput
        } = req.body;

        // Validation
        if (!title || !difficulty || !tags || !statement || !inputFormat || !outputFormat || !timeLimit || !memoryLimit || !samples || !hiddenInput || !hiddenOutput) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!Array.isArray(samples) || samples.length < 1 || samples.length > 5) {
            return res.status(400).json({ message: "Between 1 and 5 sample cases are required." });
        }

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
            hiddenInput,
            hiddenOutput,
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
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB via Mongoose');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });
