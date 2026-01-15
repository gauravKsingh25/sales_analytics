import express from 'express';
import Voucher from '../../schemas/voucher.js';
import VoucherItem from '../../schemas/voucheritem.js';
import VoucherParticipant from '../../schemas/voucherparticipant.js';
import Employee from '../../schemas/employee.js';
import Company from '../../schemas/company.js';
import CompanySales from '../../schemas/companysales.js';
import CreditNote from '../../schemas/creditnote.js';

const router = express.Router();

// OPTIMIZED: Get ALL dashboard data in ONE request
router.get('/dashboard-all', async (req, res) => {
  try {
    const [
      voucherStats,
      salesStats,
      creditNoteStats,
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
      // Credit notes stats (only active, not cancelled)
      CreditNote.aggregate([
        {
          $match: { isCancelled: false }
        },
        {
          $group: {
            _id: null,
            totalCreditAmount: { $sum: '$creditAmount' },
            creditNotesCount: { $sum: 1 }
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
      // Top 10 companies - Get from Vouchers directly to ensure accurate totals
      Voucher.aggregate([
        {
          $match: {
            companyId: { $exists: true, $ne: null }
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
      ])
    ]);

    // Calculate net revenue
    const totalSales = salesStats[0]?.totalSales || 0;
    const totalCreditAmount = creditNoteStats[0]?.totalCreditAmount || 0;
    const netRevenue = totalSales - totalCreditAmount;

    res.json({
      // Dashboard stats
      totalVouchers: voucherStats[0]?.totalVouchers || 0,
      totalAmount: voucherStats[0]?.totalAmount || 0,
      avgVoucherValue: voucherStats[0]?.avgAmount || 0,
      totalSales: totalSales,
      salesCount: salesStats[0]?.salesCount || 0,
      totalCreditAmount: totalCreditAmount,
      creditNotesCount: creditNoteStats[0]?.creditNotesCount || 0,
      netRevenue: netRevenue,
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

    // Get credit notes stats (only active, not cancelled)
    const creditNoteStats = await CreditNote.aggregate([
      {
        $match: { isCancelled: false }
      },
      {
        $group: {
          _id: null,
          totalCreditAmount: { $sum: '$creditAmount' },
          creditNotesCount: { $sum: 1 }
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

    // Calculate net revenue
    const totalSales = salesStats[0]?.totalSales || 0;
    const totalCreditAmount = creditNoteStats[0]?.totalCreditAmount || 0;
    const netRevenue = totalSales - totalCreditAmount;

    res.json({
      totalVouchers: voucherStats[0]?.totalVouchers || 0,
      totalAmount: voucherStats[0]?.totalAmount || 0,
      avgVoucherValue: voucherStats[0]?.avgAmount || 0,
      totalSales: totalSales,
      salesCount: salesStats[0]?.salesCount || 0,
      totalCreditAmount: totalCreditAmount,
      creditNotesCount: creditNoteStats[0]?.creditNotesCount || 0,
      netRevenue: netRevenue,
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

// ===========================
// NEW COMPREHENSIVE ANALYTICS
// ===========================

// Get monthly sales trend (last 12 months)
router.get('/monthly-sales-trend', async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyData = await Voucher.aggregate([
      {
        $match: {
          date: { $gte: twelveMonthsAgo },
          'rawOriginal.Vch_Type': { $regex: /sales/i }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          salesAmount: { $sum: '$totalAmount' },
          voucherCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json(monthlyData);
  } catch (error) {
    console.error('Error in monthly-sales-trend:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get voucher type distribution
router.get('/voucher-type-distribution', async (req, res) => {
  try {
    const distribution = await Voucher.aggregate([
      {
        $group: {
          _id: '$rawOriginal.Vch_Type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json(distribution);
  } catch (error) {
    console.error('Error in voucher-type-distribution:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get credit notes trend (monthly)
router.get('/credit-notes-trend', async (req, res) => {
  try {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const creditNotesTrend = await CreditNote.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo },
          isCancelled: false
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$creditAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json(creditNotesTrend);
  } catch (error) {
    console.error('Error in credit-notes-trend:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get top selling items (all time)
router.get('/top-selling-items', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;

    const topItems = await VoucherItem.aggregate([
      {
        $match: {
          itemType: 'product' // Only actual product items
        }
      },
      {
        $group: {
          _id: '$description',
          totalQty: { $sum: '$qty' },
          totalAmount: { $sum: '$amount' },
          orderCount: { $sum: 1 },
          avgPrice: { $avg: '$unitPrice' }
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
      {
        $project: {
          itemName: '$_id',
          totalQty: 1,
          totalAmount: 1,
          orderCount: 1,
          avgPrice: 1
        }
      }
    ]);

    res.json(topItems);
  } catch (error) {
    console.error('Error in top-selling-items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get trending items (this month vs last month)
router.get('/trending-items', async (req, res) => {
  try {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Get this month's items
    const thisMonthVouchers = await Voucher.find({
      date: { $gte: thisMonthStart }
    }).select('_id').lean();
    
    const thisMonthVoucherIds = thisMonthVouchers.map(v => v._id);

    // Get last month's items
    const lastMonthVouchers = await Voucher.find({
      date: { $gte: lastMonthStart, $lte: lastMonthEnd }
    }).select('_id').lean();
    
    const lastMonthVoucherIds = lastMonthVouchers.map(v => v._id);

    // Aggregate this month
    const thisMonthItems = await VoucherItem.aggregate([
      { 
        $match: { 
          voucherId: { $in: thisMonthVoucherIds },
          itemType: 'product' // Only actual product items
        } 
      },
      {
        $group: {
          _id: '$description',
          qty: { $sum: '$qty' },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Aggregate last month
    const lastMonthItems = await VoucherItem.aggregate([
      { 
        $match: { 
          voucherId: { $in: lastMonthVoucherIds },
          itemType: 'product' // Only actual product items
        } 
      },
      {
        $group: {
          _id: '$description',
          qty: { $sum: '$qty' },
          amount: { $sum: '$amount' }
        }
      }
    ]);

    // Calculate growth
    const itemMap = new Map();
    
    thisMonthItems.forEach(item => {
      itemMap.set(item._id, {
        itemName: item._id,
        thisMonthQty: item.qty,
        thisMonthAmount: item.amount,
        lastMonthQty: 0,
        lastMonthAmount: 0
      });
    });

    lastMonthItems.forEach(item => {
      if (itemMap.has(item._id)) {
        itemMap.get(item._id).lastMonthQty = item.qty;
        itemMap.get(item._id).lastMonthAmount = item.amount;
      } else {
        itemMap.set(item._id, {
          itemName: item._id,
          thisMonthQty: 0,
          thisMonthAmount: 0,
          lastMonthQty: item.qty,
          lastMonthAmount: item.amount
        });
      }
    });

    // Calculate growth percentage
    const trending = Array.from(itemMap.values()).map(item => {
      const qtyGrowth = item.lastMonthQty > 0
        ? ((item.thisMonthQty - item.lastMonthQty) / item.lastMonthQty) * 100
        : item.thisMonthQty > 0 ? 100 : 0;
      
      const amountGrowth = item.lastMonthAmount > 0
        ? ((item.thisMonthAmount - item.lastMonthAmount) / item.lastMonthAmount) * 100
        : item.thisMonthAmount > 0 ? 100 : 0;

      return {
        ...item,
        qtyGrowth,
        amountGrowth
      };
    })
    .filter(item => item.thisMonthAmount > 0) // Only items sold this month
    .sort((a, b) => b.amountGrowth - a.amountGrowth)
    .slice(0, 20);

    res.json(trending);
  } catch (error) {
    console.error('Error in trending-items:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current month overview
router.get('/current-month-overview', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [thisMonth, lastMonth, thisMonthCreditNotes, lastMonthCreditNotes] = await Promise.all([
      // This month vouchers
      Voucher.aggregate([
        { $match: { date: { $gte: monthStart } } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            voucherCount: { $sum: 1 },
            salesAmount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$rawOriginal.Vch_Type', regex: /sales/i } },
                  '$totalAmount',
                  0
                ]
              }
            },
            salesCount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$rawOriginal.Vch_Type', regex: /sales/i } },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      // Last month vouchers
      Voucher.aggregate([
        { $match: { date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$totalAmount' },
            voucherCount: { $sum: 1 },
            salesAmount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$rawOriginal.Vch_Type', regex: /sales/i } },
                  '$totalAmount',
                  0
                ]
              }
            }
          }
        }
      ]),
      // This month credit notes
      CreditNote.aggregate([
        {
          $match: {
            createdAt: { $gte: monthStart },
            isCancelled: false
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$creditAmount' },
            count: { $sum: 1 }
          }
        }
      ]),
      // Last month credit notes
      CreditNote.aggregate([
        {
          $match: {
            createdAt: { $gte: lastMonthStart, $lte: lastMonthEnd },
            isCancelled: false
          }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$creditAmount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const thisMonthData = thisMonth[0] || { totalAmount: 0, voucherCount: 0, salesAmount: 0, salesCount: 0 };
    const lastMonthData = lastMonth[0] || { totalAmount: 0, voucherCount: 0, salesAmount: 0 };
    const thisMonthCN = thisMonthCreditNotes[0] || { totalAmount: 0, count: 0 };
    const lastMonthCN = lastMonthCreditNotes[0] || { totalAmount: 0, count: 0 };

    // Calculate growth percentages
    const salesGrowth = lastMonthData.salesAmount > 0
      ? ((thisMonthData.salesAmount - lastMonthData.salesAmount) / lastMonthData.salesAmount) * 100
      : thisMonthData.salesAmount > 0 ? 100 : 0;

    const voucherGrowth = lastMonthData.voucherCount > 0
      ? ((thisMonthData.voucherCount - lastMonthData.voucherCount) / lastMonthData.voucherCount) * 100
      : thisMonthData.voucherCount > 0 ? 100 : 0;

    const creditNoteGrowth = lastMonthCN.totalAmount > 0
      ? ((thisMonthCN.totalAmount - lastMonthCN.totalAmount) / lastMonthCN.totalAmount) * 100
      : thisMonthCN.totalAmount > 0 ? 100 : 0;

    // Get items sold this month
    const thisMonthVouchers = await Voucher.find({
      date: { $gte: monthStart }
    }).select('_id').lean();
    
    const voucherIds = thisMonthVouchers.map(v => v._id);

    const [itemsStats, uniqueCompanies, uniqueEmployees] = await Promise.all([
      VoucherItem.aggregate([
        { $match: { voucherId: { $in: voucherIds } } },
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalQty: { $sum: '$qty' },
            uniqueProducts: { $addToSet: '$description' }
          }
        }
      ]),
      Voucher.distinct('companyId', { date: { $gte: monthStart } }),
      VoucherParticipant.distinct('employeeId', { voucherId: { $in: voucherIds } })
    ]);

    const itemData = itemsStats[0] || { totalItems: 0, totalQty: 0, uniqueProducts: [] };

    res.json({
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      sales: {
        amount: thisMonthData.salesAmount,
        count: thisMonthData.salesCount,
        growth: salesGrowth,
        avgDealSize: thisMonthData.salesCount > 0 ? thisMonthData.salesAmount / thisMonthData.salesCount : 0
      },
      vouchers: {
        count: thisMonthData.voucherCount,
        growth: voucherGrowth
      },
      creditNotes: {
        amount: thisMonthCN.totalAmount,
        count: thisMonthCN.count,
        growth: creditNoteGrowth
      },
      items: {
        totalSold: itemData.totalItems,
        totalQuantity: itemData.totalQty,
        uniqueProducts: itemData.uniqueProducts.length
      },
      activity: {
        activeCompanies: uniqueCompanies.length,
        activeEmployees: uniqueEmployees.length
      }
    });
  } catch (error) {
    console.error('Error in current-month-overview:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all-time overview
router.get('/all-time-overview', async (req, res) => {
  try {
    const [voucherStats, itemStats, creditNoteStats] = await Promise.all([
      Voucher.aggregate([
        {
          $group: {
            _id: null,
            totalVouchers: { $sum: 1 },
            totalAmount: { $sum: '$totalAmount' },
            salesAmount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$rawOriginal.Vch_Type', regex: /sales/i } },
                  '$totalAmount',
                  0
                ]
              }
            },
            salesCount: {
              $sum: {
                $cond: [
                  { $regexMatch: { input: '$rawOriginal.Vch_Type', regex: /sales/i } },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),
      VoucherItem.aggregate([
        {
          $group: {
            _id: null,
            totalItems: { $sum: 1 },
            totalQty: { $sum: '$qty' },
            totalRevenue: { $sum: '$amount' },
            uniqueProducts: { $addToSet: '$description' }
          }
        }
      ]),
      CreditNote.aggregate([
        {
          $match: { isCancelled: false }
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$creditAmount' },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const voucherData = voucherStats[0] || { totalVouchers: 0, totalAmount: 0, salesAmount: 0, salesCount: 0 };
    const itemData = itemStats[0] || { totalItems: 0, totalQty: 0, totalRevenue: 0, uniqueProducts: [] };
    const creditNoteData = creditNoteStats[0] || { totalAmount: 0, count: 0 };

    const [totalCompanies, totalEmployees] = await Promise.all([
      Company.countDocuments(),
      Employee.countDocuments()
    ]);

    res.json({
      vouchers: {
        total: voucherData.totalVouchers,
        totalAmount: voucherData.totalAmount,
        salesCount: voucherData.salesCount,
        salesAmount: voucherData.salesAmount,
        avgDealSize: voucherData.salesCount > 0 ? voucherData.salesAmount / voucherData.salesCount : 0
      },
      items: {
        totalSold: itemData.totalItems,
        totalQuantity: itemData.totalQty,
        totalRevenue: itemData.totalRevenue,
        uniqueProducts: itemData.uniqueProducts.length,
        avgItemPrice: itemData.totalItems > 0 ? itemData.totalRevenue / itemData.totalItems : 0
      },
      creditNotes: {
        total: creditNoteData.count,
        totalAmount: creditNoteData.totalAmount
      },
      entities: {
        companies: totalCompanies,
        employees: totalEmployees
      }
    });
  } catch (error) {
    console.error('Error in all-time-overview:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get employee-item sales ranking (who sold which item more)
router.get('/employee-item-ranking', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    // Get all vouchers with their items (only actual products)
    const employeeItemSales = await VoucherItem.aggregate([
      {
        $match: {
          itemType: 'product' // Only actual product items
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
        $lookup: {
          from: 'voucherparticipants',
          let: { voucherId: '$voucherId' },
          pipeline: [
            { $match: { $expr: { $eq: ['$voucherId', '$$voucherId'] } } },
            { $match: { role: 'Employee' } }
          ],
          as: 'participants'
        }
      },
      { $unwind: { path: '$participants', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'employees',
          localField: 'participants.employeeId',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: {
            employeeId: '$employee._id',
            employeeName: '$employee.name',
            employeeCode: '$employee.code',
            itemName: '$description'
          },
          totalQty: { $sum: '$qty' },
          totalAmount: { $sum: '$amount' },
          orderCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          employeeId: '$_id.employeeId',
          employeeName: '$_id.employeeName',
          employeeCode: '$_id.employeeCode',
          itemName: '$_id.itemName',
          totalQty: 1,
          totalAmount: 1,
          orderCount: 1
        }
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit }
    ]);

    res.json(employeeItemSales);
  } catch (error) {
    console.error('Error in employee-item-ranking:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
