import mongoose from 'mongoose';

const universitySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shortName: { type: String, required: true, unique: true },
  totalRating: { type: Number, default: 0 }
}, { 
  timestamps: true 
});

export const University = mongoose.model('University', universitySchema, 'universities');
