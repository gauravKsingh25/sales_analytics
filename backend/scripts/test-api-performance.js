import { performance } from 'perf_hooks';

const API_BASE = 'http://localhost:4000/api';

async function testAPI() {
  console.log('='.repeat(60));
  console.log('  API ENDPOINT PERFORMANCE TEST');
  console.log('='.repeat(60));
  console.log('');

  try {
    // Test 1: Health check
    console.log('Test 1: Health Check');
    let start = performance.now();
    let response = await fetch(`${API_BASE}/health`);
    let end = performance.now();
    
    if (response.ok) {
      console.log(`  ✓ Status: ${response.status}`);
      console.log(`  Time: ${(end - start).toFixed(2)}ms\n`);
    } else {
      console.log(`  ❌ Failed: ${response.status}\n`);
    }

    // Test 2: Get vouchers (page 1)
    console.log('Test 2: GET /vouchers (page 1, limit 25)');
    start = performance.now();
    response = await fetch(`${API_BASE}/vouchers?page=1&limit=25`);
    end = performance.now();
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✓ Status: ${response.status}`);
      console.log(`  Vouchers returned: ${data.data?.length || 0}`);
      console.log(`  Total vouchers: ${data.pagination?.total || 0}`);
      console.log(`  Pages: ${data.pagination?.pages || 0}`);
      console.log(`  Response time: ${(end - start).toFixed(2)}ms`);
      console.log(`  Response size: ${JSON.stringify(data).length} bytes\n`);
    } else {
      console.log(`  ❌ Failed: ${response.status}\n`);
    }

    // Test 3: Get vouchers with filter
    console.log('Test 3: GET /vouchers with voucherNumber filter');
    start = performance.now();
    response = await fetch(`${API_BASE}/vouchers?page=1&limit=25&voucherNumber=1001`);
    end = performance.now();
    
    if (response.ok) {
      const data = await response.json();
      console.log(`  ✓ Status: ${response.status}`);
      console.log(`  Vouchers returned: ${data.data?.length || 0}`);
      console.log(`  Response time: ${(end - start).toFixed(2)}ms\n`);
    } else {
      console.log(`  ❌ Failed: ${response.status}\n`);
    }

    // Test 4: Get specific voucher with items
    console.log('Test 4: GET /vouchers/:id (single voucher with items)');
    
    // First get a voucher ID
    response = await fetch(`${API_BASE}/vouchers?page=1&limit=1`);
    const listData = await response.json();
    const voucherId = listData.data[0]?._id;
    
    if (voucherId) {
      start = performance.now();
      response = await fetch(`${API_BASE}/vouchers/${voucherId}`);
      end = performance.now();
      
      if (response.ok) {
        const data = await response.json();
        console.log(`  ✓ Status: ${response.status}`);
        console.log(`  Items: ${data.items?.length || 0}`);
        console.log(`  Employees: ${data.employees?.length || 0}`);
        console.log(`  Response time: ${(end - start).toFixed(2)}ms\n`);
      } else {
        console.log(`  ❌ Failed: ${response.status}\n`);
      }
    } else {
      console.log(`  ⚠️  No vouchers found to test\n`);
    }

    // Test 5: Get voucher items endpoint
    if (voucherId) {
      console.log('Test 5: GET /vouchers/:id/items (lazy load items)');
      start = performance.now();
      response = await fetch(`${API_BASE}/vouchers/${voucherId}/items`);
      end = performance.now();
      
      if (response.ok) {
        const items = await response.json();
        console.log(`  ✓ Status: ${response.status}`);
        console.log(`  Items returned: ${items?.length || 0}`);
        console.log(`  Response time: ${(end - start).toFixed(2)}ms\n`);
      } else {
        console.log(`  ❌ Failed: ${response.status}\n`);
      }
    }

    // Test 6: Multiple page loads simulation
    console.log('Test 6: Sequential page loads (pages 1-3)');
    const pageTimes = [];
    for (let page = 1; page <= 3; page++) {
      start = performance.now();
      response = await fetch(`${API_BASE}/vouchers?page=${page}&limit=25`);
      end = performance.now();
      
      if (response.ok) {
        const time = (end - start).toFixed(2);
        pageTimes.push(time);
        console.log(`  Page ${page}: ${time}ms`);
      }
    }
    const avgTime = (pageTimes.reduce((a, b) => parseFloat(a) + parseFloat(b), 0) / pageTimes.length).toFixed(2);
    console.log(`  Average: ${avgTime}ms\n`);

    console.log('='.repeat(60));
    console.log('✅ All API tests completed!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.log('\n⚠️  Make sure the backend server is running on http://localhost:4000');
    process.exit(1);
  }
}

testAPI();
