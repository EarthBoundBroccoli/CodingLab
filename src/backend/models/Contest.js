import mongoose from 'mongoose';

const contestSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  duration: { 
    type: Number 
  },
  problems: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem' 
  }],
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Ended'],
    default: 'Upcoming'
  },
  participants: [{
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    score: { 
      type: Number, 
      default: 0 
    },
    penalty: { 
      type: Number, 
      default: 0 
    },
    solved: [{ 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Problem' 
    }]
  }],
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { 
  timestamps: true 
});

// Auto-calculate duration in minutes before saving
contestSchema.pre('save', function(next) {
  if (this.startTime && this.endTime) {
    this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  next();
});

export const Contest = mongoose.model('Contest', contestSchema, 'contests');