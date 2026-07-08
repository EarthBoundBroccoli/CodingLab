import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  problemId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Problem', 
    required: true 
  },
  userId: { 
    type: String, // Matches Better Auth user structure identifier string
    ref: 'User', 
    required: true 
  },
  contestId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Contest',
    default: null // Null if submitted outside of an active competition
  },
  code: { type: String, required: true },
  language: { 
    type: String, 
    required: true,
    enum: ['cpp', 'java', 'python', 'c'] // Supported JDoodle language hooks
  },
  verdict: { 
    type: String, 
    enum: ['Queue', 'Processing', 'Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Memory Limit Exceeded', 'Runtime Error', 'Compilation Error'], 
    default: 'Queue' 
  },
  timeTaken: { type: Number, default: 0 }, // In milliseconds (from JDoodle response)
  memoryUsed: { type: Number, default: 0 }, // In KB/MB
  compileOutput: { type: String, default: "" } // Error diagnostics block if compilation breaks
}, { 
  timestamps: true 
});

submissionSchema.index({ problemId: 1, userId: 1 });
submissionSchema.index({ contestId: 1 });

export const Submission = mongoose.model('Submission', submissionSchema, 'submissions');