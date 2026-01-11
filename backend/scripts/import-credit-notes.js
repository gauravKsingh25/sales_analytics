import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import CreditNote from '../schemas/creditnote.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI;
const CREDIT_NOTES_FILE = path.join(__dirname, '../uploads/credit notes/credit note 1-4-24 to 31-3-25.json');

function generateHash(cn) {
  return crypto.createHash('sha256').update(
    `${cn.Credit_Note_Number}|${cn.Date_iso}|${cn.Party}|${cn.Credit_Amount}`
  ).digest('hex');
}

async function main() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('  CREDIT NOTES IMPORT - TALLY SOFTWARE');
  console.log('='.repeat(60) + '\n');

  try {
    // Connect
    console.log('[1/4] Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI);
    console.log('      ✓ Connected successfully!\n');

    // Load file
    console.log('[2/4] Loading credit notes from JSON...');
    const creditNotes = JSON.parse(fs.readFileSync(CREDIT_NOTES_FILE, 'utf-8'));
    console.log(`      ✓ Loaded ${creditNotes.length} credit notes\n`);

    // Process
    console.log('[3/4] Importing to database...');
    
    let inserted = 0, duplicates = 0, errors = 0;
    let totalAmount = 0, active = 0, cancelled = 0;

    for (let i = 0; i < creditNotes.length; i++) {
      const cn = creditNotes[i];
      
      try {
        const hash = generateHash(cn);
        
        const exists = await CreditNote.findOne({ dedupeHash: hash });
        if (exists) {
          duplicates++;
          continue;
        }

        const details = (cn.Details || []).map(d => ({
          staff: d.Staff,
          account: d.Account,
          amount: d.Amount || 0
        })).filter(d => d.staff || d.account);

        if (cn.Is_Cancelled) {
          cancelled++;
        } else {
          active++;
          totalAmount += (cn.Credit_Amount || 0);
        }

        await CreditNote.create({
          creditNoteNumber: cn.Credit_Note_Number,
          originalSalesVoucherNumber: cn.Original_Sales_Voucher_Number,
          date: new Date(cn.Date_iso),
          dateSerial: cn.Date_serial,
          party: cn.Party,
          vchType: 'Credit Note',
          isCancelled: cn.Is_Cancelled || false,
          creditAmount: cn.Credit_Amount || 0,
          details,
          meta: {
            enteredBy: cn.Meta?.Entered_By,
            grnNo: cn.Meta?.GRN_No,
            source: 'Tally Export'
          },
          rawOriginal: cn,
          dedupeHash: hash
        });

        inserted++;
        
        if ((i + 1) % 100 === 0 || (i + 1) === creditNotes.length) {
          const pct = Math.floor(((i + 1) / creditNotes.length) * 100);
          process.stdout.write(`\r      Progress: ${i + 1}/${creditNotes.length} (${pct}%) - Inserted: ${inserted}, Duplicates: ${duplicates}`);
        }

      } catch (err) {
        errors++;
      }
    }
    
    console.log('\n      ✓ Import completed!\n');

    // Summary
    console.log('[4/4] Summary:\n');
    console.log('      Total processed:       ', creditNotes.length);
    console.log('      ✓ Inserted:            ', inserted);
    console.log('      ⊘ Duplicates:          ', duplicates);
    console.log('      ✗ Errors:              ', errors);
    console.log('      ────────────────────────────────');
    console.log('      Active credit notes:   ', active);
    console.log('      Cancelled:             ', cancelled);
    console.log('      Total credit amount:    ₹', totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2}));
    console.log();

    // Top parties
    const topParties = await CreditNote.aggregate([
      { $match: { isCancelled: false, party: { $ne: null } } },
      { $group: { _id: '$party', total: { $sum: '$creditAmount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 5 }
    ]);

    if (topParties.length > 0) {
      console.log('      Top 5 Parties by Credit Amount:');
      topParties.forEach((p, i) => {
        console.log(`      ${i+1}. ${p._id}`);
        console.log(`         ₹${p.total.toLocaleString('en-IN', {minimumFractionDigits: 2})} (${p.count} notes)`);
      });
      console.log();
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`      ⏱️  Completed in ${duration} seconds`);
    console.log();
    console.log('='.repeat(60));
    console.log('  ✅ IMPORT SUCCESSFUL!');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
