// Script to convert all Excel files in backend/uploads to JSON files with full data structure
// Usage: node scripts/excel-to-json.js
import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

const uploadsDir = path.resolve('backend', 'uploads');

function getExcelFiles(dir) {
  // Only process .xlsx files, skip .xls
  return fs.readdirSync(dir).filter(f => f.match(/\.xlsx$/i));
}

async function parseExcel(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const vouchers = [];
  let currentVoucher = null;
  let headers = [];
  function isHumanName(val) {
    if (typeof val !== 'string') return false;
    const trimmed = val.trim();
    // Match patterns like: "Rahul Sharma Uk", "SHUBHAM (CHD)", "Naresh (Head)", "DHIRAJ (KA)"
    // Staff names often have:
    // - Multiple words with capitals
    // - Parentheses with location/role abbreviations
    // - Mix of title case and abbreviations
    if (/\([A-Z][a-z]*\)/.test(trimmed)) return true; // Has (XX) pattern
    if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed)) return true; // "Firstname Lastname"
    if (/^[A-Z]+\s+\(/.test(trimmed)) return true; // "FIRSTNAME (Location)"
    // Common account patterns to exclude
    if (/SALE|OUTPUT|INPUT|GST|CGST|SGST|IGST|R\.OFF|ROUND/i.test(trimmed)) return false;
    return false;
  }
  function excelDateToISO(serial) {
    if (!serial || isNaN(serial)) return null;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const days = Math.floor(serial);
    const ms = days * 24 * 60 * 60 * 1000;
    const date = new Date(excelEpoch.getTime() + ms);
    return date.toISOString().slice(0, 10);
  }
  let rowIndex = 0;
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rowIndex++;
    if (rowIndex <= 8) return; // skip first 8 rows
    const values = row.values.slice(1);
    if (rowIndex === 9) {
      headers = values.map((h, i) => h || `col${i+1}`);
      return;
    }
    // Map header indices for easier access
    const idx = (name) => headers.findIndex(h => h && h.toLowerCase().includes(name.toLowerCase()));
    const vchTypeIdx = idx('Vch Type');
    const vchNoIdx = idx('Vch No');
    const dateIdx = idx('Date');
    const particularsIdx = idx('Particulars');
    const debitIdx = idx('Debit');
    const creditIdx = idx('Credit');
    
    // Start a new voucher if both Vch Type and Vch No. are present
    const isVoucherStart = values[vchTypeIdx] && values[vchNoIdx];
    if (isVoucherStart) {
      if (currentVoucher) vouchers.push(currentVoucher);
      
      // Parse date properly
      const dateValue = values[dateIdx];
      let dateIso = '';
      let dateSerial = '';
      
      if (dateValue instanceof Date) {
        dateIso = dateValue.toISOString().slice(0, 10);
        dateSerial = Math.floor((dateValue - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000));
      } else if (typeof dateValue === 'number') {
        dateSerial = dateValue;
        dateIso = excelDateToISO(dateValue);
      }
      
      currentVoucher = {
        Voucher_Number: values[vchNoIdx] || '',
        Date_iso: dateIso,
        Date_serial: dateSerial,
        Party: values[particularsIdx] || '',
        Vch_Type: values[vchTypeIdx] || '',
        Debit_Amount: values[debitIdx] || null,
        Credit_Amount: values[creditIdx] || null,
        Details: []
      };
    } else if (currentVoucher) {
      // Add line item to Details
      const detail = {};
      const particularValue = values[particularsIdx];
      
      // Check if next column has amount/number
      let amountValue = null;
      let typeValue = null;
      
      // Look for amount in the row (usually column after particulars or in debit/credit columns)
      for (let i = 0; i < values.length; i++) {
        if (typeof values[i] === 'number' && values[i] !== 0) {
          amountValue = values[i];
          // Check if previous value is Dr/Cr
          if (i > 0 && (values[i-1] === 'Dr' || values[i-1] === 'Cr')) {
            typeValue = values[i-1];
          }
          break;
        } else if (values[i] === 'Dr' || values[i] === 'Cr') {
          typeValue = values[i];
        }
      }
      
      // Check debit/credit columns specifically
      if (!amountValue) {
        if (values[debitIdx]) amountValue = values[debitIdx];
        else if (values[creditIdx]) amountValue = values[creditIdx];
      }
      
      // Determine if it's Staff or Account based on human name detection
      if (particularValue) {
        if (isHumanName(particularValue)) {
          detail.Staff = particularValue;
          if (typeValue) detail.Type = typeValue;
          if (amountValue) detail.Amount = amountValue;
        } else {
          detail.Account = particularValue;
          if (amountValue) detail.Amount = amountValue;
        }
      } else if (amountValue) {
        // If no particular but has amount, might be a rounding entry
        detail.Amount = amountValue;
        if (typeValue) detail.Type = typeValue;
      }
      
      // Only add detail if it has meaningful data
      if (Object.keys(detail).length > 0) {
        currentVoucher.Details.push(detail);
      }
    }
  });
  if (currentVoucher) vouchers.push(currentVoucher);
  return vouchers;
}

async function convertAll() {
  const files = getExcelFiles(uploadsDir);
  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    try {
      const rows = await parseExcel(filePath);
      const jsonPath = filePath.replace(/\.xlsx$/i, '.json');
      fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), 'utf-8');
      console.log(`Converted ${file} -> ${path.basename(jsonPath)}`);
    } catch (e) {
      console.error(`Failed to convert ${file}:`, e.message);
    }
  }
}

convertAll().catch(e => {
  console.error(e);
  process.exit(1);
});
