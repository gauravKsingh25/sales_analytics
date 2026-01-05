import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import ExcelJS from 'exceljs';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import after env loaded
const { default: Voucher } = await import('../schemas/voucher.js');
const { default: VoucherItem } = await import('../schemas/voucheritem.js');
const { default: VoucherParticipant } = await import('../schemas/voucherparticipant.js');
const { default: Employee } = await import('../schemas/employee.js');

async function testExcelParsing() {
  console.log('\n📊 Testing Excel Parsing...\n');
  
  const testFiles = [
    path.join(__dirname, '../uploads/APRIL TO JUNE 2024-25.xlsx'),
    path.join(__dirname, '../uploads/sample_vouchers.xlsx')
  ];

  for (const filePath of testFiles) {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${path.basename(filePath)}`);
      continue;
    }

    console.log(`Testing: ${path.basename(filePath)}`);
    const start = performance.now();

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const sheet = workbook.worksheets[0];
      if (!sheet) {
        console.log('  ❌ No worksheet found');
        continue;
      }

      let voucherCount = 0;
      let rowCount = 0;
      
      sheet.eachRow((row, rowNumber) => {
        rowCount++;
        const values = row.values;
        // Check if it's a voucher header (has voucher number)
        if (values && values.some(v => 
          v && typeof v === 'string' && /^\d{4,}$/.test(v.trim())
        )) {
          voucherCount++;
        }
      });

      const end = performance.now();
      const duration = (end - start).toFixed(2);

      console.log(`  ✓ Parsed successfully`);
      console.log(`    - Rows: ${rowCount}`);
      console.log(`    - Estimated vouchers: ${voucherCount}`);
      console.log(`    - Parse time: ${duration}ms`);
      console.log(`    - Format: ${workbook.xlsx ? 'XLSX' : 'Unknown'}`);
      
      // Check JSON equivalent
      const jsonPath = filePath.replace('.xlsx', '.json');
      if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        console.log(`    - JSON vouchers: ${jsonData.length}`);
        
        if (jsonData.length > 0) {
          const sample = jsonData[0];
          console.log(`    - Sample structure:`, Object.keys(sample));
        }
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
    }
    console.log('');
  }
}

async function testVoucherLoadPerformance() {
  console.log('\n⚡ Testing Voucher Load Performance...\n');
  
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✓ Connected to MongoDB\n');

  // Test 1: Count query
  console.log('Test 1: Count total vouchers');
  let start = performance.now();
  const totalCount = await Voucher.countDocuments({});
  let end = performance.now();
  console.log(`  Result: ${totalCount} vouchers`);
  console.log(`  Time: ${(end - start).toFixed(2)}ms\n`);

  // Test 2: Paginated query (old method - without aggregation)
  console.log('Test 2: Fetch 25 vouchers (basic query)');
  start = performance.now();
  const vouchersBasic = await Voucher.find({})
    .sort({ date: -1 })
    .limit(25)
    .lean();
  end = performance.now();
  console.log(`  Result: ${vouchersBasic.length} vouchers`);
  console.log(`  Time: ${(end - start).toFixed(2)}ms\n`);

  // Test 3: With related data (old N+1 approach)
  console.log('Test 3: Fetch 25 vouchers with items & employees (N+1 queries)');
  start = performance.now();
  
  const vouchersWithData = await Voucher.find({})
    .sort({ date: -1 })
    .limit(25)
    .lean();
  
  const voucherIds = vouchersWithData.map(v => v._id);
  const [items, participants] = await Promise.all([
    VoucherItem.find({ voucherId: { $in: voucherIds } }).lean(),
    VoucherParticipant.find({ voucherId: { $in: voucherIds } }).lean()
  ]);
  
  const employeeIds = [...new Set(participants.map(p => p.employeeId))];
  const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();
  
  end = performance.now();
  console.log(`  Result: ${vouchersWithData.length} vouchers`);
  console.log(`  Items fetched: ${items.length}`);
  console.log(`  Participants: ${participants.length}`);
  console.log(`  Employees: ${employees.length}`);
  console.log(`  Time: ${(end - start).toFixed(2)}ms\n`);

  // Test 4: Optimized aggregation query
  console.log('Test 4: Fetch 25 vouchers (optimized aggregation)');
  start = performance.now();
  
  const aggregatedVouchers = await Voucher.aggregate([
    { $sort: { date: -1 } },
    { $limit: 25 },
    {
      $lookup: {
        from: 'voucherparticipants',
        localField: '_id',
        foreignField: 'voucherId',
        as: 'participants'
      }
    },
    {
      $lookup: {
        from: 'employees',
        localField: 'participants.employeeId',
        foreignField: '_id',
        as: 'employeeData'
      }
    },
    {
      $project: {
        voucherNumber: 1,
        date: 1,
        totalAmount: 1,
        currency: 1,
        'employees.name': 1
      }
    }
  ]);
  
  end = performance.now();
  console.log(`  Result: ${aggregatedVouchers.length} vouchers`);
  console.log(`  Time: ${(end - start).toFixed(2)}ms\n`);

  // Test 5: Index usage check
  console.log('Test 5: Check index usage');
  const explainResult = await Voucher.find({})
    .sort({ date: -1 })
    .limit(25)
    .explain('executionStats');
  
  console.log(`  Execution time: ${explainResult.executionStats.executionTimeMillis}ms`);
  console.log(`  Documents examined: ${explainResult.executionStats.totalDocsExamined}`);
  console.log(`  Documents returned: ${explainResult.executionStats.nReturned}`);
  console.log(`  Index used: ${explainResult.executionStats.executionStages.indexName || 'COLLSCAN (no index!)'}\n`);

  // Test 6: Filter query performance
  console.log('Test 6: Filter by voucher number (indexed)');
  start = performance.now();
  const filteredVouchers = await Voucher.find({ 
    voucherNumber: { $regex: '1001', $options: 'i' } 
  }).limit(10).lean();
  end = performance.now();
  console.log(`  Result: ${filteredVouchers.length} vouchers`);
  console.log(`  Time: ${(end - start).toFixed(2)}ms\n`);

  await mongoose.connection.close();
  console.log('✓ Database connection closed\n');
}

async function runTests() {
  try {
    console.log('='.repeat(60));
    console.log('  TALLY SOFTWARE - UPLOAD & PERFORMANCE TEST');
    console.log('='.repeat(60));

    await testExcelParsing();
    await testVoucherLoadPerformance();

    console.log('='.repeat(60));
    console.log('✅ All tests completed!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

runTests();
