import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: { 
    type: String, // Matches your Better Auth user structure identifier string
    ref: 'User', 
    required: true 
  },
  title: { 
    type: String, 
    required: true // e.g., "Setter Request Approved! 🎉" or "Request Update"
  },
  message: { 
    type: String, 
    required: true // The main notification body text
  },
  note: { 
    type: String, 
    default: "" // Stores the specific rejection reason text from the Admin
  },
  type: {
    type: String,
    enum: ['role_change', 'system', 'contest'],
    default: 'role_change'
  },
  isRead: { 
    type: Boolean, 
    default: false // For unread indicator badges next to the bell icon
  }
}, { 
  timestamps: true // Gives us `createdAt` automatically to sort from latest to oldest!
});

// Indexing makes loading a user's notification list instantly fast
notificationSchema.index({ userId: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema, 'notifications');