# Credit Notes Conversion

This folder contains credit note data and conversion scripts.

## Files

- `convert-credit-notes.js` - Script to convert Excel files to JSON format
- `credit note 1-4-24 to 31-3-25.xls` - Source Excel file
- `credit note 1-4-24 to 31-3-25.json` - Generated JSON output (920 credit notes)

## Usage

Run the conversion script from the project root:

```bash
node "backend/uploads/credit notes/convert-credit-notes.js"
```

Or from the credit notes folder:

```bash
cd "backend/uploads/credit notes"
node convert-credit-notes.js
```

## Features

✅ **Correctly handles cancelled credit notes** - Sets `Is_Cancelled: true` and `Credit_Amount: 0`  
✅ **Properly extracts Credit_Amount** - Always numeric, never null  
✅ **Parses Entered_By correctly** - Extracts name from "Entered By :" row  
✅ **Captures Details array** - Includes staff and account entries with amounts  
✅ **Extracts metadata** - GRN numbers, entry personnel  
✅ **Automatic detection** - Processes both .xls and .xlsx files  

## Output Format

## Output Format

The script converts credit note Excel files to JSON with the following structure:

### Active Credit Note Example

```json
{
  "Credit_Note_Number": "1158",
  "Original_Sales_Voucher_Number": null,
  "Date_iso": "2025-02-06",
  "Date_serial": 45694,
  "Party": "99MCG  DOT COM",
  "Vch_Type": "Credit Note",
  "Is_Cancelled": false,
  "Credit_Amount": 11254,
  "Details": [
    {
      "Staff": "Siddharth Sharma",
      "Amount": -11254
    },
    {
      "Account": "LOCAL SALE",
      "Amount": -9992
    },
    {
      "Account": "CGST OUTPUT",
      "Amount": -631.08
    },
    {
      "Account": "SGST OUTPUT",
      "Amount": -631.08
    },
    {
      "Account": "R.OFF",
      "Amount": 0.16
    },
    {
      "Staff": "Siddharth Sharma",
      "Amount": -0.16
    }
  ],
  "Meta": {
    "Entered_By": "Ashu",
    "GRN_No": "1482",
    "Source": "Tally Export"
  }
}
```

### Cancelled Credit Note Example

```json
{
  "Credit_Note_Number": "719",
  "Original_Sales_Voucher_Number": null,
  "Date_iso": "2024-07-21",
  "Date_serial": 45494,
  "Party": null,
  "Vch_Type": "Credit Note",
  "Is_Cancelled": true,
  "Credit_Amount": 0,
  "Details": [],
  "Meta": {
    "Entered_By": "Ashu",
    "GRN_No": "1037",
    "Source": "Tally Export"
  }
}
```

## Important Notes

### Net Sales Calculation

When calculating net sales, use the following logic:

```javascript
if (creditNote.Is_Cancelled) {
  // Ignore cancelled credit notes
} else {
  // Subtract Credit_Amount from sales
  netSales -= creditNote.Credit_Amount;
}
```

### Field Definitions

- **Is_Cancelled**: `true` for cancelled notes (marked with "(cancelled)" in Excel), `false` otherwise
- **Credit_Amount**: Always numeric. `0` for cancelled notes, actual amount for active notes
- **Party**: The customer name (null for cancelled notes)
- **Details**: Array of account and staff entries (empty for cancelled notes)
- **Meta.Entered_By**: Person who entered the credit note (parsed from "Entered By :" row)
- **Meta.GRN_No**: Goods Return Note number

## Features

- Automatically detects Excel files (.xls and .xlsx)
- Converts dates to ISO format
- Identifies staff vs account entries
- Extracts metadata (GRN No, Entered By)
- Handles negative amounts for credit notes
- Outputs JSON in the same folder
