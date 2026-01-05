import express from 'express';

import Employee from '../../schemas/employee.js';
import EmployeeCandidate from '../../schemas/employeecandidate.js';
import Voucher from '../../schemas/voucher.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const employees = await Employee.find()
    .populate('designation', 'title level')
    .populate('reportingTo', 'name employeeCode');
  res.json(employees);
});

router.get('/:id', async (req, res) => {
  const emp = await Employee.findById(req.params.id)
    .populate('designation', 'title level')
    .populate('reportingTo', 'name employeeCode');
  if (!emp) return res.status(404).json({ message: 'Not found' });
  res.json(emp);
});

router.get('/:id/details', async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id)
      .populate('designation', 'title level')
      .populate('reportingTo', 'name employeeCode');
    if (!emp) return res.status(404).json({ message: 'Employee not found' });

    // Find all employees who report to this employee (subordinates)
    const subordinates = await Employee.find({ reportingTo: emp._id })
      .populate('designation', 'title level')
      .select('name employeeCode designation');

    // Find all voucher participants for this employee
    const participants = await VoucherParticipant.find({ employeeId: emp._id });
    const voucherIds = participants.map(p => p.voucherId);

    // Get all vouchers for this employee
    const vouchers = await Voucher.find({ _id: { $in: voucherIds } })
      .populate('companyId')
      .sort({ date: -1 });

    // Calculate total sales for this employee (vouchers where Vch_Type contains "Sales")
    let totalSales = 0;
    const salesVouchers = [];
    
    vouchers.forEach(voucher => {
      const vchType = voucher.rawOriginal?.Vch_Type || '';
      if (vchType.toLowerCase().includes('sales')) {
        totalSales += voucher.totalAmount || 0;
        salesVouchers.push(voucher);
      }
    });

    // Get subordinates' sales and vouchers
    let subordinatesTotalSales = 0;
    const subordinatesVouchers = [];
    const subordinatesWithSales = [];

    for (const sub of subordinates) {
      // Find voucher participants for subordinate
      const subParticipants = await VoucherParticipant.find({ employeeId: sub._id });
      const subVoucherIds = subParticipants.map(p => p.voucherId);

      // Get vouchers for subordinate
      const subVouchers = await Voucher.find({ _id: { $in: subVoucherIds } })
        .populate('companyId')
        .sort({ date: -1 });

      let subSales = 0;
      const subSalesVouchers = [];

      subVouchers.forEach(voucher => {
        const vchType = voucher.rawOriginal?.Vch_Type || '';
        if (vchType.toLowerCase().includes('sales')) {
          subSales += voucher.totalAmount || 0;
          subSalesVouchers.push(voucher);
        }
      });

      subordinatesTotalSales += subSales;
      subordinatesVouchers.push(...subVouchers);

      subordinatesWithSales.push({
        ...sub.toObject(),
        sales: subSales,
        vouchersCount: subVouchers.length,
        salesVouchersCount: subSalesVouchers.length
      });
    }

    // Calculate team sales (employee + all subordinates)
    const teamSales = totalSales + subordinatesTotalSales;

    res.json({
      employee: emp,
      totalSales,
      salesVouchers,
      allVouchers: vouchers,
      stats: {
        totalVouchers: vouchers.length,
        salesVouchersCount: salesVouchers.length
      },
      subordinates: subordinatesWithSales,
      subordinatesTotalSales,
      teamSales,
      subordinatesVouchers
    });
  } catch (error) {
    console.error('Error fetching employee details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Name required' });
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const emp = await Employee.create({ ...req.body, normalized });
  res.status(201).json(emp);
});

router.put('/:id', async (req, res) => {
  const { name } = req.body;
  const update = { ...req.body };
  if (name) {
    update.normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  const emp = await Employee.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!emp) return res.status(404).json({ message: 'Not found' });
  res.json(emp);
});

router.delete('/:id', async (req, res) => {
  const emp = await Employee.findByIdAndDelete(req.params.id);
  if (!emp) return res.status(404).json({ message: 'Not found' });
  res.json({ message: 'Employee deleted', employee: emp });
});

router.post('/:id/merge', async (req, res) => {
  // For demo: just mark candidate as processed
  const { candidateId } = req.body;
  await EmployeeCandidate.findByIdAndUpdate(candidateId, { processed: true });
  res.json({ message: 'Merged' });
});

export default router;
