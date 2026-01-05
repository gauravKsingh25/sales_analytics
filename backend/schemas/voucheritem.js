import mongoose from 'mongoose';

const voucherItemSchema = new mongoose.Schema({
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
  description: { type: String, required: true },
  qty: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  hsn: { type: String },
}, { timestamps: true });

voucherItemSchema.index({ voucherId: 1 });

export default mongoose.model('VoucherItem', voucherItemSchema);
