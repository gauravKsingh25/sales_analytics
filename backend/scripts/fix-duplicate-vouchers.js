import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixDuplicates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const vouchers = db.collection('vouchers');

    // Find duplicates
    console.log('Finding duplicate voucherNumbers...');
    const duplicates = await vouchers.aggregate([
      {
        $group: {
          _id: '$voucherNumber',
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]).toArray();

    console.log(`Found ${duplicates.length} duplicate voucherNumbers\n`);

    if (duplicates.length === 0) {
      console.log('✅ No duplicates found!');
      return;
    }

    // Show duplicates
    for (const dup of duplicates.slice(0, 10)) {
      console.log(`VoucherNumber: "${dup._id}" appears ${dup.count} times`);
    }

    console.log('\nFixing duplicates by appending suffix to duplicates...\n');

    let fixed = 0;
    for (const dup of duplicates) {
      const docs = await vouchers.find({ voucherNumber: dup._id }).toArray();
      
      // Keep first one as is, append suffix to others
      for (let i = 1; i < docs.length; i++) {
        const newVoucherNumber = `${dup._id}_dup${i}`;
        await vouchers.updateOne(
          { _id: docs[i]._id },
          { $set: { voucherNumber: newVoucherNumber } }
        );
        fixed++;
        console.log(`  Fixed: "${dup._id}" -> "${newVoucherNumber}"`);
      }
    }

    console.log(`\n✅ Fixed ${fixed} duplicate vouchers!`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

fixDuplicates();
