# Party Transaction Modal Feature

## Overview
This feature adds clickable party names throughout the application that open a modal showing all transactions (both sales vouchers and credit notes) for that party.

## Implementation Details

### Backend Changes

1. **New API Endpoint**: `GET /api/vouchers/party/:partyName/transactions`
   - Location: `backend/modules/vouchers/controller.js` - `getPartyTransactions` function
   - Returns combined transactions from both vouchers and credit notes
   - Sorted by date (newest first)
   - Includes summary statistics:
     - Total sales amount
     - Total credit notes amount
     - Net amount (sales - credit notes)
     - Transaction counts

2. **Routes Update**:
   - Created `backend/modules/vouchers/routes.js` with proper route definitions
   - Updated `backend/src/routes/index.js` to use the new routes file

### Frontend Changes

1. **New Component**: `frontend/components/PartyTransactionModal.js`
   - Reusable modal component for displaying party transactions
   - Features:
     - Summary cards showing sales, credit notes, net amount, and total transactions
     - Transaction table with voucher type badges (Sales/Credit Note)
     - Date sorting (newest first)
     - Color-coded amounts (green for sales, red for credit notes)
     - Cancelled credit notes shown with reduced opacity

2. **Updated Pages**:
   - **Employee Detail Page** (`frontend/app/employees/[id]/page.js`):
     - Responsible parties are now clickable buttons
     - Added hover effects and visual feedback
     - Integrated PartyTransactionModal

   - **Vouchers Page** (`frontend/app/vouchers/page.js`):
     - Party names in voucher details are now clickable links
     - Added PartyTransactionModal integration

   - **Dashboard Page** (`frontend/app/page.js`):
     - Prepared for party click handling
     - Added PartyTransactionModal integration

## Features

### Modal Display
- **Summary Cards**:
  - Total Sales (green)
  - Credit Notes (red)
  - Net Amount (emerald, highlighted)
  - Total Transactions

- **Transaction Table**:
  - Columns: Date, Type, Voucher Number, Company, Amount
  - Date formatting: "Jan 12, 2026" style
  - Type badges: Color-coded by transaction type
  - Amount formatting: Currency with proper colors
  - Cancelled credit notes: Gray badge with reduced opacity

### User Experience
- Click any party name to view all their transactions
- Modal opens with loading state
- Comprehensive transaction history at a glance
- Clear distinction between sales and credit notes
- Net revenue calculation per party

## API Response Format

```json
{
  "party": "PARTY NAME",
  "transactions": [
    {
      "_id": "...",
      "type": "voucher" | "creditnote",
      "voucherType": "Sales Invoice" | "Credit Note",
      "date": "2024-04-15T00:00:00.000Z",
      "voucherNumber": "SI-001",
      "party": "PARTY NAME",
      "amount": 50000,
      "company": "Company Name",
      "isCancelled": false
    }
  ],
  "summary": {
    "totalTransactions": 25,
    "totalVouchers": 20,
    "totalCreditNotes": 5,
    "totalSales": 1000000,
    "totalCreditNotes": 50000,
    "netAmount": 950000
  }
}
```

## Testing

1. Navigate to Employee Detail page
2. Click on any party in the "Responsible Parties" section
3. Modal should open showing all transactions for that party
4. Verify both sales vouchers and credit notes are displayed
5. Check that transactions are sorted by date (newest first)
6. Verify summary cards show correct totals

Similarly test from:
- Voucher details (click party name)
- Dashboard monthly details (future enhancement)

## Database Queries

The backend performs two queries and combines results:
1. Find all vouchers where `rawOriginal.Party` matches
2. Find all credit notes where `party` matches
3. Merge, format, and sort by date descending

Performance: Uses indexes on `party` and `date` fields for fast lookups.
