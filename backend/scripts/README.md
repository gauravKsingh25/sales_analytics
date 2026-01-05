# Backend Scripts

This directory contains utility scripts for data manipulation and maintenance.

## Available Scripts

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
