import mongoose from 'mongoose';

const creditNoteSchema = new mongoose.Schema({
  creditNoteNumber: { type: String, required: true },
  originalSalesVoucherNumber: { type: String },
  date: { type: Date, required: true },
  dateSerial: { type: Number },
  party: { type: String },
  vchType: { type: String, default: 'Credit Note' },
  isCancelled: { type: Boolean, default: false },
  creditAmount: { type: Number, required: true, default: 0 },
  
  // Details array for account and staff entries
  details: [{
    staff: { type: String },
    account: { type: String },
    amount: { type: Number }
  }],
  
  // Metadata
  meta: {
    enteredBy: { type: String },
    grnNo: { type: String },
    source: { type: String, default: 'Tally Export' }
  },
  
  // Store original JSON for reference
  rawOriginal: { type: Object, required: true },
  
  // Hash for deduplication
  dedupeHash: { type: String, required: true, unique: true }
}, { timestamps: true });

// Indexes
creditNoteSchema.index({ creditNoteNumber: 1 });
creditNoteSchema.index({ date: -1 });
creditNoteSchema.index({ party: 1 });
creditNoteSchema.index({ isCancelled: 1 });
creditNoteSchema.index({ dedupeHash: 1 }, { unique: true });
creditNoteSchema.index({ 'meta.grnNo': 1 });

export default mongoose.model('CreditNote', creditNoteSchema);
