"use client";

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Loader2, 
  TrendingUp, 
  Award, 
  Building2, 
  Users, 
  Receipt, 
  DollarSign, 
  Calendar,
  BarChart3,
  CheckCircle2,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  AlertTriangle,
  Percent,
  TrendingDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AnalyticsPage() {
  const router = useRouter();
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
  
  // State for modal
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // OPTIMIZED: Single request for all dashboard data
  const { data: dashboardData, isLoading, isError } = useQuery({
    queryKey: ['dashboard-all'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/dashboard-all`);
      if (!res.ok) throw new Error('Failed to fetch dashboard data');
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000 // Auto-refresh every minute
  });

  // Fetch alerts separately (real-time)
  const { data: alerts } = useQuery({
    queryKey: ['target-alerts'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/targets/alerts`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 10000, // Cache for 10 seconds
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Fetch monthly details when a month is selected
  const { data: monthlyDetails, isLoading: loadingMonthlyDetails, error: monthlyError } = useQuery({
    queryKey: ['monthly-details', selectedMonth],
    queryFn: async () => {
      if (!selectedMonth) return null;
      console.log('🔍 Fetching monthly details for:', selectedMonth);
      const res = await fetch(`${API_BASE}/analytics/monthly-details?month=${selectedMonth.month}&year=${selectedMonth.year}`);
      if (!res.ok) {
        console.error('❌ API Error:', res.status, res.statusText);
        throw new Error('Failed to fetch monthly details');
      }
      const data = await res.json();
      console.log('✅ Monthly details received:', data);
      return data;
    },
    enabled: !!selectedMonth,
    staleTime: 60000
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Extract data from unified response
  const dashboardStats = useMemo(() => dashboardData || {}, [dashboardData]);
  const empPerf = useMemo(() => dashboardData?.topEmployees || [], [dashboardData]);
  const companySales = useMemo(() => dashboardData?.topCompanies || [], [dashboardData]);

  // Calculate additional metrics
  const totalSales = empPerf?.reduce((sum, emp) => sum + emp.totalSales, 0) || 0;
  const topEmployee = empPerf?.[0];
  const totalCompanySales = companySales?.reduce((sum, comp) => sum + comp.totalAmount, 0) || 0;
  const topCompany = companySales?.[0];

  // Calculate active vs inactive employees
  const activeEmployees = empPerf?.filter(emp => emp.totalVouchers > 0).length || 0;
  const inactiveEmployees = (dashboardStats?.employeeCount || 0) - activeEmployees;

  // Calculate sales conversion rate
  const salesConversionRate = dashboardStats?.totalVouchers > 0 
    ? ((dashboardStats?.salesCount / dashboardStats?.totalVouchers) * 100).toFixed(1)
    : 0;

  // Get recent months data
  const recentMonthsData = useMemo(() => {
    if (!dashboardStats?.monthlyData) return [];
    return dashboardStats.monthlyData.slice(-6);
  }, [dashboardStats]);

  // Calculate growth trend
  const monthlyGrowth = useMemo(() => {
    if (!recentMonthsData || recentMonthsData.length < 2) return null;
    const current = recentMonthsData[recentMonthsData.length - 1]?.amount || 0;
    const previous = recentMonthsData[recentMonthsData.length - 2]?.amount || 0;
    if (previous === 0) return null;
    return (((current - previous) / previous) * 100).toFixed(1);
  }, [recentMonthsData]);

  // Calculate employee productivity metrics
  const avgVouchersPerEmployee = useMemo(() => {
    if (!empPerf || empPerf.length === 0) return 0;
    const totalVouchers = empPerf.reduce((sum, emp) => sum + emp.totalVouchers, 0);
    return (totalVouchers / empPerf.length).toFixed(1);
  }, [empPerf]);

  const avgSalesPerEmployee = useMemo(() => {
    if (!empPerf || empPerf.length === 0) return 0;
    return totalSales / empPerf.length;
  }, [empPerf, totalSales]);

  return (
    <div className="py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-4">
          {dashboardStats?.dateRange?.minDate && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDate(dashboardStats.dateRange.minDate)} - {formatDate(dashboardStats.dateRange.maxDate)}
              </span>
            </div>
          )}
          <button
            onClick={() => router.push('/targets')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2"
          >
            <Target className="h-4 w-4" />
            Manage Targets
          </button>
        </div>
      </div>

      {/* Real-time Alerts */}
      {alerts && alerts.length > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-blue-700">
              <AlertTriangle className="h-5 w-5" />
              Performance Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                      {alert.status.replace('-', ' ').toUpperCase()}
                    </Badge>
                    <span className="font-medium">{alert.message}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-red-600">
                      {formatCurrency(alert.shortfall)} behind
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {alert.progressPercentage}% achieved
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h3 className="font-semibold text-lg">Loading Analytics...</h3>
            <p className="text-sm text-muted-foreground">Fetching comprehensive business data</p>
          </div>
        </div>
      ) : isError ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">Failed to Load Dashboard</h3>
              <p className="text-sm text-muted-foreground mb-4">
                We encountered an error while loading your analytics data.
              </p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Primary Revenue Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardStats?.totalAmount || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(dashboardStats?.totalVouchers || 0)} total vouchers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(dashboardStats?.totalSales || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatNumber(dashboardStats?.salesCount || 0)} sales vouchers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardStats?.avgVoucherValue || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per voucher average
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Growth</CardTitle>
                {monthlyGrowth && parseFloat(monthlyGrowth) >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-600" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-600" />
                )}
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${monthlyGrowth && parseFloat(monthlyGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {monthlyGrowth ? `${monthlyGrowth > 0 ? '+' : ''}${monthlyGrowth}%` : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Month-over-month change
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Team & Operational Metrics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatNumber(activeEmployees)}</div>
                <p className="text-xs text-muted-foreground">
                  {inactiveEmployees} inactive • {dashboardStats?.employeeCount} total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Companies</CardTitle>
                <Building2 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatNumber(dashboardStats?.companyCount || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Business partners
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sales Conversion</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{salesConversionRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Vouchers converted to sales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
                <Award className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                {topEmployee ? (
                  <>
                    <div className="text-2xl font-bold truncate">{topEmployee.employeeName || topEmployee.name}</div>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(topEmployee.totalSales)}
                    </p>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">No data</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Employee Productivity Metrics */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Employee Productivity</CardTitle>
                <CardDescription>Average performance per employee</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Avg Vouchers per Employee</span>
                  </div>
                  <span className="text-lg font-bold">{avgVouchersPerEmployee}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Avg Sales per Employee</span>
                  </div>
                  <span className="text-lg font-bold">{formatCurrency(avgSalesPerEmployee)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Employee Utilization Rate</span>
                  </div>
                  <span className="text-lg font-bold">
                    {dashboardStats?.employeeCount > 0 
                      ? ((activeEmployees / dashboardStats.employeeCount) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Highlights</CardTitle>
                <CardDescription>Key business indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Top Company</span>
                  </div>
                  <span className="text-sm font-semibold truncate max-w-[200px]">
                    {topCompany?.companyName || topCompany?.companyNormalized || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Top Company Revenue</span>
                  </div>
                  <span className="text-lg font-bold">
                    {topCompany ? formatCurrency(topCompany.totalAmount) : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Non-Sales Vouchers</span>
                  </div>
                  <span className="text-lg font-bold">
                    {formatNumber((dashboardStats?.totalVouchers || 0) - (dashboardStats?.salesCount || 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends */}
          {recentMonthsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Performance Trends</CardTitle>
                <CardDescription>Last {recentMonthsData.length} months revenue and volume breakdown - Click on any month for detailed insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentMonthsData.map((month, index) => {
                    const prevMonth = index > 0 ? recentMonthsData[index - 1] : null;
                    const growth = prevMonth && prevMonth.amount > 0
                      ? (((month.amount - prevMonth.amount) / prevMonth.amount) * 100).toFixed(1)
                      : null;
                    
                    // Format month display - handle both string and object formats
                    const monthDisplay = typeof month._id === 'string' 
                      ? month._id 
                      : `${month._id?.month || ''}/${month._id?.year || ''}`;
                    
                    const handleMonthClick = () => {
                      if (typeof month._id === 'object' && month._id.month && month._id.year) {
                        setSelectedMonth({ month: month._id.month, year: month._id.year });
                        setIsModalOpen(true);
                      }
                    };
                    
                    return (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                        onClick={handleMonthClick}
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-28">
                            <div className="font-semibold">{monthDisplay}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-8">
                            <div>
                              <div className="text-xs text-muted-foreground">Revenue</div>
                              <div className="font-bold text-green-600">{formatCurrency(month.amount)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Vouchers</div>
                              <div className="font-bold">{formatNumber(month.count)}</div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground">Avg Value</div>
                              <div className="font-bold">
                                {formatCurrency(month.count > 0 ? month.amount / month.count : 0)}
                              </div>
                            </div>
                          </div>
                        </div>
                        {growth !== null && (
                          <Badge 
                            variant={parseFloat(growth) >= 0 ? 'default' : 'destructive'}
                            className="ml-4"
                          >
                            {parseFloat(growth) >= 0 ? (
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                            ) : (
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                            )}
                            {parseFloat(growth) >= 0 ? '+' : ''}{growth}%
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Employee Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Employee Performance
          </CardTitle>
          <CardDescription>Sales performance and voucher counts by employee (Top 10)</CardDescription>
        </CardHeader>
        <CardContent>
          {empPerf && empPerf.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Employee Name</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead className="text-right">Total Sales</TableHead>
                  <TableHead className="text-right">Sales Vouchers</TableHead>
                  <TableHead className="text-right">Total Vouchers</TableHead>
                  <TableHead className="text-right">Avg Sale</TableHead>
                  <TableHead className="text-center">Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empPerf.slice(0, 10).map((emp, index) => {
                  const avgSale = emp.salesCount > 0 ? emp.totalSales / emp.salesCount : 0;
                  const conversionRate = emp.totalVouchers > 0 ? (emp.salesCount / emp.totalVouchers) * 100 : 0;
                  
                  return (
                    <TableRow 
                      key={emp._id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/employees/${emp._id}`)}
                    >
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{emp.employeeName || emp.name}</TableCell>
                      <TableCell className="text-muted-foreground">{emp.employeeCode || 'N/A'}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(emp.totalSales)}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(emp.salesCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(emp.totalVouchers)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(avgSale)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={conversionRate >= 50 ? 'default' : conversionRate >= 25 ? 'secondary' : 'outline'}>
                          {conversionRate.toFixed(0)}% conv.
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No employee performance data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Company Sales Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Top Company Sales Analysis
          </CardTitle>
          <CardDescription>Revenue breakdown by company (Top 10)</CardDescription>
        </CardHeader>
        <CardContent>
          {companySales && companySales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Company Name</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Voucher Count</TableHead>
                  <TableHead className="text-right">Average Transaction</TableHead>
                  <TableHead className="text-center">Market Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companySales.slice(0, 10).map((company, index) => {
                  const avgTransaction = company.voucherCount > 0 ? company.totalAmount / company.voucherCount : 0;
                  const marketShare = totalCompanySales > 0 ? (company.totalAmount / totalCompanySales) * 100 : 0;
                  
                  return (
                    <TableRow key={company._id || index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {company.companyName || company.companyNormalized || 'Unknown'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-600">
                        {formatCurrency(company.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">{formatNumber(company.voucherCount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(avgTransaction)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={marketShare >= 10 ? 'default' : 'secondary'}>
                          {marketShare.toFixed(1)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No company sales data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Details Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              {selectedMonth && `Monthly Insights - ${new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}`}
            </DialogTitle>
            <DialogDescription>
              Detailed sales and performance metrics for this month
            </DialogDescription>
          </DialogHeader>

          {loadingMonthlyDetails ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : monthlyError ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-muted-foreground">Failed to load monthly details</p>
              <p className="text-sm text-red-600 mt-2">{monthlyError.message}</p>
            </div>
          ) : monthlyDetails && monthlyDetails.summary ? (
            <div className="space-y-6">
              {/* Monthly Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(monthlyDetails.summary?.totalAmount || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Vouchers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatNumber(monthlyDetails.summary?.totalVouchers || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Sales Vouchers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatNumber(monthlyDetails.summary?.salesVouchers || 0)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Avg Deal Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {formatCurrency(monthlyDetails.summary?.avgDealSize || 0)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Performance Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Sales Conversion Rate</span>
                    </div>
                    <span className="text-lg font-bold">
                      {monthlyDetails.summary?.totalVouchers > 0 
                        ? ((monthlyDetails.summary.salesVouchers / monthlyDetails.summary.totalVouchers) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Active Employees</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">
                      {monthlyDetails.summary?.activeEmployees || 0}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Active Companies</span>
                    </div>
                    <span className="text-lg font-bold text-purple-600">
                      {monthlyDetails.summary?.activeCompanies || 0}
                    </span>
                  </div>

                  {monthlyDetails.summary?.growth !== null && monthlyDetails.summary?.growth !== undefined && (
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {monthlyDetails.summary.growth >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">Month-over-Month Growth</span>
                      </div>
                      <span className={`text-lg font-bold ${monthlyDetails.summary.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {monthlyDetails.summary.growth >= 0 ? '+' : ''}{monthlyDetails.summary.growth.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Performers for the Month */}
              {monthlyDetails.topEmployees && monthlyDetails.topEmployees.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4 text-yellow-600" />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Employee</TableHead>
                          <TableHead className="text-right">Sales</TableHead>
                          <TableHead className="text-right">Vouchers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyDetails.topEmployees.slice(0, 5).map((emp, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{emp.employeeName || emp.name}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600">
                              {formatCurrency(emp.totalSales)}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(emp.voucherCount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {monthlyDetails.topEmployees.length > 5 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-3"
                        onClick={() => router.push('/employees')}
                      >
                        See Full List
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Top Companies for the Month */}
              {monthlyDetails.topCompanies && monthlyDetails.topCompanies.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-600" />
                      Top Companies
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Vouchers</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyDetails.topCompanies.slice(0, 5).map((company, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{idx + 1}</TableCell>
                            <TableCell className="font-medium">
                              {company.companyName || company.companyNormalized || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-blue-600">
                              {formatCurrency(company.totalAmount)}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(company.voucherCount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {monthlyDetails.topCompanies.length > 5 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-3"
                        onClick={() => router.push('/analytics')}
                      >
                        See Full List
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Month Vouchers */}
              {monthlyDetails.vouchers && monthlyDetails.vouchers.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-blue-600" />
                      Recent Vouchers ({monthlyDetails.summary?.totalVouchers || 0} total)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Voucher No</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {monthlyDetails.vouchers.map((voucher, idx) => (
                          <TableRow key={idx} className="hover:bg-muted/50">
                            <TableCell className="text-sm">
                              {new Date(voucher.date).toLocaleDateString('en-IN', { 
                                day: '2-digit', 
                                month: 'short' 
                              })}
                            </TableCell>
                            <TableCell className="font-medium">{voucher.voucherNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {voucher.rawOriginal?.Vch_Type || 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {voucher.companyId?.name || voucher.companyId?.normalized || 'Unknown'}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {formatCurrency(voucher.totalAmount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {monthlyDetails.summary?.totalVouchers > 20 && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-3"
                        onClick={() => router.push('/vouchers')}
                      >
                        View All {monthlyDetails.summary.totalVouchers} Vouchers
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data available for this month
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
