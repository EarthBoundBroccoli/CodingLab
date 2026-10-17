import mongoose from 'mongoose';

const setterRequestSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  institute: { 
    type: String, 
    required: true 
  },
  deptProgram: { 
    type: String, 
    required: true 
  },
  currSemester: { 
    type: String, 
    required: true 
  },
  cgpa: { 
    type: String, 
    required: true 
  },
  profileLinks: { 
    type: String, 
    required: true 
  },
  motivation: { 
    type: String, 
    required: true 
  },
  decisionReason: { type: String, default: '' },
  decidedAt: { type: Date, default: null },
  decidedBy: { type: String, default: null },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'], 
    default: 'pending' 
  }
}, { 
  timestamps: true 
});

export const SetterRequest = mongoose.model('SetterRequest', setterRequestSchema, 'setter_requests');
