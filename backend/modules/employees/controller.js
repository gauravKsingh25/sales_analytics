import express from 'express';

import Employee from '../../schemas/employee.js';
import EmployeeCandidate from '../../schemas/employeecandidate.js';
import Voucher from '../../schemas/voucher.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';
import CreditNote from '../../schemas/creditnote.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const employees = await Employee.find()
    .populate('designation', 'title level')
    .populate('reportingTo', 'name employeeCode');
  res.json(employees);
});

// Get all parties grouped by staff
router.get('/parties/by-staff', async (req, res) => {
  try {
    // Get all vouchers
    const vouchers = await Voucher.find({}).lean();
    
    // Create a map: staffName -> Set of party names
    const staffPartiesMap = new Map();

    for (const voucher of vouchers) {
      const party = voucher.rawOriginal?.Party;
      const details = voucher.rawOriginal?.Details || [];

      if (!party) continue; // Skip vouchers without party

      // Find staff in details
      const staffEntries = details.filter(d => d.Staff);

      for (const entry of staffEntries) {
        const staffName = entry.Staff.trim();
        
        if (!staffPartiesMap.has(staffName)) {
          staffPartiesMap.set(staffName, {
            parties: new Set(),
            voucherCount: 0,
            totalSales: 0
          });
        }
        
        const staffData = staffPartiesMap.get(staffName);
        staffData.parties.add(party.trim());
        staffData.voucherCount++;
        
        // Add sales amount if it's a sales voucher
        const vchType = voucher.rawOriginal?.Vch_Type || '';
        if (vchType.toLowerCase().includes('sales')) {
          staffData.totalSales += voucher.totalAmount || 0;
        }
      }
    }

    // Convert to array format
    const staffPartiesArray = [];
    
    for (const [staffName, data] of staffPartiesMap.entries()) {
      const parties = Array.from(data.parties).sort();
      
      // Try to find matching employee
      const normalized = staffName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const employee = await Employee.findOne({ normalized })
        .populate('designation', 'title level')
        .select('name employeeCode designation');
      
      staffPartiesArray.push({
        staffName,
        employee: employee || null,
        partiesCount: parties.length,
        parties,
        voucherCount: data.voucherCount,
        totalSales: data.totalSales
      });
    }

    // Sort by total sales (descending)
    staffPartiesArray.sort((a, b) => b.totalSales - a.totalSales);

    res.json({
      count: staffPartiesArray.length,
      data: staffPartiesArray
    });
  } catch (error) {
    console.error('Error fetching parties by staff:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
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
    
    // Also collect unique parties this employee is responsible for
    const responsiblePartiesSet = new Set();
    
    vouchers.forEach(voucher => {
      const vchType = voucher.rawOriginal?.Vch_Type || '';
      const party = voucher.rawOriginal?.Party;
      
      // Add party to responsible parties if exists
      if (party) {
        responsiblePartiesSet.add(party.trim());
      }
      
      if (vchType.toLowerCase().includes('sales')) {
        totalSales += voucher.totalAmount || 0;
        salesVouchers.push(voucher);
      }
    });
    
    // Convert to sorted array
    const responsibleParties = Array.from(responsiblePartiesSet).sort();

    // Get credit notes for this employee's responsible parties
    let totalCreditNotes = 0;
    let creditNotesCount = 0;
    
    if (responsibleParties.length > 0) {
      const creditNoteStats = await CreditNote.aggregate([
        {
          $match: {
            isCancelled: false,
            party: { $in: responsibleParties }
          }
        },
        {
          $group: {
            _id: null,
            totalCredit: { $sum: '$creditAmount' },
            count: { $sum: 1 }
          }
        }
      ]);
      
      if (creditNoteStats.length > 0) {
        totalCreditNotes = creditNoteStats[0].totalCredit || 0;
        creditNotesCount = creditNoteStats[0].count || 0;
      }
    }
    
    // Calculate net sales (sales - credit notes)
    const netSales = totalSales - totalCreditNotes;

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
      totalCreditNotes,
      creditNotesCount,
      netSales,
      salesVouchers,
      allVouchers: vouchers,
      responsibleParties, // Array of party names this employee handles
      stats: {
        totalVouchers: vouchers.length,
        salesVouchersCount: salesVouchers.length,
        partiesCount: responsibleParties.length,
        creditNotesCount,
        totalCreditNotes,
        netSales
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
