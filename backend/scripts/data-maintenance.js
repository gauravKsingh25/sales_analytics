#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { connectMongoose } from '../src/db/mongoose.js';
import Voucher from '../schemas/voucher.js';
import VoucherItem from '../schemas/voucheritem.js';
import VoucherParticipant from '../schemas/voucherparticipant.js';
import Employee from '../schemas/employee.js';
import Company from '../schemas/company.js';
import Upload from '../schemas/upload.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeName(val) {
  return (val || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function renameWithCounter(value, bucket) {
  if (!value) return value;
  const key = value.toString().trim() || 'Unknown';
  const normalized = key.toLowerCase();
  bucket[normalized] = (bucket[normalized] || 0) + 1;
  const count = bucket[normalized];
  return count === 1 ? key : `${key} ${count}`;
}

function makeVoucherValuesUnique(voucher) {
  const clone = JSON.parse(JSON.stringify(voucher));
  const seen = { party: {}, staff: {}, account: {} };

  if (clone.Party) {
    clone.Party = renameWithCounter(clone.Party, seen.party);
  }

  clone.Details = (clone.Details || []).map(detail => {
    const copy = { ...detail };
    if (copy.Staff) copy.Staff = renameWithCounter(copy.Staff, seen.staff);
    if (copy.Account) copy.Account = renameWithCounter(copy.Account, seen.account);
    return copy;
  });

  return clone;
}

async function findOrCreateEmployeeByName(name, uploadId, session) {
  const normalized = normalizeName(name);
  let employee = await Employee.findOne({ normalized }).session(session);

  if (!employee) {
    const created = await Employee.create([{
      name: name || 'Unknown',
      normalized,
      metadata: { source: 'script', uploadId },
    }], { session });
    employee = created[0];
  }

  return employee;
}

async function cleanDatabase() {
  const collections = [VoucherItem, VoucherParticipant, Voucher, Employee, Company, Upload];
  for (const model of collections) {
    await model.deleteMany({});
  }
  console.log('Database cleaned: vouchers, items, participants, employees, companies, uploads');
}

async function importVoucherFile(filePath, uploadId) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const vouchers = JSON.parse(content);
  if (!Array.isArray(vouchers)) throw new Error('Input JSON must be an array of vouchers');

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let uploadDoc = null;
    if (!uploadId) {
      uploadDoc = await Upload.create([{
        filename: path.basename(filePath),
        originalName: path.basename(filePath),
        size: fs.statSync(filePath).size,
        mimeType: 'application/json',
        path: filePath,
        status: 'processing',
        processedRows: 0,
        totalRows: vouchers.length,
        errorsList: [],
        rawJsonPath: filePath,
      }], { session });
      uploadDoc = uploadDoc[0];
      uploadId = uploadDoc._id;
    } else {
      uploadDoc = await Upload.findByIdAndUpdate(uploadId, {
        status: 'processing',
        processedRows: 0,
        totalRows: vouchers.length,
        errorsList: [],
        rawJsonPath: filePath,
      }, { session, new: true });
    }

    let processedRows = 0;
    let errorsList = [];

    for (let i = 0; i < vouchers.length; i++) {
      const voucherData = vouchers[i];
      const rawUnique = makeVoucherValuesUnique(voucherData);

      const dedupeHash = crypto.createHash('sha256')
        .update(`${voucherData.Voucher_Number}${voucherData.Date_iso}`)
        .digest('hex');

      const existingVoucher = await Voucher.findOne({ dedupeHash }).session(session);
      if (existingVoucher) {
        errorsList.push(`Voucher ${voucherData.Voucher_Number}: duplicate skipped`);
        continue;
      }

      const normalizedCompany = normalizeName(voucherData.Party);
      let company = await Company.findOne({ normalized: normalizedCompany }).session(session);
      if (!company) {
        const created = await Company.create([{
          name: rawUnique.Party,
          normalized: normalizedCompany,
        }], { session });
        company = created[0];
      }

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

      for (let detailIndex = 0; detailIndex < (voucherData.Details || []).length; detailIndex++) {
        const detail = voucherData.Details[detailIndex];
        const uniqueDetail = rawUnique.Details[detailIndex] || detail;

        if (detail.Account) {
          await VoucherItem.create([{
            voucherId: voucher[0]._id,
            description: uniqueDetail.Account || detail.Account,
            qty: 1,
            unitPrice: detail.Amount || 0,
            amount: detail.Amount || 0,
          }], { session });
        }

        if (detail.Staff) {
          const staffName = uniqueDetail.Staff || detail.Staff;
          const employee = await findOrCreateEmployeeByName(staffName, uploadId, session);

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
      processedRows,
      errorsList,
      processedAt: new Date(),
    }, { session });

    await session.commitTransaction();
    console.log(`Imported ${processedRows} vouchers from ${filePath}`);
  } catch (err) {
    await session.abortTransaction();
    console.error(err.message);
    throw err;
  } finally {
    session.endSession();
  }
}

async function main() {
  const [action, ...rest] = process.argv.slice(2);
  await connectMongoose();

  try {
    if (action === 'clean') {
      await cleanDatabase();
    } else if (action === 'import-json') {
      const fileFlagIndex = rest.findIndex(arg => arg === '--file');
      const idFlagIndex = rest.findIndex(arg => arg === '--upload');
      const filePath = fileFlagIndex >= 0 ? rest[fileFlagIndex + 1] : null;
      const uploadId = idFlagIndex >= 0 ? rest[idFlagIndex + 1] : null;
      if (!filePath) throw new Error('Usage: import-json --file <path> [--upload <id>]');
      const resolved = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '..', filePath);
      await importVoucherFile(resolved, uploadId);
    } else {
      console.log('Usage: node scripts/data-maintenance.js <clean|import-json> --file <path> [--upload <id>]');
    }
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
