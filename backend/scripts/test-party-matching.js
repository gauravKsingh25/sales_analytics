import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Voucher from '../schemas/voucher.js';
import CreditNote from '../schemas/creditnote.js';

dotenv.config();

async function testPartyMatching() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    const testPartyName = 'AARVI SURGICAL (DEHRADUN)';
    
    console.log(`🔍 Testing party: "${testPartyName}"\n`);

    // Test exact match
    console.log('1️⃣ Testing exact match:');
    const exactMatch = await Voucher.find({
      'rawOriginal.Party': testPartyName
    }).limit(5);
    console.log(`   Found ${exactMatch.length} vouchers with exact match`);
    if (exactMatch.length > 0) {
      console.log(`   Example: ${exactMatch[0].voucherNumber}`);
    }

    // Test case-insensitive regex (current implementation)
    console.log('\n2️⃣ Testing regex with ^$ anchors (current API):');
    const regexMatch = await Voucher.find({
      'rawOriginal.Party': { $regex: new RegExp(`^${testPartyName}$`, 'i') }
    }).limit(5);
    console.log(`   Found ${regexMatch.length} vouchers with regex ^$`);
    if (regexMatch.length > 0) {
      console.log(`   Example: ${regexMatch[0].voucherNumber}`);
    }

    // Test without anchors
    console.log('\n3️⃣ Testing regex WITHOUT anchors:');
    const regexNoAnchor = await Voucher.find({
      'rawOriginal.Party': { $regex: new RegExp(testPartyName, 'i') }
    }).limit(5);
    console.log(`   Found ${regexNoAnchor.length} vouchers with regex (no anchors)`);

    // Check for variations in party name
    console.log('\n4️⃣ Checking all AARVI variations in database:');
    const allAarvi = await Voucher.aggregate([
      {
        $match: {
          'rawOriginal.Party': { $regex: /aarvi/i }
        }
      },
      {
        $group: {
          _id: '$rawOriginal.Party',
          count: { $sum: 1 },
          example: { $first: '$voucherNumber' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);
    
    console.log(`   Found ${allAarvi.length} variation(s):`);
    allAarvi.forEach(variant => {
      console.log(`   - "${variant._id}" (${variant.count} vouchers, e.g., ${variant.example})`);
      console.log(`     Length: ${variant._id?.length}, Has extra spaces: ${variant._id !== variant._id?.trim()}`);
    });

    // Check credit notes
    console.log('\n5️⃣ Checking credit notes for AARVI:');
    const creditNotes = await CreditNote.find({
      party: { $regex: /aarvi/i }
    });
    console.log(`   Found ${creditNotes.length} credit notes`);
    if (creditNotes.length > 0) {
      const uniqueParties = [...new Set(creditNotes.map(cn => cn.party))];
      uniqueParties.forEach(p => {
        console.log(`   - "${p}"`);
      });
    }

    // Test the exact API query
    console.log('\n6️⃣ Simulating API query (with URL encoding):');
    const encodedParty = encodeURIComponent(testPartyName);
    const decodedParty = decodeURIComponent(encodedParty);
    console.log(`   Original: "${testPartyName}"`);
    console.log(`   Encoded: "${encodedParty}"`);
    console.log(`   Decoded: "${decodedParty}"`);
    console.log(`   Are they equal? ${testPartyName === decodedParty}`);

    const apiSimulation = await Voucher.find({
      'rawOriginal.Party': { $regex: new RegExp(`^${decodedParty}$`, 'i') }
    });
    console.log(`   API simulation found: ${apiSimulation.length} vouchers`);

    // Test with escaped regex
    console.log('\n7️⃣ Testing with ESCAPED regex (THE FIX):');
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedParty = escapeRegex(decodedParty);
    console.log(`   Escaped party: "${escapedParty}"`);
    
    const escapedMatch = await Voucher.find({
      'rawOriginal.Party': { $regex: new RegExp(`^${escapedParty}$`, 'i') }
    });
    console.log(`   ✅ Found ${escapedMatch.length} vouchers with escaped regex!`);
    
    if (escapedMatch.length > 0) {
      console.log(`   Examples:`);
      escapedMatch.slice(0, 3).forEach(v => {
        console.log(`      - ${v.voucherNumber}: ₹${v.totalAmount}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testPartyMatching();
