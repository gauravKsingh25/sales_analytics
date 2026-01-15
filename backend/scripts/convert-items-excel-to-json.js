/**
 * Convert Excel file with item details to JSON
 * 
 * This script converts the Sales Register Excel file that contains item-level details
 * (product names, quantities, rates) into a structured JSON format that can be used
 * to update existing vouchers in MongoDB.
 * 
 * Usage:
 *   Place your Excel file in backend/uploads/item included vouchers/ folder
 *   node scripts/convert-items-excel-to-json.js <filename.xlsx>
 * 
 * Example:
 *   node scripts/convert-items-excel-to-json.js sales-register.xlsx
 */

import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for item-included vouchers
const ITEMS_DIR = path.resolve('backend', 'uploads', 'item included vouchers');

/**
 * Convert Excel serial number to ISO date string
 */
function excelDateToISO(serial) {
  if (!serial || isNaN(serial)) return null;
  const excelEpoch = new Date(Date.UTC(1899, 11, 30));
  const days = Math.floor(serial);
  const ms = days * 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + ms);
  return date.toISOString().slice(0, 10);
}

/**
 * Parse amount from various formats
 * Handles: "30548.00", "30548.00 Dr", "27050.96 Cr", etc.
 */
function parseAmount(value) {
  if (value === null || value === undefined || value === '') return null;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove "Dr", "Cr", and other text, keep only numbers and decimal
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Parse quantity and unit from formats like "4.00 PCS", "30 BOX", "10.00 PCS"
 */
function parseQuantity(value) {
  if (!value) return { qty: null, unit: null };
  
  if (typeof value === 'number') {
    return { qty: value, unit: null };
  }
  
  if (typeof value === 'string') {
    // Match patterns like "4.00 PCS", "30 BOX", "10.00/PCS", "450.00/BOX"
    const match = value.match(/^([\d.]+)\s*([A-Z]+)?/i);
    if (match) {
      return {
        qty: parseFloat(match[1]),
        unit: match[2] || null
      };
    }
  }
  
  return { qty: null, unit: null };
}

/**
 * Parse rate/price from formats like "1050.00/PCS", "680.00/PCS", "450.00/BOX"
 */
function parseRate(value) {
  if (!value) return null;
  
  if (typeof value === 'number') return value;
  
  if (typeof value === 'string') {
    // Remove everything except numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
  
  return null;
}

/**
 * Check if a row is a voucher header row
 */
function isVoucherHeaderRow(row) {
  // A voucher header has Date, Particulars (party name), Vch Type, Vch No., and Debit/Credit
  const hasDate = row.date !== null && row.date !== undefined && row.date !== '';
  const hasParty = row.particulars && typeof row.particulars === 'string' && row.particulars.trim().length > 0;
  const hasVchNo = row.vchNo !== null && row.vchNo !== undefined && row.vchNo !== '';
  
  return hasDate && hasParty && hasVchNo;
}

/**
 * Check if a row is an item detail row
 */
function isItemRow(row) {
  // Item rows have product description and quantity/rate information
  // They don't have date, party, or voucher number
  const noDate = !row.date || row.date === '';
  const hasParticulars = row.particulars && typeof row.particulars === 'string' && row.particulars.trim().length > 0;
  const hasAmount = row.amount !== null && row.amount !== undefined && row.amount !== '';
  
  return noDate && hasParticulars && hasAmount;
}

/**
 * Check if a row is an account/GST row (IGST SALE, IGST OUTPUT, etc.)
 */
function isAccountRow(row) {
  const noDate = !row.date || row.date === '';
  const particulars = row.particulars || '';
  
  // Check for common account patterns
  const accountPatterns = [
    /IGST\s+(SALE|OUTPUT|INPUT)/i,
    /CGST\s+(SALE|OUTPUT|INPUT)/i,
    /SGST\s+(SALE|OUTPUT|INPUT)/i,
    /GST/i,
    /R\.OFF/i,
    /ROUND/i,
  ];
  
  return noDate && accountPatterns.some(pattern => pattern.test(particulars));
}

/**
 * Classify item type based on description
 */
function classifyItemType(description) {
  if (typeof description !== 'string') return 'product';
  const desc = description.trim();
  
  // Remove trailing numbers for pattern matching
  const descWithoutNumbers = desc.replace(/\s+\d+$/, '');
  
  // Tax and GST entries - check FIRST
  if (/GST|CGST|SGST|IGST|CESS|TCS|TDS/i.test(descWithoutNumbers)) return 'tax';
  
  // Ledger/accounting entries
  if (/SALE$|OUTPUT$|INPUT$/i.test(descWithoutNumbers)) return 'ledger';
  if (/^(LOCAL|DIRECT|INTERSTATE)/i.test(descWithoutNumbers)) return 'ledger';
  if (/R\.OFF|ROUND|ROUNDING|FREIGHT|TRANSPORT|DISCOUNT/i.test(descWithoutNumbers)) return 'ledger';
  if (/CASH|BANK|ACCOUNT/i.test(descWithoutNumbers)) return 'ledger';
  
  // Staff names with location in parentheses
  if (/\([A-Z&\s]+\)/.test(descWithoutNumbers)) {
    if (/\((West Bengal|Karnataka|Maharashtra|Punjab|Jammu|UP|Delhi|Mumbai|Bengalore|Hyderabad|Chennai|J&K|KA|Mh|Ap|Uk|Guj|CHD|DL|WB|TN|RJ)\)/i.test(descWithoutNumbers)) {
      return 'other';
    }
  }
  
  // Staff name patterns
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(descWithoutNumbers)) return 'other';
  if (/^[A-Z\s]+\s+(Uk|Ap|Mh|Guj|CHD|KA|J&K|UP|DL|WB|TN|RJ|Head|Delhi|Mumbai)$/i.test(descWithoutNumbers)) return 'other';
  
  // Two or three word names
  const words = descWithoutNumbers.split(/\s+/);
  if (words.length === 2 || words.length === 3) {
    const hasCapitalizedWords = words.every(w => /^[A-Z]/.test(w));
    const hasLocationCode = /Uk|Ap|Mh|Guj|CHD|KA|J&K|UP|DL|WB|TN|RJ|Head|Delhi|Mumbai|Bengal/i.test(descWithoutNumbers);
    const hasCommonIndianNames = /MANI|VINOD|VISHWASH|ALOK|HANEES|SHUBHAM|Rahul|Venkatesh|Naresh|NIlesh|Soumitra|Debashish|Chaman/i.test(descWithoutNumbers);
    
    if (hasCapitalizedWords && (hasLocationCode || hasCommonIndianNames || words.length === 2)) {
      return 'other';
    }
  }
  
  // Default to product
  return 'product';
}

/**
 * Check if a string looks like a human/staff name
 */
function isHumanName(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  
  // Match patterns like: "Rahul Sharma Uk", "Venkatesh Ap", "SHUBHAM (CHD)", "Naresh (Head)"
  if (/\([A-Z][a-z]*\)/.test(trimmed)) return true; // Has (XX) pattern
  if (/^[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed)) return true; // "Firstname Lastname"
  if (/^[A-Z]+\s+\(/.test(trimmed)) return true; // "FIRSTNAME (Location)"
  if (/\s+(Uk|Ap|Mh|Guj|CHD|KA|Head|Delhi|Mumbai)\s*$/i.test(trimmed)) return true; // Ends with location code
  
  return false;
}

/**
 * Parse Excel file and extract vouchers with items
 */
async function parseExcelWithItems(filePath) {
  console.log(`📖 Reading Excel file: ${filePath}`);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  
  console.log(`📊 Processing sheet: ${sheet.name}`);
  
  const vouchers = [];
  let currentVoucher = null;
  let headers = [];
  let rowIndex = 0;
  
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    rowIndex++;
    
    // Skip header rows (first 8 rows typically)
    if (rowIndex <= 8) return;
    
    const values = row.values.slice(1); // Remove empty first element
    
    // Row 9 is the header row
    if (rowIndex === 9) {
      headers = values.map((h, i) => {
        if (!h) return `col${i+1}`;
        return h.toString().toLowerCase().trim();
      });
      console.log(`📋 Headers found: ${headers.join(', ')}`);
      return;
    }
    
    // Map header indices
    const getIndex = (name) => headers.findIndex(h => h && h.includes(name.toLowerCase()));
    
    const dateIdx = getIndex('date');
    const particularsIdx = getIndex('particulars');
    const vchTypeIdx = getIndex('vch type');
    const vchNoIdx = getIndex('vch no');
    const debitIdx = getIndex('debit');
    const creditIdx = getIndex('credit');
    
    // Create row object for easier processing
    const rowData = {
      date: values[dateIdx],
      particulars: values[particularsIdx],
      vchType: values[vchTypeIdx],
      vchNo: values[vchNoIdx],
      debit: values[debitIdx],
      credit: values[creditIdx],
      allValues: values
    };
    
    // Check if this is a new voucher
    if (isVoucherHeaderRow(rowData)) {
      // Save previous voucher if exists
      if (currentVoucher) {
        vouchers.push(currentVoucher);
      }
      
      // Parse date
      const dateValue = rowData.date;
      let dateIso = '';
      let dateSerial = '';
      
      if (dateValue instanceof Date) {
        dateIso = dateValue.toISOString().slice(0, 10);
        dateSerial = Math.floor((dateValue - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000));
      } else if (typeof dateValue === 'number') {
        dateSerial = dateValue;
        dateIso = excelDateToISO(dateValue);
      } else if (typeof dateValue === 'string') {
        dateIso = dateValue;
      }
      
      // Parse amounts
      const debitAmount = parseAmount(rowData.debit);
      const creditAmount = parseAmount(rowData.credit);
      
      // Create new voucher
      currentVoucher = {
        Voucher_Number: rowData.vchNo ? rowData.vchNo.toString() : '',
        Date_iso: dateIso,
        Date_serial: dateSerial,
        Party: rowData.particulars || '',
        Vch_Type: rowData.vchType || 'Sales',
        Debit_Amount: debitAmount,
        Credit_Amount: creditAmount,
        Items: []
      };
      
      if (rowIndex % 50 === 0) {
        console.log(`  Processing row ${rowIndex}...`);
      }
    } 
    // Check if this is an item row (not account row and not staff name)
    else if (currentVoucher && !isAccountRow(rowData) && !isHumanName(rowData.particulars)) {
      const particulars = rowData.particulars;
      
      if (particulars && particulars.trim().length > 0) {
        // Based on Excel structure analysis:
        // Column 1 (index 1): Item description
        // Column 2 (index 2): Quantity (number)
        // Column 3 (index 3): Unit Price/Rate (number)  
        // Column 4 (index 4): Amount (number)
        
        // Get values from specific columns
        const qtyValue = values[2]; // Column index 2
        const rateValue = values[3]; // Column index 3
        const amountValue = values[4]; // Column index 4
        
        // Parse quantity
        let qty = null;
        if (typeof qtyValue === 'number') {
          qty = qtyValue;
        } else if (typeof qtyValue === 'string') {
          const parsed = parseFloat(qtyValue.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) qty = parsed;
        }
        
        // Parse rate/unit price
        let rate = null;
        if (typeof rateValue === 'number') {
          rate = rateValue;
        } else if (typeof rateValue === 'string' && rateValue !== 'Dr' && rateValue !== 'Cr') {
          const parsed = parseFloat(rateValue.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) rate = parsed;
        }
        
        // Parse amount
        let amount = null;
        if (typeof amountValue === 'number') {
          amount = amountValue;
        } else if (typeof amountValue === 'string') {
          const parsed = parseFloat(amountValue.replace(/[^0-9.]/g, ''));
          if (!isNaN(parsed)) amount = parsed;
        }
        
        // Only add item if we have quantity or amount
        if (qty !== null || amount !== null) {
          currentVoucher.Items.push({
            description: particulars.trim(),
            qty: qty,
            unit: null, // Unit info not in separate column
            unitPrice: rate,
            amount: amount,
            itemType: classifyItemType(particulars) // Classify as product/tax/ledger
          });
        }
      }
    }
  });
  
  // Don't forget the last voucher
  if (currentVoucher) {
    vouchers.push(currentVoucher);
  }
  
  console.log(`✅ Parsed ${vouchers.length} vouchers`);
  
  // Log statistics
  const vouchersWithItems = vouchers.filter(v => v.Items && v.Items.length > 0);
  const totalItems = vouchers.reduce((sum, v) => sum + (v.Items ? v.Items.length : 0), 0);
  
  console.log(`📦 Vouchers with items: ${vouchersWithItems.length}`);
  console.log(`🛍️  Total items: ${totalItems}`);
  
  return vouchers;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get filename from command line argument
    const filename = process.argv[2];
    
    if (!filename) {
      console.error('❌ Please provide Excel filename as argument');
      console.log('\nUsage: node scripts/convert-items-excel-to-json.js <filename.xlsx>');
      console.log('Example: node scripts/convert-items-excel-to-json.js sales-register.xlsx');
      process.exit(1);
    }
    
    // Check if file exists
    const filePath = path.join(ITEMS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      console.log(`\nPlease place your Excel file in: ${ITEMS_DIR}`);
      process.exit(1);
    }
    
    // Parse Excel
    const vouchers = await parseExcelWithItems(filePath);
    
    // Generate output filename
    const outputFilename = filename.replace(/\.(xlsx|xls)$/i, '-with-items.json');
    const outputPath = path.join(ITEMS_DIR, outputFilename);
    
    // Write JSON
    fs.writeFileSync(outputPath, JSON.stringify(vouchers, null, 2));
    
    console.log(`\n✅ Successfully converted to JSON`);
    console.log(`📁 Output file: ${outputPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total vouchers: ${vouchers.length}`);
    console.log(`   Vouchers with items: ${vouchers.filter(v => v.Items && v.Items.length > 0).length}`);
    console.log(`   Total items: ${vouchers.reduce((sum, v) => sum + (v.Items ? v.Items.length : 0), 0)}`);
    
    // Show sample
    if (vouchers.length > 0) {
      console.log(`\n🔍 Sample voucher:`);
      console.log(JSON.stringify(vouchers[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
