
import express from 'express';
import Voucher from '../../schemas/voucher.js';
import VoucherItem from '../../schemas/voucheritem.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';
import Employee from '../../schemas/employee.js';
import Company from '../../schemas/company.js';
import CreditNote from '../../schemas/creditnote.js';
const router = express.Router();

// GET all transactions (vouchers + credit notes) for a specific party
export const getPartyTransactions = async (req, res) => {
  try {
    const { partyName } = req.params;
    
    if (!partyName) {
      return res.status(400).json({ message: 'Party name is required' });
    }

    // Decode URL-encoded party name
    const decodedPartyName = decodeURIComponent(partyName);
    
    // Escape special regex characters to prevent regex interpretation
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const escapedPartyName = escapeRegex(decodedPartyName);

    // Fetch all vouchers for this party using exact match (case-insensitive)
    const vouchers = await Voucher.find({
      'rawOriginal.Party': { $regex: new RegExp(`^${escapedPartyName}$`, 'i') }
    })
      .populate('companyId')
      .lean();

    // Fetch all credit notes for this party
    const creditNotes = await CreditNote.find({
      party: { $regex: new RegExp(`^${escapedPartyName}$`, 'i') }
    }).lean();

    // Combine and format transactions
    const transactions = [];

    // Add vouchers
    vouchers.forEach(voucher => {
      transactions.push({
        _id: voucher._id,
        type: 'voucher',
        voucherType: voucher.rawOriginal?.Vch_Type || 'Unknown',
        date: voucher.date,
        voucherNumber: voucher.voucherNumber,
        party: voucher.rawOriginal?.Party,
        amount: voucher.totalAmount,
        company: voucher.companyId?.name || 'Unknown',
        isCancelled: false,
        details: voucher.rawOriginal
      });
    });

    // Add credit notes
    creditNotes.forEach(cn => {
      transactions.push({
        _id: cn._id,
        type: 'creditnote',
        voucherType: 'Credit Note',
        date: cn.date,
        voucherNumber: cn.creditNoteNumber,
        party: cn.party,
        amount: -cn.creditAmount, // Negative for credit notes
        isCancelled: cn.isCancelled,
        details: cn.meta,
        creditNoteDetails: cn.details
      });
    });

    // Sort by date (newest first)
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calculate totals - include ALL vouchers, not just sales
    const totalVoucherAmount = vouchers.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
    
    // Also calculate sales-specific total for reference
    const totalSales = vouchers
      .filter(v => v.rawOriginal?.Vch_Type?.toLowerCase().includes('sales'))
      .reduce((sum, v) => sum + (v.totalAmount || 0), 0);
    
    const totalCreditNotes = creditNotes
      .filter(cn => !cn.isCancelled)
      .reduce((sum, cn) => sum + (cn.creditAmount || 0), 0);

    const netAmount = totalVoucherAmount - totalCreditNotes;

    res.json({
      party: decodedPartyName,
      transactions,
      summary: {
        totalTransactions: transactions.length,
        totalVouchers: vouchers.length,
        totalCreditNotes: creditNotes.length,
        totalVoucherAmount,
        totalSales,
        totalCreditNotes,
        netAmount
      }
    });
  } catch (error) {
    console.error('Error fetching party transactions:', error);
    res.status(500).json({ message: 'Failed to fetch party transactions', error: error.message });
  }
};

// GET /vouchers with items and employee names (with pagination and filters)
export const getAllVouchers = async (req, res) => {
  const { page = 1, limit = 25, voucherNumber, partyName, dateFrom, dateTo, companyId, minAmount, maxAmount, sortBy = 'date', sortOrder = 'desc' } = req.query;
  
  // Set cache headers for better performance
  res.set('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
  
  // Build filter query
  const filter = {};
  if (voucherNumber) {
    filter.voucherNumber = { $regex: voucherNumber, $options: 'i' };
  }
  if (partyName) {
    filter['rawOriginal.Party'] = { $regex: partyName, $options: 'i' };
  }
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = new Date(dateFrom);
    if (dateTo) filter.date.$lte = new Date(dateTo);
  }
  if (companyId) {
    filter.companyId = companyId;
  }
  if (minAmount || maxAmount) {
    filter.totalAmount = {};
    if (minAmount) filter.totalAmount.$gte = parseFloat(minAmount);
    if (maxAmount) filter.totalAmount.$lte = parseFloat(maxAmount);
  }

  // Build sort object
  const sortField = sortBy || 'date';
  const sortDirection = sortOrder === 'asc' ? 1 : -1;
  const sortObj = { [sortField]: sortDirection };

  // Pagination
  const skip = (parseInt(page) - 1) * parseInt(limit);
  
  // Use aggregation for better performance
  const [countResult, vouchers] = await Promise.all([
    Voucher.countDocuments(filter),
    Voucher.aggregate([
      { $match: filter },
      { $sort: sortObj },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'voucherparticipants',
          localField: '_id',
          foreignField: 'voucherId',
          as: 'participants'
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'participants.employeeId',
          foreignField: '_id',
          as: 'employeeData'
        }
      },
      {
        $project: {
          voucherNumber: 1,
          date: 1,
          totalAmount: 1,
          currency: 1,
          companyId: 1,
          rawOriginal: 1,
          employees: {
            $map: {
              input: '$participants',
              as: 'p',
              in: {
                name: {
                  $arrayElemAt: [
                    {
                      $map: {
                        input: {
                          $filter: {
                            input: '$employeeData',
                            cond: { $eq: ['$$this._id', '$$p.employeeId'] }
                          }
                        },
                        in: '$$this.name'
                      }
                    },
                    0
                  ]
                },
                role: '$$p.role',
                confidence: '$$p.confidence'
              }
            }
          }
        }
      }
    ])
  ]);
  
  res.json({
    data: vouchers,
    pagination: {
      total: countResult,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(countResult / parseInt(limit))
    }
  });
};

export const getVoucherById = async (req, res) => {
  const voucher = await Voucher.findById(req.params.id).lean();
  if (!voucher) return res.status(404).json({ message: 'Not found' });
  
  // Fetch items and participants for this specific voucher
  const [items, participants] = await Promise.all([
    VoucherItem.find({ voucherId: voucher._id }).lean(),
    VoucherParticipant.find({ voucherId: voucher._id }).lean()
  ]);
  
  // Fetch employee names
  const employeeIds = participants.map(p => p.employeeId);
  const employees = await Employee.find({ _id: { $in: employeeIds } }).lean();
  const employeeMap = Object.fromEntries(employees.map(e => [e._id.toString(), e.name]));
  
  res.json({
    ...voucher,
    items,
    employees: participants.map(p => ({
      name: employeeMap[p.employeeId.toString()] || '',
      role: p.role,
      confidence: p.confidence
    }))
  });
};

export const getVoucherStats = async (req, res) => {
  try {
    const stats = await Voucher.aggregate([
      {
        $group: {
          _id: null,
          totalVouchers: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    res.json(stats[0] || { totalVouchers: 0, totalAmount: 0 });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats', error: error.message });
  }
};

export const getVoucherItems = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch items for this voucher
    const items = await VoucherItem.find({ voucherId: id }).lean();
    
    res.json({ items });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch voucher items', error: error.message });
  }
};
