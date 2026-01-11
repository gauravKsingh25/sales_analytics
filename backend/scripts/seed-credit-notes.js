// Script to seed credit notes from JSON files into MongoDB
// Usage: node scripts/seed-credit-notes.js
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import CreditNote from '../schemas/creditnote.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/tally-software';
const CREDIT_NOTES_DIR = path.join(__dirname, '../uploads/credit notes');

// Generate hash for deduplication
function generateHash(creditNote) {
  const hashString = `${creditNote.Credit_Note_Number}|${creditNote.Date_iso}|${creditNote.Party}|${creditNote.Credit_Amount}`;
  return crypto.createHash('sha256').update(hashString).digest('hex');
}

// Progress bar helper
function showProgress(current, total, label = '') {
  const percentage = Math.floor((current / total) * 100);
  const barLength = 40;
  const filledLength = Math.floor((barLength * current) / total);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  
  const line = `\r${label} [${bar}] ${percentage}% (${current}/${total})`;
  process.stdout.write(line);
  
  if (current === total) {
    console.log(''); // New line after completion
  }
}

// Force output immediately
function log(...args) {
  console.log(...args);
  if (process.stdout.write) process.stdout.write('');
}

async function seedCreditNotes() {
  // Force immediate console output
  if (process.stdout._handle) process.stdout._handle.setBlocking(true);
  if (process.stderr._handle) process.stderr._handle.setBlocking(true);
  
  const startTime = Date.now();
  
  try {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║        CREDIT NOTES IMPORT - TALLY SOFTWARE                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Step 1: Connect to MongoDB
    console.log('🔗 Step 1/5: Connecting to MongoDB Atlas...');
    console.log(`   Database: ${MONGODB_URI.includes('mongodb+srv') ? 'MongoDB Atlas Cloud' : 'Local MongoDB'}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected successfully!\n');

    // Step 2: Find JSON files
    console.log('📁 Step 2/5: Scanning credit notes directory...');
    console.log(`   Directory: ${CREDIT_NOTES_DIR}`);
    
    const files = fs.readdirSync(CREDIT_NOTES_DIR)
      .filter(f => f.endsWith('.json'));
    
    console.log(`✓ Found ${files.length} JSON file(s)\n`);

    if (files.length === 0) {
      console.log('⚠️  No JSON files found. Exiting...\n');
      return;
    }

    let totalCreditNotes = 0;
    let insertedCount = 0;
    let duplicateCount = 0;
    let cancelledCount = 0;
    let activeCount = 0;
    let errorCount = 0;
    let totalCreditAmount = 0;
    const errors = [];

    // Step 3: Process each file
    console.log('📄 Step 3/5: Reading credit notes from files...\n');

    for (const file of files) {
      const filePath = path.join(CREDIT_NOTES_DIR, file);
      console.log(`   Processing: ${file}`);

      try {
        const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        
        if (!Array.isArray(jsonData)) {
          console.log(`   ⚠️  Skipping - not an array format\n`);
          continue;
        }

        totalCreditNotes = jsonData.length;
        console.log(`   ✓ Loaded ${totalCreditNotes} credit notes from file\n`);

        // Step 4: Process credit notes
        console.log('💾 Step 4/5: Inserting credit notes into database...\n');

        for (let i = 0; i < jsonData.length; i++) {
          const cn = jsonData[i];
          
          try {
            // Generate deduplication hash
            const dedupeHash = generateHash(cn);

            // Check if already exists
            const existing = await CreditNote.findOne({ dedupeHash });
            if (existing) {
              duplicateCount++;
              showProgress(i + 1, totalCreditNotes, '   Progress');
              continue;
            }

            // Parse date
            let dateObj = new Date(cn.Date_iso);
            if (isNaN(dateObj.getTime())) {
              if (cn.Date_serial) {
                const excelEpoch = new Date(Date.UTC(1899, 11, 30));
                const days = Math.floor(cn.Date_serial);
                const ms = days * 24 * 60 * 60 * 1000;
                dateObj = new Date(excelEpoch.getTime() + ms);
              } else {
                dateObj = new Date();
              }
            }

            // Prepare details array
            const details = (cn.Details || []).map(detail => {
              const entry = {
                amount: detail.Amount || 0
              };
              
              if (detail.Staff) {
                entry.staff = detail.Staff;
              }
              if (detail.Account) {
                entry.account = detail.Account;
              }
              
              return entry;
            });

            // Track cancelled vs active
            const isCancelled = cn.Is_Cancelled || false;
            if (isCancelled) {
              cancelledCount++;
            } else {
              activeCount++;
              totalCreditAmount += (cn.Credit_Amount || 0);
            }

            // Create credit note document
            const creditNote = new CreditNote({
              creditNoteNumber: cn.Credit_Note_Number || '',
              originalSalesVoucherNumber: cn.Original_Sales_Voucher_Number || null,
              date: dateObj,
              dateSerial: cn.Date_serial || null,
              party: cn.Party || null,
              vchType: cn.Vch_Type || 'Credit Note',
              isCancelled: isCancelled,
              creditAmount: cn.Credit_Amount || 0,
              details: details,
              meta: {
                enteredBy: cn.Meta?.Entered_By || null,
                grnNo: cn.Meta?.GRN_No || null,
                source: cn.Meta?.Source || 'Tally Export'
              },
              rawOriginal: cn,
              dedupeHash
            });

            await creditNote.save();
            insertedCount++;

            // Show progress
            showProgress(i + 1, totalCreditNotes, '   Progress');

          } catch (err) {
            errorCount++;
            if (errors.length < 5) {
              errors.push({
                creditNoteNumber: cn.Credit_Note_Number,
                error: err.message
              });
            }
          }
        }

        console.log(`\n   ✓ File processed: ${file}\n`);

      } catch (err) {
        console.error(`   ✗ Error processing ${file}: ${err.message}\n`);
      }
    }

    // Step 5: Show statistics
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                  IMPORT SUMMARY                            ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log('📊 Processing Results:');
    console.log('   ────────────────────────────────────────────────────────');
    console.log(`   Total credit notes found:     ${totalCreditNotes}`);
    console.log(`   ✓ Successfully inserted:      ${insertedCount} (${((insertedCount/totalCreditNotes)*100).toFixed(1)}%)`);
    console.log(`   ⊘ Duplicates skipped:         ${duplicateCount} (${((duplicateCount/totalCreditNotes)*100).toFixed(1)}%)`);
    console.log(`   ✗ Errors:                     ${errorCount} (${((errorCount/totalCreditNotes)*100).toFixed(1)}%)`);
    console.log('   ────────────────────────────────────────────────────────\n');

    console.log('💰 Credit Note Analysis:');
    console.log('   ────────────────────────────────────────────────────────');
    console.log(`   Active credit notes:          ${activeCount}`);
    console.log(`   Cancelled credit notes:       ${cancelledCount}`);
    console.log(`   Total credit amount:          ₹${totalCreditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`   Average per credit note:      ₹${(totalCreditAmount/activeCount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log('   ────────────────────────────────────────────────────────\n');

    // Show errors if any
    if (errors.length > 0) {
      console.log('⚠️  Sample Errors:');
      errors.forEach((e, i) => {
        console.log(`   ${i + 1}. Credit Note ${e.creditNoteNumber}: ${e.error}`);
      });
      console.log('');
    }

    // Get database statistics
    console.log('📈 Database Statistics (After Import):');
    console.log('   ────────────────────────────────────────────────────────');
    
    const dbStats = await CreditNote.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cancelled: { $sum: { $cond: ['$isCancelled', 1, 0] } },
          active: { $sum: { $cond: ['$isCancelled', 0, 1] } },
          totalCreditAmount: { $sum: '$creditAmount' }
        }
      }
    ]);

    if (dbStats.length > 0) {
      const s = dbStats[0];
      console.log(`   Total records in database:    ${s.total}`);
      console.log(`   Active credit notes:          ${s.active}`);
      console.log(`   Cancelled credit notes:       ${s.cancelled}`);
      console.log(`   Total credit value:           ₹${s.totalCreditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    }
    console.log('   ────────────────────────────────────────────────────────\n');

    // Top 10 parties by credit amount
    console.log('🏢 Top 10 Parties by Credit Amount:');
    console.log('   ────────────────────────────────────────────────────────');
    
    const topParties = await CreditNote.aggregate([
      { $match: { isCancelled: false, party: { $ne: null } } },
      {
        $group: {
          _id: '$party',
          totalCredit: { $sum: '$creditAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalCredit: -1 } },
      { $limit: 10 }
    ]);

    topParties.forEach((p, i) => {
      const amount = p.totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      console.log(`   ${String(i + 1).padStart(2)}. ${p._id}`);
      console.log(`       ₹${amount} (${p.count} credit notes)`);
    });
    console.log('   ────────────────────────────────────────────────────────\n');

    console.log('⏱️  Performance:');
    console.log(`   Time taken: ${duration} seconds`);
    console.log(`   Processing speed: ${(totalCreditNotes/duration).toFixed(0)} records/second\n`);

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║            ✅ IMPORT COMPLETED SUCCESSFULLY!               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:');
    console.error('   ', error.message);
    console.error('\n   Stack trace:');
    console.error('   ', error.stack);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  seedCreditNotes()
    .then(() => {
      process.exit(0);
    })
    .catch(err => {
      console.error('\n💥 Script failed:', err.message);
      process.exit(1);
    });
}

export default seedCreditNotes;
