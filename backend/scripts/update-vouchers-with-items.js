/**
 * Update Existing Vouchers with Items Data
 * 
 * This script reads the JSON file with item details and updates existing vouchers
 * in MongoDB by matching voucher numbers. It adds item records to the VoucherItem
 * collection linked to each voucher.
 * 
 * Usage:
 *   node scripts/update-vouchers-with-items.js <json-filename>
 * 
 * Example:
 *   node scripts/update-vouchers-with-items.js sales-register-with-items.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.resolve('backend', '.env') });

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

// Directory for item-included vouchers
const ITEMS_DIR = path.resolve('backend', 'uploads', 'item included vouchers');

// Verbose logging flag
const VERBOSE = process.argv.includes('--verbose');

/**
 * Statistics tracking
 */
const stats = {
  vouchersProcessed: 0,
  vouchersUpdated: 0,
  vouchersNotFound: 0,
  itemsAdded: 0,
  itemsSkipped: 0,
  errors: []
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
}

/**
 * Update a single voucher with items
 */
async function updateVoucherWithItems(voucherData, session) {
  try {
    stats.vouchersProcessed++;
    
    const voucherNumber = voucherData.Voucher_Number;
    
    if (!voucherNumber) {
      stats.errors.push({
        voucher: 'Unknown',
        error: 'Missing voucher number',
        data: voucherData
      });
      return;
    }
    
    // Find existing voucher by voucher number
    const existingVoucher = await Voucher.findOne({ 
      voucherNumber: voucherNumber 
    }).session(session);
    
    if (!existingVoucher) {
      stats.vouchersNotFound++;
      if (VERBOSE) {
        console.log(`  ⚠️  Voucher not found: ${voucherNumber}`);
      }
      stats.errors.push({
        voucher: voucherNumber,
        error: 'Voucher not found in database',
        party: voucherData.Party
      });
      return;
    }
    
    // Check if items exist
    if (!voucherData.Items || voucherData.Items.length === 0) {
      stats.itemsSkipped++;
      if (VERBOSE) {
        console.log(`  ⏭️  No items for voucher: ${voucherNumber}`);
      }
      return;
    }
    
    // Check if items already exist for this voucher
    const existingItemCount = await VoucherItem.countDocuments({ 
      voucherId: existingVoucher._id 
    }).session(session);
    
    if (existingItemCount > 0) {
      if (VERBOSE) {
        console.log(`  ⏭️  Items already exist for voucher: ${voucherNumber} (${existingItemCount} items)`);
      }
      stats.itemsSkipped += voucherData.Items.length;
      return;
    }
    
    // Add items to VoucherItem collection
    const itemsToInsert = voucherData.Items.map(item => ({
      voucherId: existingVoucher._id,
      description: item.description || 'Unknown Item',
      qty: item.qty || 0,
      unitPrice: item.unitPrice || 0,
      amount: item.amount || 0,
      unit: item.unit || null,
      hsn: null // HSN code can be added later if available
    }));
    
    await VoucherItem.insertMany(itemsToInsert, { session });
    
    stats.vouchersUpdated++;
    stats.itemsAdded += itemsToInsert.length;
    
    if (VERBOSE) {
      console.log(`  ✅ Updated ${voucherNumber} with ${itemsToInsert.length} items`);
    } else if (stats.vouchersProcessed % 10 === 0) {
      console.log(`  Processed ${stats.vouchersProcessed} vouchers...`);
    }
    
  } catch (error) {
    stats.errors.push({
      voucher: voucherData.Voucher_Number || 'Unknown',
      error: error.message,
      party: voucherData.Party
    });
    
    if (VERBOSE) {
      console.error(`  ❌ Error updating ${voucherData.Voucher_Number}:`, error.message);
    }
  }
}

/**
 * Process all vouchers from JSON file
 */
async function processVouchers(jsonData) {
  console.log(`\n📦 Processing ${jsonData.length} vouchers...`);
  
  // Use transaction for data consistency
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      for (const voucherData of jsonData) {
        await updateVoucherWithItems(voucherData, session);
      }
    });
    
    console.log('\n✅ Transaction completed successfully');
    
  } catch (error) {
    console.error('\n❌ Transaction failed:', error.message);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Print summary statistics
 */
function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Vouchers processed:     ${stats.vouchersProcessed}`);
  console.log(`Vouchers updated:       ${stats.vouchersUpdated}`);
  console.log(`Vouchers not found:     ${stats.vouchersNotFound}`);
  console.log(`Items added:            ${stats.itemsAdded}`);
  console.log(`Items skipped:          ${stats.itemsSkipped}`);
  console.log(`Errors:                 ${stats.errors.length}`);
  console.log('='.repeat(60));
  
  if (stats.errors.length > 0) {
    console.log('\n⚠️  ERRORS:');
    stats.errors.forEach((err, idx) => {
      console.log(`\n${idx + 1}. Voucher: ${err.voucher}`);
      if (err.party) console.log(`   Party: ${err.party}`);
      console.log(`   Error: ${err.error}`);
    });
  }
  
  if (stats.vouchersUpdated > 0) {
    console.log('\n✅ Successfully updated vouchers with items!');
    console.log(`\n💡 You can now modify your frontend/backend code to display items`);
    console.log(`   VoucherItem records are linked to Voucher via voucherId field`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get filename from command line argument
    const filename = process.argv[2];
    
    if (!filename) {
      console.error('❌ Please provide JSON filename as argument');
      console.log('\nUsage: node scripts/update-vouchers-with-items.js <filename.json>');
      console.log('Example: node scripts/update-vouchers-with-items.js sales-register-with-items.json');
      console.log('\nFirst run: node scripts/convert-items-excel-to-json.js <excel-file.xlsx>');
      process.exit(1);
    }
    
    // Check if file exists
    const filePath = path.join(ITEMS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.log(`\nPlease place your JSON file in: ${ITEMS_DIR}`);
      console.log(`Or run the conversion script first:`);
      console.log(`  node scripts/convert-items-excel-to-json.js <excel-file.xlsx>`);
      process.exit(1);
    }
    
    // Read JSON file
    console.log(`📖 Reading JSON file: ${filePath}`);
    const jsonContent = fs.readFileSync(filePath, 'utf-8');
    const jsonData = JSON.parse(jsonContent);
    
    if (!Array.isArray(jsonData)) {
      console.error('❌ JSON file must contain an array of vouchers');
      process.exit(1);
    }
    
    console.log(`✅ Loaded ${jsonData.length} vouchers from JSON`);
    
    // Show sample
    if (jsonData.length > 0) {
      const sample = jsonData[0];
      console.log(`\n🔍 Sample voucher:`);
      console.log(`   Voucher Number: ${sample.Voucher_Number}`);
      console.log(`   Party: ${sample.Party}`);
      console.log(`   Items: ${sample.Items ? sample.Items.length : 0}`);
      if (sample.Items && sample.Items.length > 0) {
        console.log(`   First item: ${sample.Items[0].description}`);
      }
    }
    
    // Connect to database
    await connectDB();
    
    // Process vouchers
    await processVouchers(jsonData);
    
    // Print summary
    printSummary();
    
    // Disconnect
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
