import crypto from 'crypto';

import dotenv from 'dotenv';
import mongoose from 'mongoose';

import Employee from '../schemas/employee.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tally';

async function updateEmployeeCodes() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  const employees = await Employee.find({ employeeCode: { $exists: false } });
  console.log(`📊 Found ${employees.length} employees without employee codes\n`);

  let updated = 0;
  for (const employee of employees) {
    const employeeCode = 'EMP' + crypto.randomBytes(4).toString('hex').toUpperCase();
    await Employee.findByIdAndUpdate(employee._id, { employeeCode });
    console.log(`✅ Updated ${employee.name} with code: ${employeeCode}`);
    updated++;
  }

  console.log(`\n✨ Updated ${updated} employees with unique codes\n`);
  
  await mongoose.connection.close();
  process.exit(0);
}

updateEmployeeCodes().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
