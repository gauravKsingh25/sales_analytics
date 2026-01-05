import mongoose from 'mongoose';

const employeeCandidateSchema = new mongoose.Schema({
  nameRaw: { type: String, required: true },
  normalized: { type: String, required: true },
  confidence: { type: Number, required: true },
  matchedEmployeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  processed: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('EmployeeCandidate', employeeCandidateSchema);
