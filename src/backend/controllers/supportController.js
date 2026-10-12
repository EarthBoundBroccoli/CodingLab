import mongoose from 'mongoose';
import { SupportRequest } from '../models/SupportRequest.js';
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
