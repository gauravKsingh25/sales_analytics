import express from 'express';

import Target from '../../schemas/target.js';
import Voucher from '../../schemas/voucher.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';

const router = express.Router();

// Get all targets with progress
router.get('/', async (req, res) => {
  try {
    const { month, year, type, status } = req.query;
    const filter = {};
    
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (type) filter.type = type;
    if (status) filter.status = status;

    const targets = await Target.find(filter)
      .populate('employeeId', 'name employeeCode')
      .sort({ year: -1, month: -1, createdAt: -1 })
      .lean();

    res.json(targets);
  } catch (error) {
    console.error('Error fetching targets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current month targets with real-time progress
router.get('/current', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const targets = await Target.find({
      month: currentMonth,
      year: currentYear
    })
      .populate('employeeId', 'name employeeCode')
      .lean();

    // Calculate real-time progress for each target
    const targetsWithProgress = await Promise.all(
      targets.map(async (target) => {
        let achieved = { amount: 0, vouchers: 0 };

        if (target.type === 'employee' && target.employeeId) {
          // Get employee's sales for current month
          const startDate = new Date(currentYear, currentMonth - 1, 1);
          const endDate = new Date(currentYear, currentMonth, 0, 23, 59, 59);

          const participants = await VoucherParticipant.find({
            employeeId: target.employeeId._id,
            role: 'primary'
          }).select('voucherId').lean();

          const voucherIds = participants.map(p => p.voucherId);
          
          const vouchers = await Voucher.find({
            _id: { $in: voucherIds },
            date: { $gte: startDate, $lte: endDate }
          }).lean();

          const salesVouchers = vouchers.filter(v => 
            v.voucherType && v.voucherType.toLowerCase().includes('sale')
          );

          achieved.amount = salesVouchers.reduce((sum, v) => sum + (v.amount || 0), 0);
          achieved.vouchers = salesVouchers.length;
        }

        // Calculate progress percentage
        const progressPercentage = target.targetAmount > 0 
          ? (achieved.amount / target.targetAmount) * 100 
          : 0;

        // Determine status
        let status = 'on-track';
        const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
        const currentDay = now.getDate();
        const expectedProgress = (currentDay / daysInMonth) * 100;

        if (progressPercentage >= 100) {
          status = 'achieved';
        } else if (progressPercentage >= 90) {
          status = 'on-track';
        } else if (progressPercentage < expectedProgress - 20) {
          status = 'off-track';
        } else if (progressPercentage < expectedProgress - 10) {
          status = 'at-risk';
        }

        // Update target in DB
        await Target.findByIdAndUpdate(target._id, {
          achievedAmount: achieved.amount,
          achievedVouchers: achieved.vouchers,
          status
        });

        return {
          ...target,
          achievedAmount: achieved.amount,
          achievedVouchers: achieved.vouchers,
          progressPercentage: progressPercentage.toFixed(1),
          expectedProgress: expectedProgress.toFixed(1),
          status,
          isOffTrack: status === 'off-track' || status === 'at-risk'
        };
      })
    );

    res.json(targetsWithProgress);
  } catch (error) {
    console.error('Error fetching current targets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get alerts for off-track targets
router.get('/alerts', async (req, res) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const offTrackTargets = await Target.find({
      month: currentMonth,
      year: currentYear,
      status: { $in: ['off-track', 'at-risk'] }
    })
      .populate('employeeId', 'name employeeCode')
      .lean();

    const alerts = offTrackTargets.map(target => ({
      id: target._id,
      type: target.type,
      employeeName: target.employeeId?.name,
      employeeCode: target.employeeId?.employeeCode,
      region: target.region,
      targetAmount: target.targetAmount,
      achievedAmount: target.achievedAmount,
      shortfall: target.targetAmount - target.achievedAmount,
      progressPercentage: target.targetAmount > 0 
        ? ((target.achievedAmount / target.targetAmount) * 100).toFixed(1)
        : 0,
      status: target.status,
      severity: target.status === 'off-track' ? 'high' : 'medium',
      message: `${target.employeeId?.name || target.region} is ${target.status.replace('-', ' ')} on ${new Date(0, currentMonth - 1).toLocaleString('default', { month: 'long' })} targets`
    }));

    res.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create target
router.post('/', async (req, res) => {
  try {
    const target = await Target.create(req.body);
    res.status(201).json(target);
  } catch (error) {
    console.error('Error creating target:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Bulk create targets
router.post('/bulk', async (req, res) => {
  try {
    const { targets } = req.body;
    const created = await Target.insertMany(targets);
    res.status(201).json(created);
  } catch (error) {
    console.error('Error creating bulk targets:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update target
router.put('/:id', async (req, res) => {
  try {
    const target = await Target.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('employeeId', 'name employeeCode');
    
    if (!target) {
      return res.status(404).json({ message: 'Target not found' });
    }
    
    res.json(target);
  } catch (error) {
    console.error('Error updating target:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete target
router.delete('/:id', async (req, res) => {
  try {
    const target = await Target.findByIdAndDelete(req.params.id);
    
    if (!target) {
      return res.status(404).json({ message: 'Target not found' });
    }
    
    res.json({ message: 'Target deleted successfully' });
  } catch (error) {
    console.error('Error deleting target:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
