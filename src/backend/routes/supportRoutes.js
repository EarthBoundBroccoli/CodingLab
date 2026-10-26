import express from 'express';
import { 
    createSupportRequest,
    createTicket,
    getMyTickets,
    getAllTickets,
    replyToTicket
} from '../controllers/supportController.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

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

// Public support request / contact form (dispatches ticket creation if subject is provided)
router.post('/', limitSupportRequests, (req, res, next) => {
    if (req.body?.subject && !req.body?.name && !req.body?.email) {
        return createTicket(req, res, next);
    }
    return createSupportRequest(req, res, next);
});

// Support Ticket routes
router.post('/tickets', requireAuth, createTicket);
router.post('/ticket', requireAuth, createTicket);

// User's tickets
router.get('/my-tickets', requireAuth, getMyTickets);
router.get('/tickets/my', requireAuth, getMyTickets);

// Smart /tickets route: returns all tickets for Admin, or my-tickets for regular users
router.get('/tickets', requireAuth, (req, res, next) => {
    if (req.user?.role === 'admin') {
        return getAllTickets(req, res, next);
    }
    return getMyTickets(req, res, next);
});

// Admin-specific tickets list
router.get('/all', requireAdmin, getAllTickets);
router.get('/all-tickets', requireAdmin, getAllTickets);
router.get('/tickets/all', requireAdmin, getAllTickets);

// Admin reply to ticket
router.put('/:id/reply', requireAdmin, replyToTicket);
router.patch('/:id/reply', requireAdmin, replyToTicket);
router.post('/:id/reply', requireAdmin, replyToTicket);
router.put('/tickets/:id/reply', requireAdmin, replyToTicket);
router.patch('/tickets/:id/reply', requireAdmin, replyToTicket);
router.post('/tickets/:id/reply', requireAdmin, replyToTicket);
router.put('/reply/:id', requireAdmin, replyToTicket);
router.patch('/reply/:id', requireAdmin, replyToTicket);
router.post('/reply/:id', requireAdmin, replyToTicket);
router.post('/reply', requireAdmin, replyToTicket);

export default router;
