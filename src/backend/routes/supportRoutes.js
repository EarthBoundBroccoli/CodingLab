import express from 'express';
import { createSupportRequest } from '../controllers/supportController.js';

const router = express.Router();
const attempts = new Map();
const windowMs = 15 * 60 * 1000;
// Keep this public form usable without a login while limiting repeated submissions.
export const limitSupportRequests = (req, res, next) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key);
    const key = req.ip;
    const entry = attempts.get(key) || { count: 0, until: now + windowMs };
    if (entry.count >= 5) {
        res.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)));
        return res.status(429).json({ message: 'Too many messages. Please try again in 15 minutes.' });
    }
    entry.count++;
    attempts.set(key, entry);
    return next();
};
router.post('/', limitSupportRequests, createSupportRequest);
export default router;
