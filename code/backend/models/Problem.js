import mongoose from 'mongoose';

const sampleSchema = new mongoose.Schema({
  input: { type: String, required: true },
  output: { type: String, required: true },
  explanation: { type: String, default: "" }
}, { _id: false });

const problemSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  difficulty: { 
    type: String, 
    required: true,
    enum: ['Easy', 'Medium', 'Hard']
  },
  tags: { 
    type: [String], 
    required: true 
  },
  statement: { 
    type: String, 
    required: true 
  },
  inputFormat: { 
    type: String, 
    required: true 
  },
  outputFormat: { 
    type: String, 
    required: true 
  },
  timeLimit: { 
    type: Number, 
    required: true // in milliseconds
  },
  memoryLimit: { 
    type: Number, 
    required: true // in MB
  },
  samples: {
    type: [sampleSchema],
    validate: [
      {
        validator: function(val) {
          return val.length >= 1 && val.length <= 5;
        },
        message: 'A problem must have between 1 and 5 sample inputs/outputs.'
      }
    ]
  },
  hiddenInput: { 
    type: String, 
    required: true 
  },
  hiddenOutput: { 
    type: String, 
    required: true 
  },
  setterId: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved' // Automatically approved for now (no moderation flow yet)
  }
}, { 
  timestamps: true 
});

export const Problem = mongoose.model('Problem', problemSchema, 'problems');
