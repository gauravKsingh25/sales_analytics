
import express from 'express';
import Voucher from '../../schemas/voucher.js';
import VoucherItem from '../../schemas/voucheritem.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';
import Employee from '../../schemas/employee.js';
import Company from '../../schemas/company.js';
const router = express.Router();

// GET /vouchers with items and employee names (with pagination and filters)
router.get('/', async (req, res) => {
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
});

router.get('/:id', async (req, res) => {
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
});

// New endpoint to get items for a specific voucher (for expanding in list view)
router.get('/:id/items', async (req, res) => {
  const items = await VoucherItem.find({ voucherId: req.params.id }).lean();
  res.json(items);
});

router.post('/:id/flag', async (req, res) => {
  // For demo: just return ok
  res.json({ message: 'Voucher flagged' });
});

export default router;
