import dns from "node:dns/promises";
dns.setServers(["1.1.1.1"]); // This is your magic DNS fix!

import dotenv from 'dotenv';
dotenv.config();

// Leave everything below this line exactly how your friend wrote it:
// ... rest of the code continues
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { toNodeHandler } from "better-auth/node";
import { auth, adminBypass } from "./lib/auth.js";

import { User } from "./models/User.js";

// Routes Imports
import setterRoutes from "./routes/setterRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import submissionRoutes from "./routes/submissionRoutes.js";
import leaderboardRoutes from "./routes/leaderboardRoutes.js";
import contestRoutes from "./routes/contestRoutes.js";
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman)
        if (!origin) return callback(null, true);
        
        const isAllowed = allowedOrigins.includes(origin) || 
                          origin.startsWith("http://localhost:") || 
                          origin.startsWith("http://127.0.0.1:") || 
                          /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/.test(origin);
        
        if (isAllowed) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));

app.use(express.json());

// Global admin bypass middleware — pre-sets req.user from x-admin-token header
app.use(adminBypass);

// Better Auth handler
app.all("/api/auth/*splat", toNodeHandler(auth));

// Mount routes
app.use("/api/setter", setterRoutes);
app.use("/api/problem", problemRoutes);
app.use("/api/problems", problemRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/contests", contestRoutes);





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

// Database Connection
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codinglab";

console.log('Connecting to MongoDB...');
mongoose.connect(mongoUri)
  .then(async () => {
    console.log('Successfully connected to MongoDB via Mongoose');
    try {
      const adminExists = await User.findOne({ email: "admin@example.com" });
      console.log(`[Admin Seed] Admin user check completed. Exists: ${!!adminExists}, Role: ${adminExists?.role}`);
      if (!adminExists) {
        console.log("Admin user not found. Seeding admin user...");
        await auth.api.signUpEmail({
          body: {
            email: "admin@example.com",
            password: "admin123",
            name: "Platform Admin",
          }
        });
        await User.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } });
        console.log("Admin user seeded successfully.");
      } else {
        if (adminExists.role !== "admin") {
          await User.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } });
          console.log("Admin role verified and updated.");
        }
      }
    } catch (err) {
      console.error("Error seeding admin user:", err);
    }
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    console.warn('Backend server running without active MongoDB Atlas connection.');
    if (!process.env.MONGODB_URI) {
      console.warn('Ensure you have a local MongoDB running at mongodb://127.0.0.1:27017/codinglab');
    } else {
      console.warn('Please check if your IP address is whitelisted in MongoDB Atlas Network Access.');
    }
  });

// Start Express server regardless of MongoDB connection state
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
