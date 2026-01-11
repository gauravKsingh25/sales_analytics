import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Voucher from '../schemas/voucher.js';
import VoucherParticipant from '../schemas/voucherparticipant.js';
import Employee from '../schemas/employee.js';

dotenv.config();

async function testEmptyParties() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Find Rahul Sharma UK
    const rahul = await Employee.findOne({ 
      $or: [
        { name: /Rahul.*Sharma/i },
        { employeeCode: 'EMPBFC7910F' }
      ]
    });
    if (!rahul) {
      console.log('❌ Rahul Sharma not found');
      return;
    }
    console.log(`✅ Found employee: ${rahul.name} (${rahul.employeeCode})\n`);

    // Get vouchers for this employee
    const participants = await VoucherParticipant.find({ employeeId: rahul._id });
    const voucherIds = participants.map(p => p.voucherId);
    
    console.log(`📊 Total voucher participants: ${participants.length}`);
    console.log(`📊 Unique voucher IDs: ${voucherIds.length}\n`);

    const vouchers = await Voucher.find({ _id: { $in: voucherIds } });
    console.log(`📊 Total vouchers found: ${vouchers.length}\n`);

    // Analyze parties
    const partyAnalysis = {
      total: 0,
      withParty: 0,
      emptyParty: 0,
      nullParty: 0,
      whitespaceParty: 0,
      validParty: 0,
      parties: new Map()
    };

    vouchers.forEach(voucher => {
      partyAnalysis.total++;
      const party = voucher.rawOriginal?.Party;
      
      if (party === null || party === undefined) {
        partyAnalysis.nullParty++;
        console.log(`⚠️  Null/undefined party in voucher: ${voucher.voucherNumber}`);
      } else if (party === '') {
        partyAnalysis.emptyParty++;
        console.log(`⚠️  Empty party in voucher: ${voucher.voucherNumber}`);
      } else if (party.trim() === '') {
        partyAnalysis.whitespaceParty++;
        console.log(`⚠️  Whitespace-only party in voucher: ${voucher.voucherNumber}, raw: "${party}"`);
      } else {
        partyAnalysis.validParty++;
        const trimmedParty = party.trim();
        if (!partyAnalysis.parties.has(trimmedParty)) {
          partyAnalysis.parties.set(trimmedParty, []);
        }
        partyAnalysis.parties.get(trimmedParty).push(voucher.voucherNumber);
      }
      
      if (party) {
        partyAnalysis.withParty++;
      }
    });

    console.log('\n📈 Party Analysis Summary:');
    console.log('─'.repeat(50));
    console.log(`Total vouchers:          ${partyAnalysis.total}`);
    console.log(`With party field:        ${partyAnalysis.withParty}`);
    console.log(`Null/undefined parties:  ${partyAnalysis.nullParty}`);
    console.log(`Empty string parties:    ${partyAnalysis.emptyParty}`);
    console.log(`Whitespace-only parties: ${partyAnalysis.whitespaceParty}`);
    console.log(`Valid parties:           ${partyAnalysis.validParty}`);
    console.log(`Unique valid parties:    ${partyAnalysis.parties.size}`);

    // Check AARVI SURGICAL specifically
    console.log('\n🔍 Checking AARVI SURGICAL (DEHRADUN):');
    console.log('─'.repeat(50));
    
    const aarviVouchers = vouchers.filter(v => 
      v.rawOriginal?.Party?.toLowerCase().includes('aarvi')
    );
    
    if (aarviVouchers.length > 0) {
      console.log(`✅ Found ${aarviVouchers.length} vouchers with AARVI in party name:`);
      aarviVouchers.forEach(v => {
        console.log(`   - ${v.voucherNumber}: "${v.rawOriginal.Party}", Amount: ₹${v.totalAmount}, Type: ${v.rawOriginal.Vch_Type}`);
      });
    } else {
      console.log('❌ No vouchers found with AARVI in party name');
      
      // Check if it's due to whitespace or case sensitivity
      const suspiciousParties = Array.from(partyAnalysis.parties.keys())
        .filter(p => p.toUpperCase().includes('AARVI') || p.includes('DEHRADUN'));
      
      if (suspiciousParties.length > 0) {
        console.log('\n⚠️  Found suspicious parties (case/whitespace):');
        suspiciousParties.forEach(p => {
          console.log(`   - "${p}" (${partyAnalysis.parties.get(p).length} vouchers)`);
        });
      }
    }

    // List all unique parties
    console.log('\n📋 All Unique Parties:');
    console.log('─'.repeat(50));
    const sortedParties = Array.from(partyAnalysis.parties.keys()).sort();
    sortedParties.forEach((party, index) => {
      const count = partyAnalysis.parties.get(party).length;
      console.log(`${index + 1}. ${party} (${count} voucher${count > 1 ? 's' : ''})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

testEmptyParties();
