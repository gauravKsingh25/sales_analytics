/**
 * Voucher Data Seeding Script
 * 
 * This script:
 * 1. Reads all JSON voucher files from uploads/ folder
 * 2. Seeds MongoDB with complete voucher data
 * 3. Ensures unique keys within each voucher (party 1, party 2, etc.)
 * 4. Extracts and stores all unique employee names
 * 5. Maintains proper relationships between vouchers, employees, and companies
 * 
 * Usage:
 *   node scripts/seed-vouchers.js
 *   node scripts/seed-vouchers.js --verbose
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Company from '../schemas/company.js';
import Employee from '../schemas/employee.js';
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

// Verbose logging flag
const VERBOSE = process.argv.includes('--verbose');

/**
 * Normalize a name for comparison (lowercase, no special chars)
 */
function normalizeName(val) {
  return (val || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Check if a string looks like a human name
 */
function isHumanName(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  
  // Match patterns like: "Rahul Sharma Uk", "SHUBHAM (CHD)", "Naresh (Head)", "DHIRAJ (KA)"
  if (/\([A-Z][a-z]*\)/.test(trimmed)) return true; // Has (XX) pattern
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed)) return true; // "Firstname Lastname"
  if (/^[A-Z]+\s+\(/.test(trimmed)) return true; // "FIRSTNAME (Location)"
  
  // Common account patterns to exclude
  if (/SALE|OUTPUT|INPUT|GST|CGST|SGST|IGST|R\.OFF|ROUND|CASH|BANK|ACCOUNT/i.test(trimmed)) return false;
  
  return false;
}

/**
 * Make all keys unique within a single voucher
 * Renames duplicates with numerical suffix (party 1, party 2, etc.)
 */
function makeVoucherKeysUnique(voucher) {
  const clone = JSON.parse(JSON.stringify(voucher));
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
 * Extract all unique employee names from vouchers
 */
function extractEmployeeNames(vouchers) {
  const employeeSet = new Set();

  for (const voucher of vouchers) {
    if (Array.isArray(voucher.Details)) {
      for (const detail of voucher.Details) {
        if (detail.Staff && isHumanName(detail.Staff)) {
          // Extract base name without numerical suffix
          const baseName = detail.Staff.replace(/\s+\d+$/, '').trim();
          employeeSet.add(baseName);
        }
      }
    }
  }

  return Array.from(employeeSet);
}

/**
 * Find or create employee by name
 */
async function findOrCreateEmployee(name, uploadId, session) {
  const normalized = normalizeName(name);
  
  let employee = await Employee.findOne({ normalized }).session(session);
  
  if (!employee) {
    const created = await Employee.create([{
      name: name || 'Unknown',
      normalized,
      metadata: { source: 'seed', uploadId }
    }], { session });
    employee = created[0];
  }
  
  return employee;
}

/**
 * Find or create company by name
 */
async function findOrCreateCompany(name, session) {
  const normalized = normalizeName(name);
  
  let company = await Company.findOne({ normalized }).session(session);
  
  if (!company) {
    const created = await Company.create([{
      name: name || 'Unknown',
      normalized
    }], { session });
    company = created[0];
  }
  
  return company;
}

/**
 * Parse date from various formats
 */
function parseDate(dateValue) {
  if (!dateValue) return new Date();
  
  // If it's already a Date object
  if (dateValue instanceof Date) return dateValue;
  
  // If it's ISO string format
  if (typeof dateValue === 'string') {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  
  // Default to current date if parsing fails
  return new Date();
}

/**
 * Process a single voucher and insert into database
 */
async function processVoucher(voucherData, uploadId, session, stats) {
  try {
    // Create unique version
    const rawUnique = makeVoucherKeysUnique(voucherData);
    
    // Create dedupe hash from voucher number and date
    const dedupeHash = crypto.createHash('sha256')
      .update(`${voucherData.Voucher_Number}${voucherData.Date_iso || Date.now()}`)
      .digest('hex');
    
    // Check if voucher already exists
    const existingVoucher = await Voucher.findOne({ dedupeHash }).session(session);
    if (existingVoucher) {
      stats.skipped++;
      if (VERBOSE) {
        console.log(`  ⏭️  Skipped duplicate: ${voucherData.Voucher_Number}`);
      }
      return null;
    }

    // Find or create company (Party)
    const partyName = rawUnique.Party || voucherData.Party || 'Unknown Party';
    const company = await findOrCreateCompany(partyName, session);
    
    // Parse date
    const voucherDate = parseDate(voucherData.Date_iso);
    
    // Calculate total amount
    const totalAmount = voucherData.Debit_Amount || voucherData.Credit_Amount || 0;

    // Create voucher
    const voucher = await Voucher.create([{
      voucherNumber: voucherData.Voucher_Number || `V${Date.now()}`,
      date: voucherDate,
      totalAmount,
      currency: 'INR',
      companyId: company._id,
      uploadId,
      rawOriginal: voucherData,
      rawUnique,
      dedupeHash,
    }], { session });

    const voucherId = voucher[0]._id;

    // Process details (line items)
    if (Array.isArray(voucherData.Details)) {
      for (let detailIndex = 0; detailIndex < voucherData.Details.length; detailIndex++) {
        const detail = voucherData.Details[detailIndex];
        const uniqueDetail = rawUnique.Details[detailIndex] || detail;

        // Create voucher item for accounts
        if (detail.Account) {
          await VoucherItem.create([{
            voucherId,
            description: uniqueDetail.Account || detail.Account,
            qty: 1,
            unitPrice: detail.Amount || 0,
            amount: detail.Amount || 0,
          }], { session });
          stats.items++;
        }

        // Create voucher participant for staff
        if (detail.Staff) {
          const staffNameForStorage = uniqueDetail.Staff || detail.Staff;
          
          // Extract base name (remove numerical suffix for employee lookup)
          const baseName = staffNameForStorage.replace(/\s+\d+$/, '').trim();
          const employee = await findOrCreateEmployee(baseName, uploadId, session);

          await VoucherParticipant.create([{
            voucherId,
            employeeId: employee._id,
            role: detail.Type || 'Dr',
            confidence: 1,
          }], { session });
          stats.participants++;
        }
      }
    }

    stats.vouchers++;
    return voucher[0];

  } catch (error) {
    stats.errors++;
    console.error(`❌ Error processing voucher ${voucherData.Voucher_Number}:`, error.message);
    throw error;
  }
}

/**
 * Read all JSON files from uploads folder
 */
function readVoucherFiles() {
  const uploadsDir = path.join(__dirname, '../uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    throw new Error(`Uploads directory not found: ${uploadsDir}`);
  }

  const files = fs.readdirSync(uploadsDir)
    .filter(file => file.endsWith('.json'))
    .map(file => path.join(uploadsDir, file));

  if (files.length === 0) {
    throw new Error(`No JSON files found in ${uploadsDir}`);
  }

  console.log(`📂 Found ${files.length} JSON files:\n`);
  files.forEach(file => console.log(`   - ${path.basename(file)}`));
  console.log();

  return files;
}

/**
 * Load vouchers from all JSON files
 */
function loadVouchers(files) {
  const allVouchers = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const vouchers = JSON.parse(content);
      
      if (Array.isArray(vouchers)) {
        allVouchers.push(...vouchers);
        console.log(`✅ Loaded ${vouchers.length} vouchers from ${path.basename(file)}`);
      } else {
        console.warn(`⚠️  ${path.basename(file)} does not contain an array of vouchers`);
      }
    } catch (error) {
      console.error(`❌ Error reading ${path.basename(file)}:`, error.message);
    }
  }

  console.log(`\n📊 Total vouchers loaded: ${allVouchers.length}\n`);
  return allVouchers;
}

/**
 * Seed all employees first
 */
async function seedEmployees(vouchers, uploadId, stats) {
  console.log('👥 Extracting and seeding employees...\n');
  
  const employeeNames = extractEmployeeNames(vouchers);
  console.log(`   Found ${employeeNames.length} unique employee names\n`);

  for (const name of employeeNames) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await findOrCreateEmployee(name, uploadId, session);
      await session.commitTransaction();
      stats.employees++;
    } catch (error) {
      await session.abortTransaction();
      console.error(`   Error creating employee ${name}:`, error.message);
    } finally {
      session.endSession();
    }
  }

  console.log(`✅ Seeded ${stats.employees} employees\n`);
}

