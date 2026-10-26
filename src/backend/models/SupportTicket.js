import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'Resolved', 'Pending'],
    default: 'Open'
  },
  adminReply: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

supportTicketSchema.index({ userId: 1, createdAt: -1 });
supportTicketSchema.index({ status: 1, createdAt: -1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
