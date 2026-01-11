# Backend Scripts

This directory contains utility scripts for data manipulation and maintenance.

## Available Scripts

### `seed-credit-notes.js`

**NEW** - Seeds credit notes from JSON files into MongoDB.

#### Purpose

Imports credit note data from the `uploads/credit notes/` folder into a dedicated `creditnotes` collection in MongoDB.

#### Features

- Reads all credit note JSON files from `uploads/credit notes/` folder
- Handles both active and cancelled credit notes
- Deduplication using hash-based system
- Preserves complete original JSON in `rawOriginal` field
- Extracts and indexes key fields (party, date, GRN, etc.)
- Provides detailed statistics and top parties report

#### Usage

```bash
cd backend
node scripts/seed-credit-notes.js
```

#### What it Does

1. Reads all `.json` files from `backend/uploads/credit notes/` folder
2. For each credit note:
   - Generates deduplication hash
   - Parses date (ISO or Excel serial)
   - Extracts details (staff and account entries)
   - Stores metadata (Entered By, GRN No)
   - Preserves original JSON
3. Prevents duplicates automatically
4. Shows statistics:
   - Total/Active/Cancelled counts
   - Total credit amount
   - Top 10 parties by credit amount

#### Database Schema

```javascript
{
  creditNoteNumber: String,
  originalSalesVoucherNumber: String,
  date: Date,
  party: String,
  isCancelled: Boolean,
  creditAmount: Number,
  details: [{ staff, account, amount }],
  meta: { enteredBy, grnNo, source },
  rawOriginal: Object
}
```

#### Example Output

```
📊 Summary:
Total credit notes found:  920
✓ Successfully inserted:   920
⊘ Duplicates skipped:      0

📈 Database Statistics:
Total credit notes in DB:  920
Active credit notes:       917
Cancelled credit notes:    3
Total credit amount:       ₹2,450,000.00

🏢 Top 10 Parties by Credit Amount:
1. 99MCG DOT COM
   Credit: ₹245,000.00 (15 notes)
```

---

### `aggregate-staff-parties.js`

**NEW** - Aggregates parties by staff from vouchers and updates employee records.

#### Purpose

Creates a mapping of which parties (customers) each staff member is responsible for based on their voucher history.

#### Features

- Scans all vouchers and extracts party-staff relationships
- Counts unique parties per staff member
- Calculates total sales per staff
- Updates employee metadata with responsible parties list
- Matches staff names from vouchers to employee records

#### Usage

```bash
cd backend
node scripts/aggregate-staff-parties.js
```

#### Output

- Console output showing staff-party mapping
- Updates `Employee.metadata.responsibleParties` with array of party names
- Updates `Employee.metadata.partiesCount` with count

#### API Endpoints

After running this script, the following endpoints provide party data:

- `GET /api/employees/:id/details` - Includes `responsibleParties` array
- `GET /api/employees/parties/by-staff` - All staff with their parties

---

### `seed-vouchers.js`

Seeds MongoDB database with voucher data from JSON files in the uploads/ folder.

#### Features

1. **Complete Data Migration**: Reads all JSON files from uploads/ folder and seeds database
2. **No Data Loss**: Preserves complete voucher JSON in `rawOriginal` field
3. **Unique Keys**: Ensures all keys within a voucher are unique (party 1, party 2, etc.)
4. **Employee Extraction**: Automatically extracts all unique employee names
5. **Proper Relationships**: Maintains relationships between vouchers, employees, and companies

#### Usage

Run from the **backend** directory:

```bash
cd backend

# Seed database from JSON files
node scripts/seed-vouchers.js

# Seed with verbose output
node scripts/seed-vouchers.js --verbose
```

#### What it Does

1. Reads all `.json` files from `backend/uploads/` folder
2. Extracts unique employee names from voucher details
3. Creates employee records in database
4. Processes each voucher:
   - Makes all keys unique within the voucher
   - Stores original data in `rawOriginal`
   - Stores unique-key version in `rawUnique`
   - Creates company records
   - Creates voucher items (accounts)
   - Creates voucher participants (staff)
5. Prevents duplicates using hash-based deduplication

#### Expected JSON Format

```json
[
  {
    "Voucher_Number": "V001",
    "Date_iso": "2024-04-15",
    "Party": "ABC Company",
    "Vch_Type": "Sales",
    "Debit_Amount": 1000,
    "Details": [
      { "Staff": "John Doe", "Amount": 500, "Type": "Dr" },
      { "Account": "Sales Account", "Amount": 500 }
    ]
  }
]
```

### `clean-and-migrate-data.js`

Comprehensive data manipulation script for MongoDB database management.

#### Features

1. **Database Cleanup**: Completely clean all data from MongoDB
2. **Data Backup**: Backup all collections to JSON files
3. **Duplicate Key Fix**: Ensure all object keys within a voucher are unique
4. **Data Verification**: Check data integrity and find issues

#### Usage

Run from the **backend** directory:

```bash
cd backend

# Clean all data from database
node scripts/clean-and-migrate-data.js --clean

# Backup data before cleanup
node scripts/clean-and-migrate-data.js --backup --clean

# Verify data integrity
node scripts/clean-and-migrate-data.js --verify

# Fix duplicate keys in existing vouchers
node scripts/clean-and-migrate-data.js --fix-duplicates

# Show help
node scripts/clean-and-migrate-data.js --help
```

#### How Unique Keys Work

The script ensures that within a single voucher, all object keys are unique. If duplicates are found, they are renamed with a counter:

**Before:**
```json
{
  "Party": "ABC Company",
  "Details": [
    { "Staff": "John Doe", "Amount": 1000 },
    { "Staff": "John Doe", "Amount": 2000 },
    { "Account": "Sales", "Amount": 500 },
    { "Account": "Sales", "Amount": 300 }
  ]
}
```

**After:**
```json
{
  "Party": "ABC Company",
  "Details": [
    { "Staff": "John Doe", "Amount": 1000 },
    { "Staff": "John Doe 2", "Amount": 2000 },
    { "Account": "Sales", "Amount": 500 },
    { "Account": "Sales 2", "Amount": 300 }
  ]
}
```

#### Environment Variables

- `MONGO_URI`: MongoDB connection string (default: `mongodb://localhost:27017/tally`)

### Other Scripts

- **`seed.js`**: Seed initial data
- **`excel-to-json.js`**: Convert Excel files to JSON
- **`data-maintenance.js`**: Maintenance utilities

## Important Notes

⚠️ **Warning**: The `--clean` option will permanently delete all data from your MongoDB database. Always backup your data first using `--backup`.

✅ **Recommendation**: Always verify data integrity after making changes:
```bash
cd backend
node scripts/clean-and-migrate-data.js --verify
```
