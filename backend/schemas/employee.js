import mongoose from 'mongoose';
import crypto from 'crypto';

const employeeSchema = new mongoose.Schema({
  employeeCode: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  normalized: { type: String, required: true, index: true, unique: true },
  metadata: { type: Object },
  
  // Employee Management Fields
  dateOfJoining: { type: Date },
  currentlyWorking: { type: Boolean, default: true },
  dateOfLeaving: { type: Date },
  workZones: [{ type: String }], // Array of work zones/locations
  designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation' },
  reportingTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  
}, { timestamps: true });

// Auto-generate employee code if not provided
employeeSchema.pre('save', function(next) {
  if (!this.employeeCode) {
    this.employeeCode = 'EMP' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

export default mongoose.model('Employee', employeeSchema);
