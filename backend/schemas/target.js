import mongoose from 'mongoose';

const targetSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['employee', 'region', 'company', 'team'], 
    required: true,
    index: true
  },
  employeeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Employee',
    index: true
  },
  region: { 
    type: String,
    index: true
  },
  companyId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Company'
  },
  month: { 
    type: Number, 
    required: true,
    min: 1,
    max: 12,
    index: true
  },
  year: { 
    type: Number, 
    required: true,
    index: true
  },
  targetAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  targetVouchers: { 
    type: Number,
    min: 0
  },
  achievedAmount: { 
    type: Number, 
    default: 0 
  },
  achievedVouchers: { 
    type: Number, 
    default: 0 
  },
  status: {
    type: String,
    enum: ['on-track', 'at-risk', 'off-track', 'achieved', 'missed'],
    default: 'on-track'
  },
  notes: String,
  createdBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }
}, { 
  timestamps: true 
});

// Compound index for efficient queries
targetSchema.index({ type: 1, year: 1, month: 1 });
targetSchema.index({ employeeId: 1, year: 1, month: 1 });
targetSchema.index({ region: 1, year: 1, month: 1 });
targetSchema.index({ status: 1, year: 1, month: 1 });

export default mongoose.model('Target', targetSchema);
