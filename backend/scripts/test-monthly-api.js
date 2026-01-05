// Test the monthly-details endpoint
const API_BASE = 'http://localhost:4000/api';

async function testMonthlyDetails() {
  console.log('Testing Monthly Details API...\n');
  
  // Test March 2025 (we know it has data)
  const month = 3;
  const year = 2025;
  
  try {
    const url = `${API_BASE}/analytics/monthly-details?month=${month}&year=${year}`;
    console.log('Fetching:', url);
    
    const response = await fetch(url);
    console.log('Status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('\n=== API Response ===');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n=== Summary ===');
    console.log('Total Vouchers:', data.summary?.totalVouchers);
    console.log('Total Amount:', data.summary?.totalAmount);
    console.log('Sales Vouchers:', data.summary?.salesVouchers);
    console.log('Active Employees:', data.summary?.activeEmployees);
    console.log('Active Companies:', data.summary?.activeCompanies);
    console.log('Growth:', data.summary?.growth);
    console.log('Top Employees Count:', data.topEmployees?.length);
    console.log('Top Companies Count:', data.topCompanies?.length);
    
  } catch (error) {
    console.error('Fetch error:', error);
  }
}

testMonthlyDetails();
