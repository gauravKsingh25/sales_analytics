import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  path: { type: String, required: true },
  status: { type: String, enum: ['queued', 'processing', 'done', 'failed'], required: true },
  message: { type: String },
  processedAt: { type: Date },
  processedRows: { type: Number, default: 0 },
  totalRows: { type: Number, default: 0 },
  errorsList: { type: [String], default: [] },
  rawJsonPath: { type: String },
}, { timestamps: true });

export default mongoose.model('Upload', uploadSchema);
