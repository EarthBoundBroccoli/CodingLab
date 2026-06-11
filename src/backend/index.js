import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";

// Routes Imports
import setterRoutes from "./routes/setterRoutes.js";
import problemRoutes from "./routes/problemRoutes.js";

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

// Better Auth handler
app.all("/api/auth/*splat", toNodeHandler(auth));




// Mount routes
app.use("/api/setter", setterRoutes);
app.use("/api/problem", problemRoutes);






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
  .then(() => {
    console.log('Successfully connected to MongoDB via Mongoose');
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
