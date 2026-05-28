import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

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
    // You can use headers to get the session on the server
    const session = await auth.api.getSession({
        headers: req.headers
    });
    
    if (!session) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    
    res.json(session);
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
