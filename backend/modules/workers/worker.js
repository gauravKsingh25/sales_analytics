
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Upload from '../../schemas/upload.js';
import Voucher from '../../schemas/voucher.js';
import Employee from '../../schemas/employee.js';
import Company from '../../schemas/company.js';
import VoucherItem from '../../schemas/voucheritem.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';
import logger from '../../src/logger.js';


// Helper functions from excel-to-json.js
function isHumanName(val) {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  // Match patterns like: "Rahul Sharma Uk", "SHUBHAM (CHD)", "Naresh (Head)", "DHIRAJ (KA)"
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

function normalizeName(val) {
  return (val || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function makeVoucherValuesUnique(voucher) {
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

async function findOrCreateEmployeeByName(name, uploadId, session) {
  const normalizedEmployee = normalizeName(name);
  let employee = await Employee.findOne({ normalized: normalizedEmployee }).session(session);

  if (!employee) {
    const created = await Employee.create([{
      name: name || 'Unknown',
      normalized: normalizedEmployee,
      metadata: { source: 'upload', uploadId }
    }], { session });
    employee = created[0];
  }

  return employee;
}

async function parseExcelToVouchers(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];
  const vouchers = [];
  let currentVoucher = null;
  let headers = [];
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
      
      // Look for amount in the row
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


async function processUpload(uploadId, filePath) {
  logger.info({ uploadId, filePath }, 'Processing upload');
  const session = await mongoose.startSession();
  session.startTransaction();
  let processedRows = 0;
  let totalRows = 0;
  let errorsList = [];
  let rawJsonPath = null;

  try {
    await Upload.findByIdAndUpdate(uploadId, { status: 'processing', processedRows: 0, totalRows: 0, errorsList: [] }, { session });
    
    // Convert Excel to JSON vouchers
    logger.info({ uploadId }, 'Converting Excel to JSON vouchers');
    const vouchers = await parseExcelToVouchers(filePath);
    totalRows = vouchers.length;
    
    // Save permanent JSON file (keep as backup/audit trail)
    rawJsonPath = filePath.replace(/\.xlsx$/i, '.json');
    fs.writeFileSync(rawJsonPath, JSON.stringify(vouchers, null, 2), 'utf-8');
    logger.info({ uploadId, rawJsonPath, totalRows }, 'Raw voucher JSON persisted');
    
    await Upload.findByIdAndUpdate(uploadId, { totalRows, rawJsonPath }, { session });

    // Process each voucher
    for (let i = 0; i < vouchers.length; i++) {
      const voucherData = vouchers[i];
      const rawUnique = makeVoucherValuesUnique(voucherData);
      
      // Create dedupe hash from voucher number and date
      const dedupeHash = crypto.createHash('sha256')
        .update(`${voucherData.Voucher_Number}${voucherData.Date_iso}`)
        .digest('hex');
      
      // Check if voucher already exists
      const existingVoucher = await Voucher.findOne({ dedupeHash }).session(session);
      if (existingVoucher) {
        errorsList.push(`Voucher ${voucherData.Voucher_Number}: Already exists (duplicate)`);
        continue;
      }

      // Find or create company (Party)
      const normalizedCompany = normalizeName(voucherData.Party);
      let company = await Company.findOne({ normalized: normalizedCompany }).session(session);
      if (!company) {
        company = await Company.create([{ name: rawUnique.Party, normalized: normalizedCompany }], { session });
        company = company[0];
      }

      // Create voucher with raw payload snapshots
      const voucher = await Voucher.create([{
        voucherNumber: voucherData.Voucher_Number,
        date: new Date(voucherData.Date_iso),
        totalAmount: voucherData.Debit_Amount || voucherData.Credit_Amount || 0,
        currency: 'INR',
        companyId: company._id,
        uploadId,
        rawOriginal: voucherData,
        rawUnique,
        dedupeHash,
      }], { session });

      // Process details (line items)
      for (let detailIndex = 0; detailIndex < voucherData.Details.length; detailIndex++) {
        const detail = voucherData.Details[detailIndex];
        const uniqueDetail = rawUnique.Details[detailIndex] || detail;

        // Create voucher item for accounts
        if (detail.Account) {
          await VoucherItem.create([{
            voucherId: voucher[0]._id,
            description: uniqueDetail.Account || detail.Account,
            qty: 1,
            unitPrice: detail.Amount || 0,
            amount: detail.Amount || 0,
          }], { session });
        }

        // Create voucher participant for staff
        if (detail.Staff) {
          const staffNameForStorage = uniqueDetail.Staff || detail.Staff;
          const employee = await findOrCreateEmployeeByName(staffNameForStorage, uploadId, session);

          await VoucherParticipant.create([{
            voucherId: voucher[0]._id,
            employeeId: employee._id,
            role: detail.Type || 'Dr',
            confidence: 1,
          }], { session });
        }
      }

      processedRows++;
      if (processedRows % 10 === 0) {
        await Upload.findByIdAndUpdate(uploadId, { processedRows }, { session });
      }
    }

    await Upload.findByIdAndUpdate(uploadId, { 
      status: 'done', 
      processedAt: new Date(), 
      processedRows, 
      errorsList 
    }, { session });
    
    await session.commitTransaction();
    logger.info({ uploadId, processedRows }, 'Upload processed successfully');

    // Keep JSON file as permanent backup/audit trail (don't delete)
    logger.info({ uploadId, rawJsonPath }, 'Raw JSON preserved for audit trail');

  } catch (err) {
    await session.abortTransaction();
    await Upload.findByIdAndUpdate(uploadId, { 
      status: 'failed', 
      message: err.message, 
      errorsList 
    });
    logger.error({ err, uploadId }, 'Upload processing failed');

    // Keep JSON file even on error for debugging
    logger.info({ uploadId, rawJsonPath }, 'Raw JSON preserved for debugging')
  } finally {
    session.endSession();
  }
}

export { processUpload };
