# Credit Notes in Database

## Overview

Credit notes are now stored in a dedicated `creditnotes` collection in MongoDB. This allows for efficient querying, reporting, and integration with the main application.

## Database Schema

### Collection: `creditnotes`

```javascript
{
  _id: ObjectId,
  creditNoteNumber: String,          // e.g., "1158"
  originalSalesVoucherNumber: String, // Reference to original sale (if any)
  date: Date,                        // ISO date
  dateSerial: Number,                // Excel serial date
  party: String,                     // Customer name (null if cancelled)
  vchType: String,                   // "Credit Note"
  isCancelled: Boolean,              // true/false
  creditAmount: Number,              // Always numeric (0 for cancelled)
  
  details: [                         // Account and staff entries
    {
      staff: String,                 // Staff name (optional)
      account: String,               // Account name (optional)
      amount: Number                 // Transaction amount
    }
  ],
  
  meta: {
    enteredBy: String,               // Who entered the credit note
    grnNo: String,                   // Goods Return Note number
    source: String                   // "Tally Export"
  },
  
  rawOriginal: Object,               // Complete original JSON
  dedupeHash: String,                // Unique hash for deduplication
  
  createdAt: Date,
  updatedAt: Date
}
```

## Seeding Data

### Initial Import

```bash
cd backend
node scripts/seed-credit-notes.js
```

This script:
- ✓ Reads JSON files from `backend/uploads/credit notes/`
- ✓ Imports all credit notes with deduplication
- ✓ Shows detailed statistics
- ✓ Can be run multiple times safely

### Re-importing After Updates

```bash
# If credit note JSON is updated, just re-run:
node scripts/seed-credit-notes.js

# Duplicates are automatically skipped
```

## API Endpoints

### Get All Credit Notes
```
GET /api/creditnotes
```

**Query Parameters:**
- `party` - Filter by party name (case-insensitive)
- `isCancelled` - Filter by cancelled status (true/false)
- `startDate` - Filter from date (YYYY-MM-DD)
- `endDate` - Filter to date (YYYY-MM-DD)
- `grnNo` - Filter by GRN number
- `limit` - Results per page (default: 100)
- `skip` - Skip results (for pagination)
- `sortBy` - Sort field (default: date)
- `sortOrder` - asc/desc (default: desc)

**Example:**
```bash
GET /api/creditnotes?party=99MCG&isCancelled=false&limit=50
```

**Response:**
```json
{
  "data": [...],
  "total": 150,
  "limit": 50,
  "skip": 0
}
```

### Get Single Credit Note
```
GET /api/creditnotes/:id
```

**Response:**
```json
{
  "_id": "...",
  "creditNoteNumber": "1158",
  "party": "99MCG DOT COM",
  "creditAmount": 11254,
  "isCancelled": false,
  "details": [...],
  ...
}
```

### Get Statistics
```
GET /api/creditnotes/stats/summary
```

**Response:**
```json
{
  "overall": {
    "total": 920,
    "active": 917,
    "cancelled": 3,
    "totalCreditAmount": 2450000,
    "avgCreditAmount": 2663.04
  },
  "monthly": [
    {
      "_id": { "year": 2025, "month": 2 },
      "count": 45,
      "totalCredit": 250000
    }
  ],
  "topParties": [
    {
      "_id": "99MCG DOT COM",
      "totalCredit": 245000,
      "count": 15
    }
  ]
}
```

### Get Credit Notes by Party
```
GET /api/creditnotes/party/:partyName
```

**Query Parameters:**
- `includeRaw` - Include raw JSON (true/false, default: false)

**Example:**
```bash
GET /api/creditnotes/party/99MCG DOT COM
```

**Response:**
```json
{
  "party": "99MCG DOT COM",
  "count": 15,
  "totalCredit": 245000,
  "creditNotes": [...]
}
```

## Use Cases

### 1. Net Sales Calculation

When calculating net sales, subtract active credit notes:

```javascript
// Pseudo-code
const salesTotal = calculateTotalSales();
const activeCreditNotes = await CreditNote.find({ isCancelled: false });
const totalCredits = activeCreditNotes.reduce((sum, cn) => sum + cn.creditAmount, 0);
const netSales = salesTotal - totalCredits;
```

### 2. Customer Return Analysis

Find customers with high return rates:

```javascript
const topReturns = await CreditNote.aggregate([
  { $match: { isCancelled: false } },
  {
    $group: {
      _id: '$party',
      totalCredit: { $sum: '$creditAmount' },
      count: { $sum: 1 }
    }
  },
  { $sort: { totalCredit: -1 } }
]);
```

### 3. Staff-wise Credit Analysis

Analyze credit notes by responsible staff:

```javascript
const staffCredits = await CreditNote.aggregate([
  { $unwind: '$details' },
  { $match: { 'details.staff': { $exists: true, $ne: null } } },
  {
    $group: {
      _id: '$details.staff',
      totalCredit: { $sum: '$creditAmount' },
      count: { $sum: 1 }
    }
  }
]);
```

### 4. GRN Tracking

Track Goods Return Notes:

```javascript
const grn = await CreditNote.findOne({ 'meta.grnNo': '1482' });
```

## Indexes

The following indexes are created automatically:

- `creditNoteNumber` - For quick lookup by number
- `date` (descending) - For date-based queries
- `party` - For party-based filtering
- `isCancelled` - For filtering active/cancelled
- `dedupeHash` (unique) - Prevents duplicates
- `meta.grnNo` - For GRN lookups

## Data Integrity

### Cancelled Credit Notes

Cancelled credit notes have:
- `isCancelled: true`
- `creditAmount: 0`
- `party: null`
- `details: []` (empty array)

These should **NOT** be included in net sales calculations.

### Active Credit Notes

Active credit notes have:
- `isCancelled: false`
- `creditAmount: <actual amount>`
- `party: <customer name>`
- `details: [...]` (with account/staff entries)

These **SHOULD** be subtracted from sales.

## Example Queries

### Get all active credit notes for a date range
```javascript
const creditNotes = await CreditNote.find({
  isCancelled: false,
  date: {
    $gte: new Date('2024-04-01'),
    $lte: new Date('2025-03-31')
  }
});
```

### Get total credit amount by month
```javascript
const monthly = await CreditNote.aggregate([
  { $match: { isCancelled: false } },
  {
    $group: {
      _id: {
        year: { $year: '$date' },
        month: { $month: '$date' }
      },
      total: { $sum: '$creditAmount' },
      count: { $sum: 1 }
    }
  },
  { $sort: { '_id.year': 1, '_id.month': 1 } }
]);
```

### Find credit notes entered by specific person
```javascript
const notes = await CreditNote.find({
  'meta.enteredBy': 'Ashu',
  isCancelled: false
}).sort({ date: -1 });
```

## Future Enhancements

Possible features to add:

1. **Link to Original Vouchers**: Match credit notes with original sales vouchers
2. **Approval Workflow**: Add approval status and approver fields
3. **Attachments**: Store scanned copies or supporting documents
4. **Reversal Tracking**: Link credit notes that reverse other credit notes
5. **Customer Dashboard**: Show credit history per customer
6. **Staff Performance**: Credit rate per staff member
