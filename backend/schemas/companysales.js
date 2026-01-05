import mongoose from 'mongoose';

const companySalesSchema = new mongoose.Schema({
  companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
  totalSales: { type: Number, required: true },
  voucherCount: { type: Number, required: true },
  monthlyStats: [
    {
      month: { type: String, required: true },
      value: { type: Number, required: true },
    },
  ],
}, { timestamps: true });

export default mongoose.model('CompanySales', companySalesSchema);
