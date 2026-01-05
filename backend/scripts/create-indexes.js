import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function createIndexes() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    console.log('Creating indexes...\n');

    // Voucher indexes (already exist in schema)
    console.log('Creating indexes on vouchers collection...');
    
    // Drop existing voucherNumber index and recreate as unique
    try {
      await db.collection('vouchers').dropIndex('voucherNumber_1');
      console.log('  Dropped old voucherNumber index');
    } catch (e) {
      // Index might not exist
    }
    
    await db.collection('vouchers').createIndex({ voucherNumber: 1 }, { unique: true });
    await db.collection('vouchers').createIndex({ companyId: 1, date: 1 });
    await db.collection('vouchers').createIndex({ dedupeHash: 1 }, { unique: true });
    await db.collection('vouchers').createIndex({ date: -1 }); // For sorting
    await db.collection('vouchers').createIndex({ totalAmount: 1 }); // For amount filters
    console.log('✓ Voucher indexes created');

    // VoucherItem indexes
    console.log('Creating indexes on voucheritems collection...');
    await db.collection('voucheritems').createIndex({ voucherId: 1 });
    console.log('✓ VoucherItem indexes created');

    // VoucherParticipant indexes
    console.log('Creating indexes on voucherparticipants collection...');
    await db.collection('voucherparticipants').createIndex({ voucherId: 1 });
    await db.collection('voucherparticipants').createIndex({ employeeId: 1 });
    console.log('✓ VoucherParticipant indexes created');

    // Employee indexes
    console.log('Creating indexes on employees collection...');
    try {
      await db.collection('employees').createIndex({ normalizedName: 1 }, { unique: true, sparse: true });
    } catch (e) {
      if (e.code !== 86) throw e; // Ignore if index already exists
    }
    try {
      await db.collection('employees').createIndex({ employeeCode: 1 });
    } catch (e) {
      if (e.code !== 86) throw e; // Ignore if index already exists
    }
    console.log('✓ Employee indexes created');

    // Company indexes
    console.log('Creating indexes on companies collection...');
    try {
      await db.collection('companies').createIndex({ normalizedName: 1 }, { unique: true, sparse: true });
    } catch (e) {
      if (e.code !== 86) throw e; // Ignore if index already exists
    }
    console.log('✓ Company indexes created');

    console.log('\n✅ All indexes created successfully!');
    
    // Show all indexes
    console.log('\nExisting indexes:');
    const collections = ['vouchers', 'voucheritems', 'voucherparticipants', 'employees', 'companies'];
    for (const collName of collections) {
      const indexes = await db.collection(collName).indexes();
      console.log(`\n${collName}:`);
      indexes.forEach(idx => {
        console.log(`  - ${JSON.stringify(idx.key)} ${idx.unique ? '(unique)' : ''}`);
      });
    }

  } catch (error) {
    console.error('❌ Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

createIndexes();
