import mongoose from 'mongoose';

const voucherSchema = new mongoose.Schema({
  voucherNumber: { type: String, required: true, unique: true },
  date: { type: Date, required: true },
  totalAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  uploadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', required: true },
  rawOriginal: { type: Object, required: true },
  rawUnique: { type: Object, required: true },
  dedupeHash: { type: String, required: true, unique: true },
}, { timestamps: true });

voucherSchema.index({ voucherNumber: 1 }, { unique: true });
voucherSchema.index({ companyId: 1, date: 1 });
voucherSchema.index({ dedupeHash: 1 }, { unique: true });
voucherSchema.index({ date: -1 });
voucherSchema.index({ totalAmount: 1 });

export default mongoose.model('Voucher', voucherSchema);
