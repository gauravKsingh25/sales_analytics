import express from 'express';
import Voucher from '../../schemas/voucher.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';
import Employee from '../../schemas/employee.js';
import Company from '../../schemas/company.js';
import CompanySales from '../../schemas/companysales.js';

const router = express.Router();

// OPTIMIZED: Get ALL dashboard data in ONE request
router.get('/dashboard-all', async (req, res) => {
  try {
    const [
      voucherStats,
      salesStats,
      employeeCount,
      companyCount,
      dateRange,
      monthlyData,
      topEmployees,
      topCompanies
    ] = await Promise.all([
      // Voucher stats
      Voucher.aggregate([
        {
          $group: {
            _id: null,
            totalVouchers: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            avgAmount: { $avg: '$totalAmount' }
          }
        }
      ]),
      // Sales stats
      Voucher.aggregate([
        {
          $match: {
            'rawOriginal.Vch_Type': { $regex: /sales/i }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: '$totalAmount' },
            salesCount: { $sum: 1 }
          }
        }
      ]),
      // Employee count
      Employee.countDocuments(),
      // Company count
      Company.countDocuments(),
      // Date range
      Voucher.aggregate([
        {
          $group: {
            _id: null,
            minDate: { $min: '$date' },
            maxDate: { $max: '$date' }
          }
        }
      ]),
      // Monthly data
      Voucher.aggregate([
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' }
            },
            count: { $sum: 1 },
            amount: { $sum: '$totalAmount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]),
      // Top 10 employees (optimized aggregation)
      VoucherParticipant.aggregate([
        {
          $lookup: {
            from: 'vouchers',
            localField: 'voucherId',
            foreignField: '_id',
            as: 'voucher'
          }
        },
        { $unwind: '$voucher' },
        {
          $match: {
            'voucher.rawOriginal.Vch_Type': { $regex: /sales/i }
          }
        },
        {
          $group: {
            _id: '$employeeId',
            totalSales: { $sum: '$voucher.totalAmount' },
            salesCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: '_id',
            as: 'employee'
          }
        },
        { $unwind: '$employee' },
        {
          $lookup: {
            from: 'voucherparticipants',
            localField: '_id',
            foreignField: 'employeeId',
            as: 'allParticipations'
          }
        },
        {
          $project: {
            _id: 1,
            employeeName: '$employee.name',
            employeeCode: '$employee.employeeCode',
            totalSales: 1,
            salesCount: 1,
            totalVouchers: { $size: '$allParticipations' }
          }
        },
        { $sort: { totalSales: -1 } },
        { $limit: 10 }
      ]),
      // Top 10 companies
      CompanySales.aggregate([
        {
          $sort: { totalSales: -1 }
        },
        {
          $limit: 10
        },
        {
          $lookup: {
            from: 'companies',
            localField: 'companyId',
            foreignField: '_id',
            as: 'company'
          }
        },
        { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            companyName: '$company.name',
            companyNormalized: '$company.normalized',
            totalAmount: '$totalSales',
            voucherCount: 1
          }
        }
      ])
    ]);

    res.json({
      // Dashboard stats
      totalVouchers: voucherStats[0]?.totalVouchers || 0,
      totalAmount: voucherStats[0]?.totalAmount || 0,
      avgVoucherValue: voucherStats[0]?.avgAmount || 0,
      totalSales: salesStats[0]?.totalSales || 0,
      salesCount: salesStats[0]?.salesCount || 0,
      employeeCount,
      companyCount,
      dateRange: dateRange[0] || { minDate: null, maxDate: null },
      monthlyData,
      // Top performers
      topEmployees,
      topCompanies
    });
  } catch (error) {
    console.error('Error in dashboard-all:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get dashboard stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    // Get total vouchers and sales
    const voucherStats = await Voucher.aggregate([
      {
        $group: {
          _id: null,
          totalVouchers: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          avgAmount: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Get sales vouchers only (where Vch_Type contains "Sales")
    const salesStats = await Voucher.aggregate([
      {
        $match: {
          'rawOriginal.Vch_Type': { $regex: /sales/i }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          salesCount: { $sum: 1 }
        }
      }
    ]);

    // Get employee count
    const employeeCount = await Employee.countDocuments();

    // Get company count
    const companyCount = await Company.countDocuments();

    // Get date range of vouchers
    const dateRange = await Voucher.aggregate([
      {
        $group: {
          _id: null,
          minDate: { $min: '$date' },
          maxDate: { $max: '$date' }
        }
      }
    ]);

    // Get monthly voucher distribution
    const monthlyData = await Voucher.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 },
          amount: { $sum: '$totalAmount' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    res.json({
      totalVouchers: voucherStats[0]?.totalVouchers || 0,
      totalAmount: voucherStats[0]?.totalAmount || 0,
      avgVoucherValue: voucherStats[0]?.avgAmount || 0,
      totalSales: salesStats[0]?.totalSales || 0,
      salesCount: salesStats[0]?.salesCount || 0,
      employeeCount,
      companyCount,
      dateRange: dateRange[0] || { minDate: null, maxDate: null },
      monthlyData
    });
  } catch (error) {
    console.error('Error in dashboard-stats:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get employee performance analytics
router.get('/employee-performance', async (req, res) => {
  try {
    const employees = await Employee.find().lean();
    
    const performanceData = await Promise.all(
      employees.map(async (emp) => {
        // Get all vouchers for this employee
        const participants = await VoucherParticipant.find({ employeeId: emp._id });
        const voucherIds = participants.map(p => p.voucherId);
        
        const vouchers = await Voucher.find({ _id: { $in: voucherIds } });
        
        // Calculate sales (vouchers where Vch_Type contains "Sales")
        let totalSales = 0;
        let salesCount = 0;
        
        vouchers.forEach(voucher => {
          const vchType = voucher.rawOriginal?.Vch_Type || '';
          if (vchType.toLowerCase().includes('sales')) {
            totalSales += voucher.totalAmount || 0;
            salesCount++;
          }
        });
        
        return {
          employeeId: emp._id,
          employeeName: emp.name,
          employeeCode: emp.employeeCode,
          totalVouchers: vouchers.length,
          totalSales,
          salesCount,
          avgSaleValue: salesCount > 0 ? totalSales / salesCount : 0
        };
      })
    );
    
    // Sort by total sales descending
    performanceData.sort((a, b) => b.totalSales - a.totalSales);
    
    res.json(performanceData);
  } catch (error) {
    console.error('Error in employee-performance:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get company sales analytics
router.get('/company-sales', async (req, res) => {
  try {
    const companySales = await Voucher.aggregate([
      {
        $group: {
          _id: '$companyId',
          totalAmount: { $sum: '$totalAmount' },
          voucherCount: { $sum: 1 },
          avgAmount: { $avg: '$totalAmount' }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company'
        }
      },
      {
        $unwind: { path: '$company', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          companyName: '$company.name',
          companyNormalized: '$company.normalized',
          totalAmount: 1,
          voucherCount: 1,
          avgAmount: 1
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]);
    
    res.json(companySales);
  } catch (error) {
    console.error('Error in company-sales:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get recent vouchers for dashboard
router.get('/recent-vouchers', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const vouchers = await Voucher.find()
      .sort({ date: -1 })
      .limit(limit)
      .populate('companyId')
      .lean();
    
    res.json(vouchers);
  } catch (error) {
    console.error('Error in recent-vouchers:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get detailed monthly insights
router.get('/monthly-details', async (req, res) => {
  try {
    const { month, year } = req.query;
    
    console.log('📅 Monthly Details Request:', { month, year });
    
    if (!month || !year) {
      return res.status(400).json({ message: 'Month and year are required' });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    // Calculate date range for the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    console.log('📅 Date Range:', { startDate, endDate });

    // Get all vouchers for the month
    const [monthVouchers, prevMonthVouchers] = await Promise.all([
      Voucher.find({
        date: { $gte: startDate, $lte: endDate }
      }).lean(),
      // Get previous month for comparison
      Voucher.find({
        date: {
          $gte: new Date(yearNum, monthNum - 2, 1),
          $lte: new Date(yearNum, monthNum - 1, 0, 23, 59, 59, 999)
        }
      }).lean()
    ]);

    console.log('📊 Vouchers Found:', {
      currentMonth: monthVouchers.length,
      previousMonth: prevMonthVouchers.length
    });

    // Calculate summary statistics
    const totalAmount = monthVouchers.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
    const totalVouchers = monthVouchers.length;
    const salesVouchers = monthVouchers.filter(v => 
      v.rawOriginal?.Vch_Type?.toLowerCase().includes('sales')
    );
    const salesCount = salesVouchers.length;
    const avgDealSize = totalVouchers > 0 ? totalAmount / totalVouchers : 0;

    // Calculate growth from previous month
    const prevMonthAmount = prevMonthVouchers.reduce((sum, v) => sum + (v.totalAmount || 0), 0);
    const growth = prevMonthAmount > 0 
      ? ((totalAmount - prevMonthAmount) / prevMonthAmount) * 100 
      : null;

    // Get unique active employees and companies
    const voucherIds = monthVouchers.map(v => v._id);
    const participants = await VoucherParticipant.find({
      voucherId: { $in: voucherIds }
    }).lean();

    const activeEmployees = [...new Set(participants.map(p => p.employeeId?.toString()).filter(Boolean))].length;
    const activeCompanies = [...new Set(monthVouchers.map(v => v.companyId?.toString()).filter(Boolean))].length;

    console.log('📈 Summary Stats:', {
      totalAmount,
      totalVouchers,
      salesCount,
      activeEmployees,
      activeCompanies
    });

    // Get top employees for the month
    const topEmployees = await VoucherParticipant.aggregate([
      {
        $match: {
          voucherId: { $in: voucherIds }
        }
      },
      {
        $lookup: {
          from: 'vouchers',
          localField: 'voucherId',
          foreignField: '_id',
          as: 'voucher'
        }
      },
      { $unwind: '$voucher' },
      {
        $match: {
          'voucher.rawOriginal.Vch_Type': { $regex: /sales/i }
        }
      },
      {
        $group: {
          _id: '$employeeId',
          totalSales: { $sum: '$voucher.totalAmount' },
          voucherCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          employeeName: '$employee.name',
          employeeCode: '$employee.employeeCode',
          totalSales: 1,
          voucherCount: 1
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);

    // Get top companies for the month
    const topCompanies = await Voucher.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$companyId',
          totalAmount: { $sum: '$totalAmount' },
          voucherCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'company'
        }
      },
      { $unwind: { path: '$company', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          companyName: '$company.name',
          companyNormalized: '$company.normalized',
          totalAmount: 1,
          voucherCount: 1
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: 10 }
    ]);

    // Get vouchers for the month (limited to recent 20)
    const monthVouchersList = await Voucher.find({
      date: { $gte: startDate, $lte: endDate }
    })
      .sort({ date: -1 })
      .limit(20)
      .populate('companyId')
      .lean();

    const responseData = {
      summary: {
        month: monthNum,
        year: yearNum,
        totalAmount,
        totalVouchers,
        salesVouchers: salesCount,
        avgDealSize,
        activeEmployees,
        activeCompanies,
        growth
      },
      topEmployees,
      topCompanies,
      vouchers: monthVouchersList
    };

    console.log('✅ Response Summary:', {
      hasData: totalVouchers > 0,
      topEmployeesCount: topEmployees.length,
      topCompaniesCount: topCompanies.length
    });

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error in monthly-details:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
