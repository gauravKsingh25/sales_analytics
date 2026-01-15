/**
 * Classify existing VoucherItem entries with itemType field
 * 
 * This script adds the itemType field to existing items, classifying them as:
 * - 'product': Actual products sold
 * - 'tax': GST and tax-related entries
 * - 'ledger': Accounting ledger entries (SALE, OUTPUT, etc.)
 * 
 * Usage:
 *   node scripts/classify-existing-items.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import VoucherItem from '../schemas/voucheritem.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

/**
 * Classify item type based on description
 */
function classifyItemType(description) {
  if (typeof description !== 'string') return 'product';
  const desc = description.trim();
  
  // Staff names - exclude from product items
  if (/\([A-Z][a-z]*\)/.test(desc)) return 'other'; // Has (XX) pattern
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(desc)) return 'other'; // "Firstname Lastname"
  if (/^[A-Z]+\s+\(/.test(desc)) return 'other'; // "FIRSTNAME (Location)"
  if (/\s+(Uk|Ap|Mh|Guj|CHD|KA|J&K|Head|Delhi|Mumbai)\s*$/i.test(desc)) return 'other'; // Ends with location code
  
  // Tax and GST entries
  if (/GST|CGST|SGST|IGST|CESS|TCS|TDS/i.test(desc)) return 'tax';
  
  // Ledger/accounting entries
  if (/SALE|OUTPUT|INPUT|^(LOCAL|DIRECT|INTERSTATE)/i.test(desc)) return 'ledger';
  if (/R\.OFF|ROUND|ROUNDING|FREIGHT|TRANSPORT|DISCOUNT/i.test(desc)) return 'ledger';
  if (/CASH|BANK|ACCOUNT/i.test(desc)) return 'ledger';
  
  // Default to product
  return 'product';
}

async function classifyItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all items
    const allItems = await VoucherItem.find({}).lean();
    console.log(`📊 Total items in database: ${allItems.length}`);
    
    // Classify and group by type
    const classification = {
      product: 0,
      tax: 0,
      ledger: 0,
      other: 0
    };

    console.log('\n🏷️  Classifying items...');
    
    // Update in batches
    const batchSize = 100;
    let updated = 0;
    
    for (let i = 0; i < allItems.length; i += batchSize) {
      const batch = allItems.slice(i, i + batchSize);
      
      const bulkOps = batch.map(item => {
        const itemType = classifyItemType(item.description);
        classification[itemType]++;
        
        return {
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { itemType } }
          }
        };
      });

      await VoucherItem.bulkWrite(bulkOps);
      updated += batch.length;
      
      if (updated % 1000 === 0) {
        console.log(`   Processed ${updated}/${allItems.length} items...`);
      }
    }

    console.log(`\n✅ Updated ${updated} items with classifications:`);
    console.log(`   📦 Products: ${classification.product}`);
    console.log(`   💰 Tax entries: ${classification.tax}`);
    console.log(`   📒 Ledger entries: ${classification.ledger}`);
    console.log(`   ❓ Other: ${classification.other}`);
    
    // Show sample items by type
    console.log('\n📋 Sample items by type:');
    
    for (const type of ['product', 'tax', 'ledger']) {
      const samples = await VoucherItem.find({ itemType: type })
        .limit(5)
        .select('description itemType')
        .lean();
      
      if (samples.length > 0) {
        console.log(`\n   ${type.toUpperCase()}:`);
        samples.forEach(s => console.log(`      - ${s.description}`));
      }
    }

    console.log('\n✅ Classification complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

classifyItems();
