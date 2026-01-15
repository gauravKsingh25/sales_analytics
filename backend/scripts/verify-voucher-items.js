/**
 * Verify vouchers have items in MongoDB
 * Quick script to check random vouchers and their items
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';

import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';

// Load environment variables
dotenv.config({ path: path.resolve('backend', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

async function checkVouchers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    // Get total counts
    const totalVouchers = await Voucher.countDocuments();
    const totalItems = await VoucherItem.countDocuments();
    
    console.log('📊 Database Overview:');
    console.log(`   Total Vouchers: ${totalVouchers}`);
    console.log(`   Total Items: ${totalItems}`);
    console.log(`   Average Items per Voucher: ${(totalItems / totalVouchers).toFixed(2)}\n`);
    
    // Get some random vouchers from March 2025
    const marchVouchers = await Voucher.find({
      voucherNumber: /^ODIN\/0668/
    }).limit(5);
    
    console.log('🔍 Checking sample vouchers from March 2025:\n');
    console.log('='.repeat(80));
    
    for (const voucher of marchVouchers) {
      // Get items for this voucher
      const items = await VoucherItem.find({ voucherId: voucher._id });
      
      console.log(`\n📄 Voucher: ${voucher.voucherNumber}`);
      console.log(`   Date: ${voucher.date.toISOString().slice(0, 10)}`);
      console.log(`   Total Amount: ₹${voucher.totalAmount}`);
      console.log(`   Company ID: ${voucher.companyId}`);
      console.log(`   Items Count: ${items.length}`);
      
      if (items.length > 0) {
        console.log(`   \n   Items:`);
        items.forEach((item, idx) => {
          console.log(`      ${idx + 1}. ${item.description}`);
          console.log(`         Qty: ${item.qty}, Unit Price: ₹${item.unitPrice}, Amount: ₹${item.amount}`);
        });
      } else {
        console.log(`   ⚠️  No items found for this voucher`);
      }
      
      console.log('   ' + '-'.repeat(76));
    }
    
    console.log('\n' + '='.repeat(80));
    
    // Get vouchers with most items
    console.log('\n🏆 Top 5 vouchers with most items:\n');
    
    const vouchersWithItemCounts = await VoucherItem.aggregate([
      {
        $group: {
          _id: '$voucherId',
          itemCount: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      },
      { $sort: { itemCount: -1 } },
      { $limit: 5 }
    ]);
    
    for (const v of vouchersWithItemCounts) {
      const voucher = await Voucher.findById(v._id);
      if (voucher) {
        console.log(`   ${voucher.voucherNumber}: ${v.itemCount} items, Total: ₹${v.totalAmount.toFixed(2)}`);
      }
    }
    
    // Check for vouchers without items
    const vouchersWithoutItems = await Voucher.aggregate([
      {
        $lookup: {
          from: 'voucheritems',
          localField: '_id',
          foreignField: 'voucherId',
          as: 'items'
        }
      },
      {
        $match: {
          items: { $size: 0 }
        }
      },
      { $limit: 10 }
    ]);
    
    console.log(`\n\n⚠️  Vouchers without items: ${vouchersWithoutItems.length > 0 ? vouchersWithoutItems.length + ' found (showing first 10)' : 'None'}`);
    
    if (vouchersWithoutItems.length > 0) {
      vouchersWithoutItems.slice(0, 5).forEach(v => {
        console.log(`   - ${v.voucherNumber} (${v.date.toISOString().slice(0, 10)})`);
      });
    }
    
    console.log('\n✅ Verification complete!\n');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkVouchers();
