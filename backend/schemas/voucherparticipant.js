import mongoose from 'mongoose';

const voucherParticipantSchema = new mongoose.Schema({
  voucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', required: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  role: { type: String },
  confidence: { type: Number, required: true },
}, { timestamps: true });

voucherParticipantSchema.index({ voucherId: 1 });
voucherParticipantSchema.index({ employeeId: 1 });

export default mongoose.model('VoucherParticipant', voucherParticipantSchema);
