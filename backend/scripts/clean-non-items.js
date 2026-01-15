/**
 * Clean up non-item entries from VoucherItem collection
 * 
 * This script removes tax/accounting terms that were incorrectly stored as items
 * Examples: "IGST SALE", "LOCAL SALE", "DIRECT", "IGST OUTPUT", etc.
 * 
 * Usage:
 *   node scripts/clean-non-items.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import VoucherItem from '../schemas/voucheritem.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// Patterns to match non-item entries
const NON_ITEM_PATTERNS = [
  /SALE$/i,
  /OUTPUT$/i,
  /INPUT$/i,
  /^GST/i,
  /^CGST/i,
  /^SGST/i,
  /^IGST/i,
  /^CESS/i,
  /^TCS/i,
  /^TDS/i,
  /ROUND/i,
  /FREIGHT/i,
  /DISCOUNT/i,
  /^CASH/i,
  /^BANK/i,
  /^LOCAL SALE$/i,
  /^DIRECT$/i,
  /^INTERSTATE/i,
  /^CENTRAL TAX/i,
  /^STATE TAX/i,
  /R\.OFF/i
];

async function cleanNonItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find all items that match non-item patterns
    const allItems = await VoucherItem.find({}).select('description').lean();
    
    console.log(`📊 Total items in database: ${allItems.length}`);
    
    const itemsToDelete = allItems.filter(item => {
      const desc = item.description;
      return NON_ITEM_PATTERNS.some(pattern => pattern.test(desc));
    });

    console.log(`🗑️  Found ${itemsToDelete.length} non-item entries to delete:\n`);
    
    // Group by description and count
    const grouped = itemsToDelete.reduce((acc, item) => {
      const desc = item.description;
      acc[desc] = (acc[desc] || 0) + 1;
      return acc;
    }, {});

    // Show what will be deleted
    Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .forEach(([desc, count]) => {
        console.log(`   ${desc}: ${count} entries`);
      });

    console.log('\n⏳ Deleting non-item entries...');
    
    const result = await VoucherItem.deleteMany({
      _id: { $in: itemsToDelete.map(item => item._id) }
    });

    console.log(`✅ Deleted ${result.deletedCount} non-item entries`);
    
    const remaining = await VoucherItem.countDocuments();
    console.log(`📊 Remaining items: ${remaining}`);
    
    console.log('\n✅ Cleanup complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

cleanNonItems();