/**
 * Main seeding function
 */
async function seedDatabase() {
  const stats = {
    vouchers: 0,
    items: 0,
    participants: 0,
    employees: 0,
    companies: 0,
    skipped: 0,
    errors: 0,
  };

  try {
    console.log('🌱 Starting database seeding...\n');

    // Read all JSON files
    const files = readVoucherFiles();
    const vouchers = loadVouchers(files);

    if (vouchers.length === 0) {
      console.log('⚠️  No vouchers to seed. Exiting.\n');
      return;
    }

    // Create upload record
    const upload = await Upload.create({
      filename: 'seed-script',
      originalName: 'Multiple JSON files',
      size: 0,
      mimeType: 'application/json',
      path: path.join(__dirname, '../uploads'),
      status: 'processing',
      processedRows: 0,
      totalRows: vouchers.length,
      errorsList: [],
    });

    const uploadId = upload._id;

    // Seed employees first (without session)
    await seedEmployees(vouchers, uploadId, stats);

    // Process vouchers in smaller batches (50 at a time)
    console.log('📝 Processing vouchers in batches...\n');
    
    const BATCH_SIZE = 50;
    let processedCount = 0;

    for (let i = 0; i < vouchers.length; i += BATCH_SIZE) {
      const batch = vouchers.slice(i, i + BATCH_SIZE);
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        for (const voucherData of batch) {
          await processVoucher(voucherData, uploadId, session, stats);
          processedCount++;
        }

        await session.commitTransaction();
        console.log(`   ✅ Batch complete: ${processedCount}/${vouchers.length} vouchers processed`);
        
      } catch (error) {
        await session.abortTransaction();
        console.error(`   ❌ Batch failed at voucher ${processedCount}:`, error.message);
        // Continue with next batch
      } finally {
        session.endSession();
      }
    }

    // Count companies created
    stats.companies = await Company.countDocuments();

    // Update upload record
    await Upload.findByIdAndUpdate(uploadId, {
      status: 'done',
      processedRows: stats.vouchers,
      processedAt: new Date(),
    });

    console.log('\n✨ Database seeding completed!\n');
    
    // Print summary
    console.log('📈 Summary:');
    console.log(`   Vouchers created: ${stats.vouchers}`);
    console.log(`   Vouchers skipped (duplicates): ${stats.skipped}`);
    console.log(`   Voucher items created: ${stats.items}`);
    console.log(`   Voucher participants created: ${stats.participants}`);
    console.log(`   Employees created: ${stats.employees}`);
    console.log(`   Companies created: ${stats.companies}`);
    console.log(`   Errors: ${stats.errors}\n`);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    console.log(`📍 Database: ${MONGO_URI.split('@')[1]?.split('?')[0] || 'Unknown'}\n`);
    
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');
    console.log(`📦 Database name: ${mongoose.connection.db.databaseName}\n`);

    await seedDatabase();

    await mongoose.connection.close();
    console.log('👋 Database connection closed\n');
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] && process.argv[1].includes('seed-vouchers.js')) {
  main();
}

export { seedDatabase, extractEmployeeNames, makeVoucherKeysUnique };
