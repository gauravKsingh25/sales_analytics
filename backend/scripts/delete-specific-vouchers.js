import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';
import VoucherParticipant from '../schemas/voucherparticipant.js';

dotenv.config();

const VOUCHERS_TO_DELETE = [
  'Total_dup3',
  'Total_dup2',
  'Total_dup1',
  'Total:',
  'Total'
];

async function deleteSpecificVouchers() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🔍 Searching for vouchers to delete:');
    console.log(VOUCHERS_TO_DELETE.join(', '));
    console.log('');

    // Find vouchers with these voucher numbers
    const vouchersToDelete = await Voucher.find({
      'rawOriginal.Voucher_Number': { $in: VOUCHERS_TO_DELETE }
    });

    if (vouchersToDelete.length === 0) {
      console.log('❌ No matching vouchers found');
      await mongoose.disconnect();
      return;
    }

    console.log(`📋 Found ${vouchersToDelete.length} vouchers to delete:\n`);
    
    vouchersToDelete.forEach((voucher, index) => {
      console.log(`${index + 1}. Voucher: ${voucher.rawOriginal.Voucher_Number}`);
      console.log(`   ID: ${voucher._id}`);
      console.log(`   Date: ${voucher.date || 'N/A'}`);
      console.log(`   Amount: ${voucher.totalAmount || 0}`);
      console.log('');
    });

    const voucherIds = vouchersToDelete.map(v => v._id);

    console.log('🗑️  Deleting related data...\n');

    // Delete related voucher items
    const deletedItems = await VoucherItem.deleteMany({
      voucherId: { $in: voucherIds }
    });
    console.log(`   ✅ Deleted ${deletedItems.deletedCount} voucher items`);

    // Delete related voucher participants
    const deletedParticipants = await VoucherParticipant.deleteMany({
      voucherId: { $in: voucherIds }
    });
    console.log(`   ✅ Deleted ${deletedParticipants.deletedCount} voucher participants`);

    // Delete the vouchers themselves
    const deletedVouchers = await Voucher.deleteMany({
      _id: { $in: voucherIds }
    });
    console.log(`   ✅ Deleted ${deletedVouchers.deletedCount} vouchers\n`);

    console.log('✅ DELETION COMPLETE\n');
    console.log('📊 Summary:');
    console.log(`   Vouchers deleted: ${deletedVouchers.deletedCount}`);
    console.log(`   Items deleted: ${deletedItems.deletedCount}`);
    console.log(`   Participants deleted: ${deletedParticipants.deletedCount}`);
    console.log('');

    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the script
deleteSpecificVouchers();
