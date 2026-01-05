"use client";

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileText, Users, DollarSign, Building2, Calendar, BarChart, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
  const router = useRouter();

  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/dashboard-stats`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 60000 // Auto-refresh every minute
  });

  const { data: recentVouchers, isLoading: loadingVouchers } = useQuery({
    queryKey: ['recent-vouchers'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/recent-vouchers?limit=10`);
      if (!res.ok) throw new Error('Failed to fetch vouchers');
      return res.json();
    },
    staleTime: 20000, // Cache for 20 seconds
    refetchInterval: 60000 // Auto-refresh every minute
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatMonthYear = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long'
    });
  };

  const kpiCards = [
    { 
      title: "Total Sales", 
      value: formatCurrency(stats?.totalSales || 0), 
      subtitle: `${stats?.salesCount || 0} sales vouchers`,
      icon: DollarSign, 
      color: "text-green-600",
      loading: loadingStats
    },
    { 
      title: "Total Vouchers", 
      value: stats?.totalVouchers?.toLocaleString() || '0', 
      subtitle: `Avg: ${formatCurrency(stats?.avgVoucherValue || 0)}`,
      icon: FileText, 
      color: "text-blue-600",
      loading: loadingStats
    },
    { 
      title: "Active Employees", 
      value: stats?.employeeCount || 0, 
      subtitle: 'Registered employees',
      icon: Users, 
      color: "text-purple-600",
      loading: loadingStats
    },
    { 
      title: "Companies", 
      value: stats?.companyCount || 0, 
      subtitle: 'Total companies',
      icon: Building2, 
      color: "text-orange-600",
      loading: loadingStats
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between animate-fadeIn">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Dashboard Overview
            </h1>
            <p className="text-gray-600 mt-1">Welcome back! Here&apos;s what&apos;s happening with your sales.</p>
          </div>
          <Button 
            onClick={() => router.push('/analytics')} 
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <BarChart className="h-4 w-4" />
            View Analytics
          </Button>
        </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map(({ title, value, subtitle, icon: Icon, loading }, idx) => (
          <Card key={title} className="hover-lift border-l-4 border-l-blue-500 bg-white animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-gray-600">
                {title}
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-50">
                <Icon className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="shimmer h-8 w-32 rounded"></div>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Data Range and Monthly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn animate-delay-200">
        {/* Date Range Card */}
        <Card className="hover-lift border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              Data Time Range
            </CardTitle>
            <CardDescription>Available voucher data period</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-3">
                <div className="shimmer h-20 rounded-lg"></div>
                <div className="shimmer h-6 rounded"></div>
              </div>
            ) : stats?.dateRange?.minDate && stats?.dateRange?.maxDate ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div>
                    <p className="text-sm text-gray-600">From</p>
                    <p className="text-lg font-semibold text-gray-900">{formatMonthYear(stats.dateRange.minDate)}</p>
                  </div>
                  <div className="text-2xl text-blue-400">→</div>
                  <div>
                    <p className="text-sm text-gray-600">To</p>
                    <p className="text-lg font-semibold text-gray-900">{formatMonthYear(stats.dateRange.maxDate)}</p>
                  </div>
                </div>
                <div className="text-center text-xs text-gray-500">
                  {Math.ceil((new Date(stats.dateRange.maxDate) - new Date(stats.dateRange.minDate)) / (1000 * 60 * 60 * 24 * 30))} months of data
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No voucher data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Distribution */}
        <Card className="hover-lift border-t-4 border-t-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <BarChart className="h-5 w-5 text-blue-600" />
              </div>
              Monthly Voucher Distribution
            </CardTitle>
            <CardDescription>Vouchers per month</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="shimmer h-12 rounded"></div>
                ))}
              </div>
            ) : stats?.monthlyData && stats.monthlyData.length > 0 ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.monthlyData.slice(-6).reverse().map((month, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-300 border border-blue-100">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(month._id.year, month._id.month - 1).toLocaleDateString('en-IN', { 
                        year: 'numeric', 
                        month: 'short' 
                      })}
                    </span>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-blue-600 text-white shadow-sm">{month.count} vouchers</Badge>
                      <span className="text-sm font-medium text-gray-700">{formatCurrency(month.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No monthly data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Vouchers */}
      <Card className="hover-lift animate-fadeIn animate-delay-300 bg-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                Recent Vouchers
              </CardTitle>
              <CardDescription>Latest 10 vouchers in the system</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/vouchers')}
              className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all duration-300"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingVouchers ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="shimmer h-16 rounded-lg"></div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Voucher No</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="text-right font-semibold">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentVouchers && recentVouchers.length > 0 ? (
                    recentVouchers.map((voucher, idx) => (
                      <TableRow key={voucher._id} className="hover:bg-blue-50/50 transition-colors duration-200 animate-fadeIn" style={{ animationDelay: `${idx * 50}ms` }}>
                      <TableCell className="text-sm text-gray-600">{formatDate(voucher.date)}</TableCell>
                      <TableCell className="font-semibold text-gray-900">{voucher.voucherNumber}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700">{voucher.rawOriginal?.Vch_Type || 'N/A'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-gray-700">{voucher.companyId?.name || voucher.companyId?.normalized || 'Unknown'}</TableCell>
                      <TableCell className="text-right font-bold text-gray-900">{formatCurrency(voucher.totalAmount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No vouchers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}
