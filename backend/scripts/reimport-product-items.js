/**
 * Delete existing items and re-import product items
 * This will replace account-based items with actual product items
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';

import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';

dotenv.config({ path: path.resolve('backend', '.env') });
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

const stats = {
  vouchersProcessed: 0,
  itemsDeleted: 0,
  itemsAdded: 0,
  errors: []
};

async function reimportItems(jsonFilename) {
  try {
    // Read JSON file
    const jsonPath = path.join('backend/uploads/item included vouchers', jsonFilename);
    console.log(`📖 Reading: ${jsonPath}\n`);
    
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`✅ Loaded ${jsonData.length} vouchers from JSON\n`);
    
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');
    
    console.log('🔄 Starting re-import process...\n');
    console.log('='.repeat(80));
    
    // Process each voucher
    for (const voucherData of jsonData) {
      const voucherNumber = voucherData.Voucher_Number;
      
      if (!voucherNumber || voucherNumber === 'Total:') continue;
      
      stats.vouchersProcessed++;
      
      // Find voucher in database
      const voucher = await Voucher.findOne({ voucherNumber });
      
      if (!voucher) {
        stats.errors.push(`Voucher ${voucherNumber} not found`);
        continue;
      }
      
      if (!voucherData.Items || voucherData.Items.length === 0) {
        continue;
      }
      
      // Delete existing items for this voucher
      const deleteResult = await VoucherItem.deleteMany({ voucherId: voucher._id });
      stats.itemsDeleted += deleteResult.deletedCount;
      
      // Add new product items
      const itemsToInsert = voucherData.Items.map(item => ({
        voucherId: voucher._id,
        description: item.description || 'Unknown Item',
        qty: item.qty || 0,
        unitPrice: item.unitPrice || 0,
        amount: item.amount || 0,
        unit: item.unit || null,
        hsn: null
      }));
      
      await VoucherItem.insertMany(itemsToInsert);
      stats.itemsAdded += itemsToInsert.length;
      
      if (stats.vouchersProcessed % 50 === 0) {
        console.log(`   Processed ${stats.vouchersProcessed} vouchers...`);
      }
    }
    
    console.log('='.repeat(80));
    console.log('\n📊 SUMMARY:\n');
    console.log(`   Vouchers processed:  ${stats.vouchersProcessed}`);
    console.log(`   Old items deleted:   ${stats.itemsDeleted}`);
    console.log(`   New items added:     ${stats.itemsAdded}`);
    console.log(`   Errors:              ${stats.errors.length}`);
    
    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors:');
      stats.errors.slice(0, 10).forEach(err => console.log(`   - ${err}`));
    }
    
    console.log('\n✅ Re-import complete!\n');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

const filename = process.argv[2] || 'MAR 2025-with-items.json';
reimportItems(filename);
