import mongoose from 'mongoose';
import { SupportRequest } from '../models/SupportRequest.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { auth } from '../lib/auth.js';

export const createSupportRequest = async (req, res) => {
    try {
        const { name, email, message } = req.body || {};
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 100
            || typeof email !== 'string' || email.trim().length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
            || typeof message !== 'string' || message.trim().length < 10 || message.trim().length > 5000) {
            return res.status(400).json({ message: 'Enter your name, a valid email, and a message between 10 and 5000 characters.' });
        }
        const session = await auth.api.getSession({ headers: req.headers });
        const request = await SupportRequest.create({
            name: name.trim(), email: email.trim().toLowerCase(), message: message.trim(),
            userId: session?.user?.id || null,
        });
        return res.status(201).json({ id: request._id, message: 'Your message has been saved for the support team.' });
    } catch (error) {
        console.error('Error saving support request:', error);
        return res.status(500).json({ message: 'Could not save your message. Please try again.' });
    }
};

export const getSupportRequests = async (req, res) => {
    try {
        const status = req.query.status || 'open';
        const page = Number(req.query.page || 1);
        if (!['open', 'resolved', 'all'].includes(status) || !Number.isSafeInteger(page) || page < 1) {
            return res.status(400).json({ message: 'Invalid status or page.' });
        }
        const filter = status === 'all' ? {} : { status };
        const total = await SupportRequest.countDocuments(filter);
        const totalPages = Math.max(1, Math.ceil(total / 20));
        const currentPage = Math.min(page, totalPages);
        const requests = await SupportRequest.find(filter).sort({ createdAt: -1, _id: -1 })
            .skip((currentPage - 1) * 20).limit(20);
        res.set('Cache-Control', 'no-store');
        return res.json({ requests, page: currentPage, totalPages, total });
    } catch (error) {
        console.error('Error loading support requests:', error);
        return res.status(500).json({ message: 'Could not load support requests.' });
    }
};

export const updateSupportStatus = async (req, res) => {
    try {
        const { status } = req.body || {};
        if (!mongoose.isObjectIdOrHexString(req.params.id) || !['open', 'resolved'].includes(status)) {
            return res.status(400).json({ message: 'Invalid request ID or status.' });
        }
        const request = await SupportRequest.findByIdAndUpdate(req.params.id, { $set: {
            status, resolvedAt: status === 'resolved' ? new Date() : null,
            resolvedBy: status === 'resolved' ? req.user.id : null,
        } }, { new: true });
        if (!request) return res.status(404).json({ message: 'Support request not found.' });
        return res.json({ request });
    } catch (error) {
        console.error('Error updating support status:', error);
        return res.status(500).json({ message: 'Could not update this request. Please try again.' });
    }
};

// ==================== SUPPORT TICKET SYSTEM ====================

// @desc    Create a new support ticket
// @route   POST /api/support/tickets
// @access  Authenticated
export const createTicket = async (req, res) => {
    try {
        const { subject, message } = req.body || {};
        if (!subject || typeof subject !== 'string' || !subject.trim()
            || !message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'Subject and message are required.' });
        }

        const session = req.session || await auth.api.getSession({ headers: req.headers }).catch(() => null);
        const userId = req.user?.id || session?.user?.id || req.body?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized: User authentication required.' });
        }

        const ticketStatus = req.body?.status || 'Open';
        const ticket = await SupportTicket.create({
            userId,
            subject: subject.trim(),
            message: message.trim(),
            status: ticketStatus,
            adminReply: ''
        });

        return res.status(201).json({ message: 'Support ticket created successfully.', ticket });
    } catch (error) {
        console.error('Error creating support ticket:', error);
        return res.status(500).json({ message: 'Could not create support ticket. Please try again.' });
    }
};

// @desc    Get all tickets belonging to logged-in user
// @route   GET /api/support/my-tickets, GET /api/support/tickets/my
// @access  Authenticated
export const getMyTickets = async (req, res) => {
    try {
        const session = req.session || await auth.api.getSession({ headers: req.headers }).catch(() => null);
        const userId = req.user?.id || session?.user?.id || req.query?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const tickets = await SupportTicket.find({ userId }).sort({ createdAt: -1 });
        return res.json(tickets);
    } catch (error) {
        console.error('Error fetching user tickets:', error);
        return res.status(500).json({ message: 'Could not fetch support tickets.' });
    }
};

