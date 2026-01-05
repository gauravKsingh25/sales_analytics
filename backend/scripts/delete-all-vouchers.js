import mongoose from 'mongoose';
import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';
import VoucherParticipant from '../schemas/voucherparticipant.js';
import '../src/db/mongoose.js';

async function deleteAllVouchers() {
  try {
    console.log('Starting voucher deletion process...\n');

    // Count before deletion
    const voucherCount = await Voucher.countDocuments();
    const itemCount = await VoucherItem.countDocuments();
    const participantCount = await VoucherParticipant.countDocuments();

    console.log(`Found ${voucherCount} vouchers`);
    console.log(`Found ${itemCount} voucher items`);
    console.log(`Found ${participantCount} voucher participants\n`);

    // Delete all voucher-related data
    console.log('Deleting voucher participants...');
    const participantResult = await VoucherParticipant.deleteMany({});
    console.log(`✓ Deleted ${participantResult.deletedCount} voucher participants`);

    console.log('Deleting voucher items...');
    const itemResult = await VoucherItem.deleteMany({});
    console.log(`✓ Deleted ${itemResult.deletedCount} voucher items`);

    console.log('Deleting vouchers...');
    const voucherResult = await Voucher.deleteMany({});
    console.log(`✓ Deleted ${voucherResult.deletedCount} vouchers`);

    console.log('\n✅ All voucher data has been deleted successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting vouchers:', error);
    process.exit(1);
  }
}

deleteAllVouchers();
