import mongoose from 'mongoose';

const companySchema = new mongoose.Schema({
  name: { type: String, required: true },
  normalized: { type: String, required: true, unique: true },
  metadata: { type: Object },
}, { timestamps: true });

export default mongoose.model('Company', companySchema);
