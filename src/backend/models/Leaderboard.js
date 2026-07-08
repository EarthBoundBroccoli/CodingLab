import mongoose from 'mongoose';

const userStatsSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true 
  },
  solvedCount: { 
    type: Number, 
    default: 0 
  },
  totalSubmissions: { 
    type: Number, 
    default: 0 
  },
  solvedProblems: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem' // Prevents counting duplicate solves for the same problem
  }],
  points: { 
    type: Number, 
    default: 0 // Optional: dynamic weighting (e.g., Easy = 10pts, Medium = 30pts)
  }
}, { 
  timestamps: true 
});

export const UserStats = mongoose.model('UserStats', userStatsSchema, 'user_stats');