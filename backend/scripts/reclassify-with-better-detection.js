/**
 * Re-classify items with improved staff name detection
 * 
 * This script improves the classification by analyzing duplicate patterns
 * within vouchers - if the same name appears multiple times in a voucher,
 * it's likely a staff name, not a product
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import VoucherItem from '../schemas/voucheritem.js';
import Voucher from '../schemas/voucher.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

/**
 * Improved classification with duplicate detection
 */
function classifyItemType(description, isDuplicate = false) {
  if (typeof description !== 'string') return 'product';
  const desc = description.trim();
  
  // Tax and GST entries - check FIRST before other patterns
  if (/GST|CGST|SGST|IGST|CESS|TCS|TDS/i.test(desc)) return 'tax';
  
  // Ledger/accounting entries
  if (/SALE$|OUTPUT$|INPUT$/i.test(desc)) return 'ledger';
  if (/^(LOCAL|DIRECT|INTERSTATE)/i.test(desc)) return 'ledger';
  if (/R\.OFF|ROUND|ROUNDING|FREIGHT|TRANSPORT|DISCOUNT/i.test(desc)) return 'ledger';
  if (/CASH|BANK|ACCOUNT/i.test(desc)) return 'ledger';
  
  // If this description appears multiple times in same voucher, likely staff name
  if (isDuplicate) return 'other';
  
  // Remove trailing numbers for pattern matching (MANI VANNAN 2 -> MANI VANNAN)
  const descWithoutNumbers = desc.replace(/\s+\d+$/, '');
  
  // All caps single words or abbreviations - likely not products
  if (/^[A-Z]{2,}$/.test(descWithoutNumbers) && descWithoutNumbers.length < 10) return 'other';
  
  // Staff name patterns - names with locations
  if (/\([A-Z&\s]+\)/.test(descWithoutNumbers)) {
    // Check if it contains state/city names
    if (/\((West Bengal|Karnataka|Maharashtra|Punjab|Jammu|UP|Delhi|Mumbai|Bengalore|Hyderabad|Chennai|J&K|KA|Mh|Ap|Uk|Guj|CHD|DL|WB|TN|RJ)\)/i.test(descWithoutNumbers)) {
      return 'other';
    }
  }
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(descWithoutNumbers)) return 'other'; // "Firstname Lastname"
  if (/^[A-Z\s]+\s+(Uk|Ap|Mh|Guj|CHD|KA|J&K|UP|DL|Head|Delhi|Mumbai)$/i.test(descWithoutNumbers)) return 'other';
  
  // Two or three word names (common staff pattern)
  const words = descWithoutNumbers.split(/\s+/);
  if (words.length === 2 || words.length === 3) {
    // Check if it looks like a person name
    const hasCapitalizedWords = words.every(w => /^[A-Z]/.test(w));
    const hasLocationCode = /Uk|Ap|Mh|Guj|CHD|KA|J&K|UP|DL|Head|Delhi|Mumbai/i.test(descWithoutNumbers);
    const hasCommonIndianNames = /MANI|VINOD|VISHWASH|ALOK|HANEES|SHUBHAM|Rahul|Venkatesh|Naresh|NIlesh/i.test(descWithoutNumbers);
    
    if (hasCapitalizedWords && (hasLocationCode || hasCommonIndianNames || words.length === 2)) {
      return 'other';
    }
  }
  
  // Default to product
  return 'product';
}

async function reclassifyItems() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all vouchers with their items
    console.log('📊 Analyzing voucher items for duplicates...');
    const vouchers = await Voucher.find({}).select('_id').lean();
    
    const classification = {
      product: 0,
      tax: 0,
      ledger: 0,
      other: 0
    };

    let processed = 0;
    const batchSize = 50;

    for (let i = 0; i < vouchers.length; i += batchSize) {
      const batch = vouchers.slice(i, i + batchSize);
      
      for (const voucher of batch) {
        // Get all items for this voucher
        const items = await VoucherItem.find({ voucherId: voucher._id }).lean();
        
        // Count duplicates
        const descriptionCounts = {};
        items.forEach(item => {
          const desc = item.description;
          descriptionCounts[desc] = (descriptionCounts[desc] || 0) + 1;
        });
        
        // Classify and update each item
        const bulkOps = items.map(item => {
          const isDuplicate = descriptionCounts[item.description] > 1;
          const itemType = classifyItemType(item.description, isDuplicate);
          classification[itemType]++;
          
          return {
            updateOne: {
              filter: { _id: item._id },
              update: { $set: { itemType } }
            }
          };
        });

        if (bulkOps.length > 0) {
          await VoucherItem.bulkWrite(bulkOps);
        }
        
        processed++;
      }
      
      if (processed % 100 === 0) {
        console.log(`   Processed ${processed}/${vouchers.length} vouchers...`);
      }
    }

    console.log(`\n✅ Re-classified items in ${processed} vouchers:`);
    console.log(`   📦 Products: ${classification.product}`);
    console.log(`   💰 Tax entries: ${classification.tax}`);
    console.log(`   📒 Ledger entries: ${classification.ledger}`);
    console.log(`   ❓ Other (staff names): ${classification.other}`);
    
    // Show sample products
    console.log('\n📋 Sample PRODUCT items:');
    const productSamples = await VoucherItem.find({ itemType: 'product' })
      .limit(20)
      .select('description')
      .lean();
    productSamples.forEach(s => console.log(`      - ${s.description}`));

    console.log('\n👤 Sample OTHER (staff) items:');
    const otherSamples = await VoucherItem.find({ itemType: 'other' })
      .limit(20)
      .select('description')
      .lean();
    otherSamples.forEach(s => console.log(`      - ${s.description}`));

    console.log('\n✅ Re-classification complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

reclassifyItems();
