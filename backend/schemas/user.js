import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['admin', 'manager', 'viewer'], required: true },
}, { timestamps: true });

export default mongoose.model('User', userSchema);
