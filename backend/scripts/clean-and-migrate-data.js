/**
 * Data Manipulation Script
 * 
 * This script provides utilities to:
 * 1. Clean MongoDB database completely
 * 2. Ensure all voucher JSON data is preserved without loss
 * 3. Make all object key-value pairs unique within each voucher (party 1, party 2, etc.)
 * 
 * Usage:
 *   node scripts/clean-and-migrate-data.js --clean           # Clean all data
 *   node scripts/clean-and-migrate-data.js --verify          # Verify data integrity
 *   node scripts/clean-and-migrate-data.js --fix-duplicates  # Fix duplicate keys in existing vouchers
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Company from '../schemas/company.js';
import CompanySales from '../schemas/companysales.js';
import Employee from '../schemas/employee.js';
import EmployeeCandidate from '../schemas/employeecandidate.js';
import EmployeePerformance from '../schemas/employeeperformance.js';
import Upload from '../schemas/upload.js';
import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';
import VoucherParticipant from '../schemas/voucherparticipant.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

/**
 * Clean the entire MongoDB database
 * Drops all collections completely (removes schemas and data)
 */
async function cleanDatabase() {
  console.log('🧹 Starting complete database cleanup (dropping all collections)...\n');
  
  try {
    // Get all collections in the database
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('⏭️  Database is already empty (no collections found)\n');
      return;
    }

    console.log(`📊 Found ${collections.length} collections to drop:\n`);
    
    for (const collection of collections) {
      try {
        await mongoose.connection.db.dropCollection(collection.name);
        console.log(`✅ Dropped collection: ${collection.name}`);
      } catch (error) {
        console.error(`❌ Error dropping ${collection.name}:`, error.message);
      }
    }

    console.log('\n✨ Database completely cleaned! All collections dropped.\n');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error.message);
    throw error;
  }
}

/**
 * Helper function to make voucher keys unique
 * If a key appears multiple times, rename subsequent ones with counter (party 1, party 2, etc.)
 */
function makeVoucherKeysUnique(voucherData) {
  const clone = JSON.parse(JSON.stringify(voucherData));
  const keyCounts = {};

  // Helper to rename with counter
  function renameWithCounter(value, category) {
    if (!value) return value;
    
    const key = value.toString().trim();
    const trackingKey = `${category}:${key.toLowerCase()}`;
    
    keyCounts[trackingKey] = (keyCounts[trackingKey] || 0) + 1;
    const count = keyCounts[trackingKey];
    
    // First occurrence stays as-is, subsequent ones get numbered
    return count === 1 ? key : `${key} ${count}`;
  }

  // Process Party field
  if (clone.Party) {
    clone.Party = renameWithCounter(clone.Party, 'party');
  }

  // Process Details array
  if (Array.isArray(clone.Details)) {
    clone.Details = clone.Details.map(detail => {
      const newDetail = { ...detail };
      
      if (newDetail.Staff) {
        newDetail.Staff = renameWithCounter(newDetail.Staff, 'staff');
      }
      
      if (newDetail.Account) {
        newDetail.Account = renameWithCounter(newDetail.Account, 'account');
      }
      
      return newDetail;
    });
  }

  return clone;
}

/**
 * Fix duplicate keys in existing vouchers
 * Updates rawUnique field for all vouchers to ensure unique keys
 */
