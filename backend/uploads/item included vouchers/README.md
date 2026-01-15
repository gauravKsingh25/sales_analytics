# Adding Items to Existing Vouchers

This guide explains how to add item-level details (products, quantities, rates) to existing vouchers in the MongoDB database using Excel data.

## Overview

You have vouchers in MongoDB with basic information (party, amount, date) but without item details. You have an Excel file (Sales Register) that contains the same vouchers WITH item details. These scripts help you:

1. **Convert Excel to JSON** - Parse the Excel file and extract item details
2. **Update MongoDB** - Match vouchers by voucher number and add items

## Prerequisites

- Excel file with item details placed in `backend/uploads/item included vouchers/` folder
- Existing vouchers in MongoDB (from your main voucher data)
- Node.js and required packages installed

## Process

### Step 1: Place Your Excel File

Put your Excel file (e.g., `sales-register.xlsx`) in the folder:
```
backend/uploads/item included vouchers/
```

Your Excel file should have columns like:
- Date
- Particulars (party name and item descriptions)
- Vch Type
- Vch No. (voucher number - this is the key!)
- Debit Amount / Credit Amount
- Quantity columns (e.g., "4.00 PCS", "30 BOX")
- Rate columns (e.g., "1050.00/PCS")

### Step 2: Convert Excel to JSON

Run the conversion script:

```bash
node backend/scripts/convert-items-excel-to-json.js <your-excel-file.xlsx>
```

**Example:**
```bash
node backend/scripts/convert-items-excel-to-json.js sales-register-april-june.xlsx
```

This will:
- Read your Excel file
- Parse voucher headers and item rows
- Create a JSON file with the same name (e.g., `sales-register-april-june-with-items.json`)
- Save it in the same folder

**Output:**
```
✅ Successfully converted to JSON
📁 Output file: backend/uploads/item included vouchers/sales-register-april-june-with-items.json

📊 Summary:
   Total vouchers: 150
   Vouchers with items: 145
   Total items: 420
```

### Step 3: Update MongoDB with Items

Run the update script:

```bash
node backend/scripts/update-vouchers-with-items.js <json-file-with-items.json>
```

**Example:**
```bash
node backend/scripts/update-vouchers-with-items.js sales-register-april-june-with-items.json
```

This will:
- Read the JSON file
- For each voucher, find the matching voucher in MongoDB by voucher number
- Add items to the `VoucherItem` collection
- Link items to vouchers via `voucherId`

**Output:**
```
📊 SUMMARY
============================================================
Vouchers processed:     150
Vouchers updated:       145
Vouchers not found:     5
Items added:            420
Items skipped:          0
Errors:                 0
============================================================

✅ Successfully updated vouchers with items!
```

## JSON Format

The intermediate JSON file created by the conversion script looks like:

```json
[
  {
    "Voucher_Number": "ODIN/00663",
    "Date_iso": "2025-03-01",
    "Party": "Skanda Medical and Surgicals (AP)",
    "Vch_Type": "Sales",
    "Debit_Amount": 30548.00,
    "Items": [
      {
        "description": "BATHROOM SCALE (MODEL NO CB-302)",
        "qty": 4.00,
        "unit": "PCS",
        "unitPrice": 1050.00,
        "amount": 4200.00
      },
      {
        "description": "ANTI BEDSORE AIR MATTRESS OAM002 (B)",
        "qty": 6.00,
        "unit": "PCS",
        "unitPrice": 1100.00,
        "amount": 6600.00
      }
    ]
  }
]
```

## MongoDB Schema

After running the scripts, your data will be structured as:

### Voucher Collection
```javascript
{
  _id: ObjectId,
  voucherNumber: "ODIN/00663",
  date: ISODate("2025-03-01"),
  totalAmount: 30548.00,
  companyId: ObjectId (reference to Company),
  // ... other fields
}
```

### VoucherItem Collection
```javascript
{
  _id: ObjectId,
  voucherId: ObjectId (reference to Voucher),
  description: "BATHROOM SCALE (MODEL NO CB-302)",
  qty: 4.00,
  unit: "PCS",
  unitPrice: 1050.00,
  amount: 4200.00,
  hsn: null
}
```

## Troubleshooting

### Vouchers Not Found

If some vouchers are not found in MongoDB:
- Check if the voucher number format matches exactly
- Verify the vouchers were imported in your main seed process
- Check the error list in the summary output

### No Items Detected

If items are not being detected from Excel:
- Verify your Excel format matches the expected structure
- Check that item rows are immediately after the voucher header
- Use `--verbose` flag to see detailed processing: `node scripts/convert-items-excel-to-json.js file.xlsx --verbose`

### Items Already Exist

The script skips vouchers that already have items to avoid duplicates. If you need to re-import:
1. Delete existing items: `db.voucheritems.deleteMany({ voucherId: <voucher_id> })`
2. Re-run the update script

## Verbose Mode

For detailed logging, add `--verbose` flag:

```bash
node backend/scripts/update-vouchers-with-items.js sales-register-with-items.json --verbose
```

This will show:
- Each voucher being processed
- Each item being added
- Detailed error messages
- Skip reasons

## Next Steps

After successfully adding items to vouchers:

1. **Update Backend API** - Modify voucher endpoints to include items
2. **Update Frontend** - Display items in voucher details/tables
3. **Add Item Search** - Enable filtering by product description
4. **Add Analytics** - Product-wise sales reports

## Example: Full Workflow

```bash
# 1. Place Excel file
cp ~/Downloads/sales-register.xlsx "backend/uploads/item included vouchers/"

# 2. Convert to JSON
node backend/scripts/convert-items-excel-to-json.js sales-register.xlsx

# 3. Update MongoDB
node backend/scripts/update-vouchers-with-items.js sales-register-with-items.json

# 4. Verify in MongoDB
mongosh tally --eval "db.voucheritems.countDocuments()"
```

## Files Created

- `backend/scripts/convert-items-excel-to-json.js` - Excel to JSON converter
- `backend/scripts/update-vouchers-with-items.js` - MongoDB updater
- `backend/uploads/item included vouchers/<filename>-with-items.json` - Intermediate JSON

## Notes

- The scripts use **voucher number** as the unique key to match records
- Items are stored in a separate `VoucherItem` collection (not embedded in Voucher)
- Transactions are used for data consistency
- Duplicate prevention: items won't be added twice to the same voucher
- The scripts preserve all your existing voucher data
