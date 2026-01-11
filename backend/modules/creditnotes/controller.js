import express from 'express';
import CreditNote from '../../schemas/creditnote.js';

const router = express.Router();

// Get all credit notes with optional filters
router.get('/', async (req, res) => {
  try {
    const {
      party,
      isCancelled,
      startDate,
      endDate,
      grnNo,
      limit = 100,
      skip = 0,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (party) {
      query.party = new RegExp(party, 'i');
    }
    
    if (isCancelled !== undefined) {
      query.isCancelled = isCancelled === 'true';
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    if (grnNo) {
      query['meta.grnNo'] = grnNo;
    }

    // Execute query
    const creditNotes = await CreditNote.find(query)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    // Get total count
    const total = await CreditNote.countDocuments(query);

    res.json({
      data: creditNotes,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Error fetching credit notes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single credit note by ID
router.get('/:id', async (req, res) => {
  try {
    const creditNote = await CreditNote.findById(req.params.id);
    if (!creditNote) {
      return res.status(404).json({ message: 'Credit note not found' });
    }
    res.json(creditNote);
  } catch (error) {
    console.error('Error fetching credit note:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get credit notes statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await CreditNote.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          cancelled: { $sum: { $cond: ['$isCancelled', 1, 0] } },
          active: { $sum: { $cond: ['$isCancelled', 0, 1] } },
          totalCreditAmount: { $sum: '$creditAmount' },
          avgCreditAmount: { $avg: '$creditAmount' }
        }
      }
    ]);

    // Get monthly breakdown
    const monthlyStats = await CreditNote.aggregate([
      { $match: { isCancelled: false } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 },
          totalCredit: { $sum: '$creditAmount' }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]);

    // Top parties
    const topParties = await CreditNote.aggregate([
      { $match: { isCancelled: false, party: { $ne: null } } },
      {
        $group: {
          _id: '$party',
          totalCredit: { $sum: '$creditAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalCredit: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      overall: stats[0] || {},
      monthly: monthlyStats,
      topParties
    });
  } catch (error) {
    console.error('Error fetching credit note stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get credit notes by party
router.get('/party/:partyName', async (req, res) => {
  try {
    const { partyName } = req.params;
    const { includeRaw = false } = req.query;

    const projection = includeRaw === 'true' ? {} : { rawOriginal: 0 };

    const creditNotes = await CreditNote.find({
      party: new RegExp(partyName, 'i'),
      isCancelled: false
    }, projection)
      .sort({ date: -1 })
      .lean();

    const totalCredit = creditNotes.reduce((sum, cn) => sum + cn.creditAmount, 0);

    res.json({
      party: partyName,
      count: creditNotes.length,
      totalCredit,
      creditNotes
    });
  } catch (error) {
    console.error('Error fetching party credit notes:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