// @desc    Get all tickets (Admin only, populated with user name and email)
// @route   GET /api/support/all, GET /api/support/all-tickets, GET /api/support/tickets (when admin)
// @access  Admin Only
export const getAllTickets = async (req, res) => {
    try {
        const filter = {};
        if (req.query?.status && req.query.status !== 'all') {
            const s = String(req.query.status).toLowerCase();
            if (s === 'open' || s === 'pending') {
                filter.status = { $in: ['Open', 'open', 'Pending', 'pending'] };
            } else if (s === 'resolved') {
                filter.status = { $in: ['Resolved', 'resolved'] };
            } else {
                filter.status = req.query.status;
            }
        }

        const tickets = await SupportTicket.find(filter)
            .sort({ createdAt: -1 })
            .populate('userId', 'name email');

        // Check if any tickets have string userId that was not populated by Mongoose
        const unpopulated = tickets.filter(t => !t.userId || typeof t.userId === 'string');
        if (unpopulated.length > 0) {
            const userIds = [...new Set(unpopulated.map(t => typeof t.userId === 'string' ? t.userId : t.userId?.toString()).filter(Boolean))];
            if (userIds.length > 0) {
                const users = await User.find({
                    $or: [
                        { id: { $in: userIds } },
                        { _id: { $in: userIds.filter(id => mongoose.isObjectIdOrHexString(id)) } }
                    ]
                }).select('_id id name email').lean();

                const userMap = new Map();
                for (const u of users) {
                    const info = { _id: u._id, name: u.name, email: u.email };
                    if (u.id) userMap.set(u.id, info);
                    userMap.set(String(u._id), info);
                }

                const result = tickets.map(t => {
                    const ticketObj = t.toObject ? t.toObject() : { ...t };
                    if (!ticketObj.userId || typeof ticketObj.userId === 'string') {
                        const matched = userMap.get(ticketObj.userId);
                        if (matched) ticketObj.userId = matched;
                    }
                    return ticketObj;
                });
                return res.json(result);
            }
        }

        return res.json(tickets);
    } catch (error) {
        console.error('Error fetching all tickets:', error);
        return res.status(500).json({ message: 'Could not fetch support tickets.' });
    }
};

// @desc    Reply to a support ticket and mark Resolved (Admin only)
// @route   POST/PATCH/PUT /api/support/tickets/:id/reply
// @access  Admin Only
export const replyToTicket = async (req, res) => {
    try {
        const ticketId = req.params.id || req.body?.ticketId || req.body?.id;
        const { adminReply } = req.body || {};

        if (!ticketId) {
            return res.status(400).json({ message: 'Ticket ID is required.' });
        }
        if (!adminReply || typeof adminReply !== 'string' || !adminReply.trim()) {
            return res.status(400).json({ message: 'adminReply is required.' });
        }

        const ticket = mongoose.isObjectIdOrHexString(ticketId)
            ? await SupportTicket.findById(ticketId)
            : await SupportTicket.findOne({ _id: ticketId });

        if (!ticket) {
            return res.status(404).json({ message: 'Support ticket not found.' });
        }

        ticket.adminReply = adminReply.trim();
        ticket.status = 'Resolved';
        await ticket.save();

        try {
            await Notification.create({
                userId: ticket.userId,
                title: 'Support Ticket Reply',
                message: 'Admin replied to your support ticket',
                note: adminReply.trim(),
                type: 'system',
                isRead: false
            });
        } catch (notifErr) {
            console.error('Failed to create notification for support ticket reply:', notifErr);
        }

        return res.json({ message: 'Ticket replied and resolved successfully.', ticket });
    } catch (error) {
        console.error('Error replying to ticket:', error);
        return res.status(500).json({ message: 'Could not reply to support ticket.' });
    }
};
