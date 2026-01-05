import mongoose from 'mongoose';
import Voucher from '../schemas/voucher.js';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

async function checkMonthlyData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all available months
    const monthlyData = await Voucher.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    console.log('\n=== Available Months in Database ===');
    monthlyData.forEach(m => {
      const monthName = new Date(m._id.year, m._id.month - 1).toLocaleDateString('en-IN', { 
        year: 'numeric', 
        month: 'long' 
      });
      console.log(`${monthName}: ${m.count} vouchers, Total: ₹${m.totalAmount.toLocaleString('en-IN')}`);
    });

    // Check specific month (March 2025 - which would be 3/2025)
    console.log('\n=== Checking March 2025 Specifically ===');
    const startDate = new Date(2025, 2, 1); // March is month 2 (0-indexed)
    const endDate = new Date(2025, 3, 0, 23, 59, 59, 999);
    
    console.log('Start Date:', startDate);
    console.log('End Date:', endDate);
    
    const marchVouchers = await Voucher.find({
      date: { $gte: startDate, $lte: endDate }
    }).lean();

    console.log(`Found ${marchVouchers.length} vouchers for March 2025`);
    
    if (marchVouchers.length > 0) {
      console.log('Sample voucher:', {
        date: marchVouchers[0].date,
        amount: marchVouchers[0].totalAmount,
        voucherNumber: marchVouchers[0].voucherNumber
      });
    }

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkMonthlyData();
