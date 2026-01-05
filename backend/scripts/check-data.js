import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../schemas/employee.js';
import Voucher from '../schemas/voucher.js';
import Company from '../schemas/company.js';

dotenv.config();

async function checkData() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const employees = await Employee.countDocuments();
  const vouchers = await Voucher.countDocuments();
  const companies = await Company.countDocuments();
  
  console.log('\n📊 Current Database Status:\n');
  console.log(`   Employees: ${employees}`);
  console.log(`   Vouchers: ${vouchers}`);
  console.log(`   Companies: ${companies}\n`);
  
  if (employees > 0) {
    const sample = await Employee.findOne();
    console.log('Sample Employee:', sample.name);
  }
  
  if (vouchers > 0) {
    const sample = await Voucher.findOne();
    console.log('Sample Voucher:', sample.voucherNumber);
  }
  
  console.log('\n✅ Data is ready for frontend/backend!\n');
  
  await mongoose.connection.close();
  process.exit(0);
}

checkData();
