# Party-Staff Mapping System

## Overview

This system automatically identifies which parties (customers) each staff member is responsible for based on their voucher transaction history.

## How It Works

### 1. Data Collection

The system scans all vouchers in MongoDB and looks for:
- **Party field**: The customer name from each voucher
- **Details array**: Staff entries within each voucher

### 2. Aggregation Logic

For each voucher:
```javascript
{
  "Party": "S.R BIOTECH",
  "Details": [
    { "Staff": "Rahul Sharma Uk", "Amount": 70324 },
    // ... other entries
  ]
}
```

The system creates a mapping: `Rahul Sharma Uk` → `S.R BIOTECH`

### 3. Storage

#### In Employee Metadata
```javascript
{
  "metadata": {
    "responsibleParties": ["99MCG DOT COM", "AARMEDICA", "S.R BIOTECH"],
    "partiesCount": 3
  }
}
```

#### Via API Endpoints
- **Employee Details**: `GET /api/employees/:id/details`
  - Returns `responsibleParties` array
  - Includes stats: `partiesCount`

- **All Staff-Party Mapping**: `GET /api/employees/parties/by-staff`
  - Returns all staff with their parties
  - Sorted by total sales
  - Includes employee links if matched

## Running the Aggregation

### One-Time Setup
```bash
cd backend
node scripts/aggregate-staff-parties.js
```

### What Happens
1. ✓ Reads all vouchers from MongoDB
2. ✓ Extracts party-staff relationships
3. ✓ Counts unique parties per staff
4. ✓ Calculates total sales per staff
5. ✓ Matches staff names to employee records
6. ✓ Updates employee metadata

### Output Example
```
=== Staff-Party Mapping ===

Rahul Sharma Uk (45 parties)
  Parties: AARMEDICA, AKITA HEALTHCARE, APEX LABS, ... and 40 more

Siddharth Sharma (32 parties)
  Parties: 99MCG DOT COM, BIOMEDICAL, HEALTHCARE PLUS, ... and 27 more

=== Updating Employee Records ===

✓ Updated: Rahul Sharma Uk -> Rahul Sharma (45 parties)
✓ Updated: Siddharth Sharma -> Siddharth Sharma (32 parties)
```

## Frontend Display

### Employee Details Page

When viewing an employee, you'll see:

1. **Stats Card**: "Responsible Parties" with count
2. **Parties Section**: Grid showing all parties with:
   - Party initial in colored circle
   - Full party name
   - Hover effects

### API Response
```json
{
  "employee": { ... },
  "responsibleParties": [
    "99MCG DOT COM",
    "AARMEDICA",
    "S.R BIOTECH"
  ],
  "stats": {
    "partiesCount": 3,
    "totalVouchers": 150,
    "salesVouchersCount": 120
  }
}
```

## Use Cases

### 1. Territory Management
- Identify which customers each sales rep handles
- Prevent customer assignment conflicts
- Track customer coverage

### 2. Performance Analysis
- See customer portfolio per employee
- Identify high-value customer relationships
- Analyze customer concentration

### 3. Team Planning
- Assign new customers to appropriate staff
- Balance workload across team members
- Identify coverage gaps

## Technical Details

### Database Schema

**Employee Schema** (updated):
```javascript
{
  name: String,
  employeeCode: String,
  metadata: {
    responsibleParties: [String],  // Array of party names
    partiesCount: Number            // Count for quick access
  }
}
```

### Performance

- Aggregation runs in ~2-5 seconds for 10,000+ vouchers
- Results cached in employee metadata
- API queries are fast (indexed lookups)

## Maintenance

### When to Re-run

Run the aggregation script when:
- ✓ New vouchers are imported
- ✓ Voucher data is corrected/updated
- ✓ New employees are added
- ✓ Party names are normalized

### Automation (Future)

Consider running this script:
- After each data import
- As a scheduled daily job
- Via webhook after voucher updates

## Troubleshooting

### Staff Not Matched to Employee

**Issue**: Script shows "Not found in DB: John Doe"

**Causes**:
- Name spelling different in voucher vs employee record
- Extra spaces or special characters
- Staff not yet in employee database

**Solution**:
```bash
# Check employee normalized names
db.employees.find({}, { name: 1, normalized: 1 })

# Add missing employees manually or via employee management page
```

### Empty Parties List

**Issue**: Employee has 0 parties

**Causes**:
- No vouchers associated with this employee
- Employee name mismatch in vouchers
- VoucherParticipant records missing

**Solution**:
```bash
# Check voucher participants
db.voucherparticipants.find({ employeeId: <employeeId> })

# Re-run voucher seed if needed
node scripts/seed-vouchers.js
```

## Example Query

### Get Staff with Most Parties
```javascript
// Via API
GET /api/employees/parties/by-staff

// Response sorted by totalSales
[
  {
    "staffName": "Rahul Sharma Uk",
    "employee": { ... },
    "partiesCount": 45,
    "parties": [...],
    "totalSales": 5234567,
    "voucherCount": 234
  }
]
```

### Get Parties for Specific Employee
```javascript
// Via API
GET /api/employees/507f1f77bcf86cd799439011/details

// Response includes
{
  "responsibleParties": ["Party 1", "Party 2", ...],
  "stats": {
    "partiesCount": 15
  }
}
```
