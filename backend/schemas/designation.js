import mongoose from 'mongoose';

const designationSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  level: { 
    type: Number, 
    default: 0,
    min: 0 
  },
  reportsTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Designation',
    default: null 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
}, { timestamps: true });

// Add index for better query performance
designationSchema.index({ title: 1 });
designationSchema.index({ reportsTo: 1 });

export default mongoose.model('Designation', designationSchema);
