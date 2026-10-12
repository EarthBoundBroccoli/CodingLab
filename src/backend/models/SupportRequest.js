import mongoose from 'mongoose';

const supportRequestSchema = new mongoose.Schema({
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, maxlength: 254 },
    message: { type: String, required: true, minlength: 10, maxlength: 5000 },
    userId: { type: String, default: null },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
}, { timestamps: true });
supportRequestSchema.index({ status: 1, createdAt: -1 });
export const SupportRequest = mongoose.model('SupportRequest', supportRequestSchema);
