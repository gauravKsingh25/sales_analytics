// Script to convert credit note Excel files to JSON format
// Usage: node "backend/uploads/credit notes/convert-credit-notes.js"
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getExcelFiles(dir) {
  // Process both .xlsx and .xls files
  return fs.readdirSync(dir).filter(f => f.match(/\.(xlsx|xls)$/i));
}

function excelDateToISO(serial) {
  if (!serial || isNaN(serial)) return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const days = Math.floor(serial);
  const ms = days * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + ms);
  return date.toISOString().slice(0, 10);
}

function isHumanName(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  
  // Match patterns like: "Rahul Sharma Uk", "SHUBHAM (CHD)", "Naresh (Head)", "DHIRAJ (KA)"
  // "Siddharth Sharma", "Vikas Gupta", etc.
  if (/\([A-Z][a-z]*\)/.test(trimmed)) return true; // Has (XX) pattern
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed)) return true; // "Firstname Lastname"
  if (/^[A-Z]+\s+\(/.test(trimmed)) return true; // "FIRSTNAME (Location)"
  
  // Common account patterns to exclude
  if (/SALE|OUTPUT|INPUT|GST|CGST|SGST|IGST|R\.OFF|ROUND/i.test(trimmed)) return false;
  if (/GRN|Entered|grn|entered/i.test(trimmed)) return false;
  
  return false;
}

async function parseCreditNotesExcel(filePath) {
  // Read the Excel file
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header row
  const data = XLSX.utils.sheet_to_json(sheet, { 
    header: 1, // Return array of arrays
    defval: '', // Default value for empty cells
    blankrows: false // Skip blank rows
  });
  
  const creditNotes = [];
  let currentCreditNote = null;
  
  // Column indices based on the Excel structure
  const DATE_COL = 0;
  const PARTICULARS_COL = 1;
  const AMOUNT_COL = 2;
  const TYPE_COL = 3;
  const VCH_TYPE_COL = 4;
  const VCH_NO_COL = 5;
  const DEBIT_COL = 6;
  const CREDIT_COL = 7;
  
  // Process rows (skip first 10 rows - headers)
  for (let rowIndex = 10; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    if (!row || row.length === 0) continue;
    
    // Check if this is the start of a new credit note
    // A new credit note has: Date (number), Particulars, Vch Type, Vch No.
    const hasDate = typeof row[DATE_COL] === 'number';
    const hasVchType = row[VCH_TYPE_COL] === 'Credit Note';
    const hasVchNo = row[VCH_NO_COL] && row[VCH_NO_COL] !== '';
    
    if (hasDate && hasVchType && hasVchNo) {
      // Save previous credit note
      if (currentCreditNote) {
        creditNotes.push(currentCreditNote);
      }
      
      // Parse date
      const dateSerial = row[DATE_COL];
      const dateIso = excelDateToISO(dateSerial);
      
      // Parse particulars to check if cancelled
      const particulars = row[PARTICULARS_COL]?.toString().trim() || '';
      const isCancelled = particulars === '(cancelled)';
      
      // Get credit amount (or 0 for cancelled)
      let creditAmount = 0;
      if (!isCancelled && row[CREDIT_COL]) {
        creditAmount = parseFloat(row[CREDIT_COL]) || 0;
      }
      
      // Create new credit note
      currentCreditNote = {
        Credit_Note_Number: row[VCH_NO_COL].toString(),
        Original_Sales_Voucher_Number: null,
        Date_iso: dateIso,
        Date_serial: dateSerial,
        Party: isCancelled ? null : particulars,
        Vch_Type: 'Credit Note',
        Is_Cancelled: isCancelled,
        Credit_Amount: creditAmount,
        Details: [],
        Meta: {
          Entered_By: null,
          GRN_No: null,
          Source: "Tally Export"
        }
      };
      
    } else if (currentCreditNote) {
      // This is a detail row for the current credit note
      const particulars = row[PARTICULARS_COL]?.toString().trim() || '';
      
      if (!particulars) continue;
      
      // Check for GRN number
      const grnMatch = particulars.match(/GRN\s*No[.:]?\s*(\d+)/i) || particulars.match(/grn\s*no[.:]?\s*(\d+)/i);
      if (grnMatch) {
        currentCreditNote.Meta.GRN_No = grnMatch[1];
        continue;
      }
      
      // Check for Entered By (name is in the next column, index 2)
      if (particulars.match(/Entered\s*By\s*[:]/i)) {
        const enteredBy = row[AMOUNT_COL]?.toString().trim() || '';
        if (enteredBy) {
          currentCreditNote.Meta.Entered_By = enteredBy;
        }
        continue;
      }
      
      // Skip if cancelled (no details needed)
      if (currentCreditNote.Is_Cancelled) continue;
      
      // Parse detail entry (Account or Staff)
      let amount = null;
      let type = null;
      
      // Check if there's an amount in column 2 with type in column 3
      if (row[AMOUNT_COL] && typeof row[AMOUNT_COL] === 'number') {
        amount = row[AMOUNT_COL];
        type = row[TYPE_COL]; // 'Dr' or 'Cr'
      }
      // Check debit/credit columns
      else if (row[DEBIT_COL] && typeof row[DEBIT_COL] === 'number') {
        amount = row[DEBIT_COL];
        type = 'Dr';
      } else if (row[CREDIT_COL] && typeof row[CREDIT_COL] === 'number') {
        amount = row[CREDIT_COL];
        type = 'Cr';
      }
      
      // Skip if no amount
      if (amount === null) continue;
      
      // Determine if it's Staff or Account
      const detail = {};
      
      if (isHumanName(particulars)) {
        detail.Staff = particulars;
        // Staff amounts: negative for Cr, positive for Dr
        detail.Amount = type === 'Cr' ? -Math.abs(amount) : amount;
      } else {
        detail.Account = particulars;
        // Account amounts: negative for Dr (sales accounts being reversed), positive for Cr
        detail.Amount = type === 'Dr' ? -Math.abs(amount) : Math.abs(amount);
      }
      
      currentCreditNote.Details.push(detail);
    }
  }
  
  // Save last credit note
  if (currentCreditNote) {
    creditNotes.push(currentCreditNote);
  }
  
  return creditNotes;
}

async function convertAll() {
  const creditNotesDir = __dirname;
  const files = getExcelFiles(creditNotesDir);
  
  console.log(`Found ${files.length} Excel file(s) in credit notes folder`);
  
  for (const file of files) {
    const filePath = path.join(creditNotesDir, file);
    try {
      console.log(`\nProcessing ${file}...`);
      const creditNotes = await parseCreditNotesExcel(filePath);
      
      const jsonFileName = file.replace(/\.(xlsx|xls)$/i, '.json');
      const jsonPath = path.join(creditNotesDir, jsonFileName);
      
      fs.writeFileSync(jsonPath, JSON.stringify(creditNotes, null, 2), 'utf-8');
      console.log(`✓ Converted ${file} -> ${jsonFileName}`);
      console.log(`  Total credit notes: ${creditNotes.length}`);
    } catch (e) {
      console.error(`✗ Failed to convert ${file}:`, e.message);
      console.error(e.stack);
    }
  }
  
  console.log('\n✓ Conversion complete!');
}

convertAll().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
