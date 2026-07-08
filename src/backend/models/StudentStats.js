import mongoose from 'mongoose';

const dailySolveSchema = new mongoose.Schema({
  date: { type: String, required: true }, // Format: YYYY-MM-DD for easy mapping
  count: { type: Number, default: 0 }
}, { _id: false });

const studentStatsSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    ref: 'User', 
    required: true, 
    unique: true 
  },
  solvedProblems: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem' // Keeps array unique to prevent duplication counts
  }],
  attemptedProblems: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem'
  }],
  difficultyBreakdown: {
    easy: { type: Number, default: 0 },
    medium: { type: Number, default: 0 },
    hard: { type: Number, default: 0 }
  },
  totalSubmissionsCount: { type: Number, default: 0 },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: { type: String, default: "" }, // Format: YYYY-MM-DD
  activityHistory: [dailySolveSchema] // Feeds your Recharts BarCharts/Activity Logs directly!
}, { 
  timestamps: true 
});

export const StudentStats = mongoose.model('StudentStats', studentStatsSchema, 'student_stats');