async function fixDuplicateKeys() {
  console.log('🔧 Fixing duplicate keys in existing vouchers...\n');
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const vouchers = await Voucher.find({}).session(session);
    console.log(`📊 Found ${vouchers.length} vouchers to process\n`);

    let updated = 0;
    let errors = [];

    for (const voucher of vouchers) {
      try {
        // Get the original raw data
        const rawOriginal = voucher.rawOriginal;
        
        // Create new unique version
        const rawUnique = makeVoucherKeysUnique(rawOriginal);
        
        // Check if it actually changed
        const originalStr = JSON.stringify(voucher.rawUnique);
        const newStr = JSON.stringify(rawUnique);
        
        if (originalStr !== newStr) {
          // Update the voucher
          await Voucher.findByIdAndUpdate(
            voucher._id,
            { rawUnique },
            { session }
          );
          
          updated++;
          console.log(`✅ Updated voucher ${voucher.voucherNumber} (${voucher._id})`);
        }
      } catch (error) {
        const errorMsg = `Error processing voucher ${voucher.voucherNumber}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    await session.commitTransaction();
    
    console.log(`\n📈 Summary:`);
    console.log(`   Total vouchers: ${vouchers.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Unchanged: ${vouchers.length - updated}`);
    console.log(`   Errors: ${errors.length}\n`);

    if (errors.length > 0) {
      console.log('⚠️  Errors encountered:');
      errors.forEach(err => console.log(`   - ${err}`));
    }
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Transaction failed:', error.message);
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Verify data integrity
 * Checks that all vouchers have proper rawOriginal and rawUnique fields
 */
async function verifyDataIntegrity() {
  console.log('🔍 Verifying data integrity...\n');

  const vouchers = await Voucher.find({});
  console.log(`📊 Checking ${vouchers.length} vouchers\n`);

  let issues = [];

  for (const voucher of vouchers) {
    // Check rawOriginal exists
    if (!voucher.rawOriginal || Object.keys(voucher.rawOriginal).length === 0) {
      issues.push(`Voucher ${voucher.voucherNumber} (${voucher._id}) missing rawOriginal`);
    }

    // Check rawUnique exists
    if (!voucher.rawUnique || Object.keys(voucher.rawUnique).length === 0) {
      issues.push(`Voucher ${voucher.voucherNumber} (${voucher._id}) missing rawUnique`);
    }

    // Check for duplicate keys within rawUnique
    if (voucher.rawUnique) {
      const keyCounts = {};
      
      // Check Party
      if (voucher.rawUnique.Party) {
        const key = voucher.rawUnique.Party.toLowerCase();
        keyCounts[key] = (keyCounts[key] || 0) + 1;
      }

      // Check Details
      if (Array.isArray(voucher.rawUnique.Details)) {
        voucher.rawUnique.Details.forEach(detail => {
          if (detail.Staff) {
            const key = detail.Staff.toLowerCase();
            keyCounts[key] = (keyCounts[key] || 0) + 1;
          }
          if (detail.Account) {
            const key = detail.Account.toLowerCase();
            keyCounts[key] = (keyCounts[key] || 0) + 1;
          }
        });
      }

      // Find duplicates (count > 1 and doesn't have counter)
      for (const [key, count] of Object.entries(keyCounts)) {
        if (count > 1) {
          // Check if this is actually numbered (e.g., "party 2")
          const hasNumber = /\s+\d+$/.test(key);
          if (!hasNumber) {
            issues.push(`Voucher ${voucher.voucherNumber} has duplicate key: ${key} (appears ${count} times)`);
          }
        }
      }
    }
  }

  console.log(`\n📈 Verification Summary:`);
  console.log(`   Total vouchers: ${vouchers.length}`);
  console.log(`   Issues found: ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('⚠️  Issues detected:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n💡 Run with --fix-duplicates to fix these issues');
  } else {
    console.log('✅ All vouchers have valid data structure!');
  }
}

/**
 * Backup existing data to JSON files before cleanup
 */
async function backupData() {
  console.log('💾 Backing up existing data...\n');

  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `backup-${timestamp}`);
  fs.mkdirSync(backupPath, { recursive: true });

  const collections = [
    { name: 'vouchers', model: Voucher },
    { name: 'voucher-items', model: VoucherItem },
    { name: 'voucher-participants', model: VoucherParticipant },
    { name: 'employees', model: Employee },
    { name: 'companies', model: Company },
    { name: 'uploads', model: Upload },
  ];

  for (const { name, model } of collections) {
    try {
      const data = await model.find({}).lean();
      const filePath = path.join(backupPath, `${name}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✅ Backed up ${data.length} ${name}`);
    } catch (error) {
      console.error(`❌ Error backing up ${name}:`, error.message);
    }
  }

  console.log(`\n✨ Backup saved to: ${backupPath}\n`);
  return backupPath;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
📋 Data Manipulation Script

Usage:
  node scripts/clean-and-migrate-data.js [options]

Options:
  --clean            Clean all data from MongoDB database
  --verify           Verify data integrity (check for issues)
  --fix-duplicates   Fix duplicate keys in existing vouchers
  --backup           Backup all data to JSON files
  --help             Show this help message

Examples:
  node scripts/clean-and-migrate-data.js --backup --clean
  node scripts/clean-and-migrate-data.js --verify
  node scripts/clean-and-migrate-data.js --fix-duplicates
    `);
    process.exit(0);
  }

  try {
    // Connect to MongoDB
    console.log(`🔌 Connecting to MongoDB...`);
    console.log(`📍 Database: ${MONGO_URI.split('@')[1]?.split('?')[0] || 'Unknown'}\n`);
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📦 Database name: ${mongoose.connection.db.databaseName}\n`);

    // Process commands
    if (args.includes('--backup')) {
      await backupData();
    }

    if (args.includes('--clean')) {
      await cleanDatabase();
    }

    if (args.includes('--verify')) {
      await verifyDataIntegrity();
    }

    if (args.includes('--fix-duplicates')) {
      await fixDuplicateKeys();
    }

    // Close connection
    await mongoose.connection.close();
    console.log('👋 Database connection closed\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && (import.meta.url.endsWith(process.argv[1]) || process.argv[1].includes('clean-and-migrate-data.js'))) {
  main();
}

export {
  cleanDatabase,
  verifyDataIntegrity,
  fixDuplicateKeys,
  backupData,
  makeVoucherKeysUnique
};
