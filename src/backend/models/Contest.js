import mongoose from 'mongoose';

const contestProblemSchema = new mongoose.Schema({
  problemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Problem', required: true },
  points: { type: Number, default: 100 } // Weighted score for this specific contest problem
}, { _id: false });

const contestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true }, // Contest rules / context
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  problems: [contestProblemSchema],
  registeredStudents: [{ type: String, ref: 'User' }], // References User.email or Better Auth ID
  creatorId: { type: String, ref: 'User', required: true }, // The admin or problem_setter who made it
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed'],
    default: 'upcoming'
  }
}, { 
  timestamps: true 
});

// Dynamic virtual check to determine contest stage on the fly
contestSchema.virtual('phase').get(function() {
  const now = new Date();
  if (now < this.startTime) return 'upcoming';
  if (now >= this.startTime && now <= this.endTime) return 'active';
  return 'completed';
});

export const Contest = mongoose.model('Contest', contestSchema, 'contests');