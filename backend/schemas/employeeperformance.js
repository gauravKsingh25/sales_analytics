import mongoose from 'mongoose';

const employeePerformanceSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  totalSales: { type: Number, required: true },
  voucherCount: { type: Number, required: true },
  avgVoucherValue: { type: Number, required: true },
  monthlyStats: [
    {
      month: { type: String, required: true },
      value: { type: Number, required: true },
    },
  ],
}, { timestamps: true });

export default mongoose.model('EmployeePerformance', employeePerformanceSchema);
