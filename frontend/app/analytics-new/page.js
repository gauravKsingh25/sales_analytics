"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  ShoppingCart,
  Package,
  Calendar,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Building2,
  CreditCard,
  Sparkles
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch current month overview
  const { data: currentMonth, isLoading: loadingCurrent } = useQuery({
    queryKey: ['current-month-overview'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/current-month-overview`);
      if (!res.ok) throw new Error('Failed to fetch current month data');
      return res.json();
    },
    staleTime: 60000
  });

  // Fetch all-time overview
  const { data: allTime, isLoading: loadingAllTime } = useQuery({
    queryKey: ['all-time-overview'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/all-time-overview`);
      if (!res.ok) throw new Error('Failed to fetch all-time data');
      return res.json();
    },
    staleTime: 60000
  });

  // Fetch monthly sales trend
  const { data: monthlySales, isLoading: loadingTrend } = useQuery({
    queryKey: ['monthly-sales-trend'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/monthly-sales-trend`);
      if (!res.ok) throw new Error('Failed to fetch sales trend');
      return res.json();
    },
    staleTime: 60000
  });

  // Fetch voucher type distribution
  const { data: voucherTypes, isLoading: loadingTypes } = useQuery({
    queryKey: ['voucher-type-distribution'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/voucher-type-distribution`);
      if (!res.ok) throw new Error('Failed to fetch voucher types');
      return res.json();
    },
    staleTime: 60000
  });

  // Fetch credit notes trend
  const { data: creditNotesTrend, isLoading: loadingCreditNotes } = useQuery({
    queryKey: ['credit-notes-trend'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/credit-notes-trend`);
      if (!res.ok) throw new Error('Failed to fetch credit notes');
      return res.json();
    },
    staleTime: 60000
  });

  // Fetch top selling items
  const { data: topItems, isLoading: loadingItems } = useQuery({
    queryKey: ['top-selling-items'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/top-selling-items?limit=10`);
      if (!res.ok) throw new Error('Failed to fetch top items');
      return res.json();
    },
    staleTime: 60000
  });

  // Fetch trending items
  const { data: trendingItems, isLoading: loadingTrending } = useQuery({
    queryKey: ['trending-items'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/analytics/trending-items`);
      if (!res.ok) throw new Error('Failed to fetch trending items');
      return res.json();
    },
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

  const formatPercent = (num) => {
    return `${num > 0 ? '+' : ''}${num.toFixed(1)}%`;
  };

  const getMonthName = (month) => {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[month - 1] || '';
  };

  // Prepare chart data
  const salesTrendData = monthlySales?.map(item => ({
    name: `${getMonthName(item._id.month)} ${item._id.year}`,
    sales: item.salesAmount,
    vouchers: item.voucherCount
  })) || [];

  const voucherTypeData = voucherTypes?.slice(0, 6).map(item => ({
    name: item._id || 'Unknown',
    value: item.count,
    amount: item.totalAmount
  })) || [];

  const creditNotesData = creditNotesTrend?.map(item => ({
    name: `${getMonthName(item._id.month)} ${item._id.year}`,
    amount: item.totalAmount,
    count: item.count
  })) || [];

  if (loadingCurrent || loadingAllTime) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights and trends</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Calendar className="h-4 w-4 mr-2" />
          {currentMonth && `${getMonthName(currentMonth.month)} ${currentMonth.year}`}
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales Trends</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="vouchers">Vouchers & Credit Notes</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          {/* Current Month Stats */}
          <div>
            <h2 className="text-xl font-semibold mb-3">This Month</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Sales Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(currentMonth?.sales.amount)}</div>
                  <div className="flex items-center text-xs">
                    {currentMonth?.sales.growth > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={currentMonth?.sales.growth > 0 ? 'text-green-500' : 'text-red-500'}>
                      {formatPercent(currentMonth?.sales.growth || 0)}
                    </span>
                    <span className="text-muted-foreground ml-1">vs last month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(currentMonth?.sales.count)} sales
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(currentMonth?.items.totalSold)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(currentMonth?.items.totalQuantity)} units
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(currentMonth?.items.uniqueProducts)} unique products
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Credit Notes</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(currentMonth?.creditNotes.amount)}</div>
                  <div className="flex items-center text-xs">
                    {currentMonth?.creditNotes.growth > 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-orange-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-green-500 mr-1" />
                    )}
                    <span className={currentMonth?.creditNotes.growth > 0 ? 'text-orange-500' : 'text-green-500'}>
                      {formatPercent(currentMonth?.creditNotes.growth || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(currentMonth?.creditNotes.count)} credit notes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(currentMonth?.activity.activeEmployees)}</div>
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(currentMonth?.activity.activeCompanies)} companies
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* All Time Stats */}
          <div>
            <h2 className="text-xl font-semibold mb-3">All Time Performance</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(allTime?.vouchers.salesAmount)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(allTime?.vouchers.salesCount)} vouchers
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Avg: {formatCurrency(allTime?.vouchers.avgDealSize)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Products Sold</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(allTime?.items.totalSold)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(allTime?.items.totalQuantity)} units
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(allTime?.items.uniqueProducts)} unique products
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Credit Notes</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(allTime?.creditNotes.totalAmount)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(allTime?.creditNotes.total)} notes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(allTime?.entities.companies)}</div>
                  <p className="text-xs text-muted-foreground">Companies</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatNumber(allTime?.entities.employees)} employees
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* SALES TRENDS TAB */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Monthly Sales Trend */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Monthly Sales Trend (Last 12 Months)</CardTitle>
                <CardDescription>Sales revenue and voucher count over time</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTrend ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesTrendData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#8884d8" 
                        fillOpacity={1} 
                        fill="url(#colorSales)" 
                        name="Sales Amount"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="vouchers" 
                        stroke="#82ca9d" 
                        name="Voucher Count"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Credit Notes Trend */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Credit Notes Trend</CardTitle>
                <CardDescription>Credit notes issued over time</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingCreditNotes ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={creditNotesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="amount" fill="#ff8042" name="Credit Amount" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PRODUCTS TAB */}
        <TabsContent value="products" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Selling Items */}
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products (All Time)</CardTitle>
                <CardDescription>Best performing products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingItems ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topItems?.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            Qty: {formatNumber(item.totalQty)} • Orders: {formatNumber(item.orderCount)}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <p className="text-sm font-bold">{formatCurrency(item.totalAmount)}</p>
                          <p className="text-xs text-muted-foreground">
                            @{formatCurrency(item.avgPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Trending Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-yellow-500" />
                  Trending Products
                </CardTitle>
                <CardDescription>Top growth this month vs last month</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTrending ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {trendingItems?.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.itemName}</p>
                          <p className="text-xs text-muted-foreground">
                            This month: {formatNumber(item.thisMonthQty)} units
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <div className="flex items-center justify-end">
                            {item.amountGrowth > 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                            )}
                            <span className={`text-sm font-bold ${item.amountGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                              {formatPercent(item.amountGrowth)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.thisMonthAmount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Items Chart */}
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Top 10 Products Revenue Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingItems ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={topItems?.slice(0, 10)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="itemName" type="category" width={200} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Bar dataKey="totalAmount" fill="#8884d8" name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* VOUCHERS TAB */}
        <TabsContent value="vouchers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Voucher Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Voucher Type Distribution</CardTitle>
                <CardDescription>Breakdown by voucher types</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTypes ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={voucherTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {voucherTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Voucher Type Details */}
            <Card>
              <CardHeader>
                <CardTitle>Voucher Type Details</CardTitle>
                <CardDescription>Count and total amount by type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {voucherTypes?.slice(0, 8).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{item._id || 'Unknown'}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatNumber(item.count)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.totalAmount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
