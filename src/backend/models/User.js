import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: 'student' },
  institution: String,
  university: { type: mongoose.Schema.Types.ObjectId, ref: 'University' },
  rating: { type: Number, default: 0 },
}, { 
  strict: false, // Allows flexible integration with Better Auth fields
  timestamps: true 
});

export const User = mongoose.model('User', userSchema, 'user');
