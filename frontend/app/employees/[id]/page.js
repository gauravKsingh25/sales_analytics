"use client";

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, TrendingUp, Receipt, Users } from 'lucide-react';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id;

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employee-details', employeeId],
    queryFn: async () => {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
      const res = await fetch(`${API_BASE}/employees/${employeeId}/details`);
      if (!res.ok) throw new Error('Failed to fetch employee details');
      return res.json();
    },
    enabled: !!employeeId
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Employee Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700">{error?.message || 'An error occurred'}</p>
            <Button onClick={() => router.push('/employees')} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Employees
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { employee, totalSales, allVouchers, stats, subordinates, subordinatesTotalSales, teamSales, subordinatesVouchers } = data || {};

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/employees')}
            className="mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Employees
          </Button>
          <h1 className="text-3xl font-bold">{employee?.name}</h1>
          <p className="text-gray-500">Employee Code: {employee?.employeeCode || 'N/A'}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-gray-500 mt-1">
              From {stats?.salesVouchersCount || 0} sales vouchers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Sales</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(teamSales || totalSales)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {subordinates && subordinates.length > 0 
                ? `Including ${subordinates.length} subordinate${subordinates.length > 1 ? 's' : ''}`
                : 'No subordinates'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalVouchers || 0}</div>
            <p className="text-xs text-gray-500 mt-1">All voucher types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats?.salesVouchersCount > 0 ? totalSales / stats.salesVouchersCount : 0)}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per sales voucher</p>
          </CardContent>
        </Card>
      </div>

      {/* All Vouchers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Vouchers ({allVouchers?.length || 0})</CardTitle>
          <CardDescription>All vouchers directly associated with this employee</CardDescription>
        </CardHeader>
        <CardContent>
          {allVouchers && allVouchers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Voucher No.</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allVouchers.map((voucher) => {
                    const vchType = voucher.rawOriginal?.Vch_Type || 'Unknown';
                    const isSales = vchType.toLowerCase().includes('sales');
                    
                    return (
                      <TableRow key={voucher._id}>
                        <TableCell className="font-medium">
                          {voucher.voucherNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant={isSales ? "default" : "secondary"}>
                            {vchType}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(voucher.date)}</TableCell>
                        <TableCell>{voucher.rawOriginal?.Party || 'N/A'}</TableCell>
                        <TableCell>
                          {voucher.companyId?.name || voucher.companyId?.normalized || 'Unknown'}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${isSales ? 'text-green-600' : ''}`}>
                          {formatCurrency(voucher.totalAmount)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No vouchers found for this employee
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subordinates Section */}
      {subordinates && subordinates.length > 0 && (
        <>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members ({subordinates.length})
              </CardTitle>
              <CardDescription>Employees who report directly to {employee?.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Total Vouchers</TableHead>
                      <TableHead className="text-right">Sales Vouchers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subordinates.map((sub) => (
                      <TableRow key={sub._id}>
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell>{sub.employeeCode}</TableCell>
                        <TableCell>
                          {sub.designation ? (
                            <Badge variant="outline">{sub.designation.title}</Badge>
                          ) : (
                            <span className="text-gray-500 text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(sub.sales || 0)}
                        </TableCell>
                        <TableCell className="text-right">{sub.vouchersCount || 0}</TableCell>
                        <TableCell className="text-right">{sub.salesVouchersCount || 0}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-amber-100 dark:bg-amber-900 font-bold">
                      <TableCell colSpan={3}>Subordinates Total</TableCell>
                      <TableCell className="text-right text-green-600">
                        {formatCurrency(subordinatesTotalSales || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {subordinates.reduce((sum, sub) => sum + (sub.vouchersCount || 0), 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {subordinates.reduce((sum, sub) => sum + (sub.salesVouchersCount || 0), 0)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Subordinates' Vouchers */}
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle>Team Vouchers ({subordinatesVouchers?.length || 0})</CardTitle>
              <CardDescription>
                All vouchers from team members who report to {employee?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subordinatesVouchers && subordinatesVouchers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voucher No.</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subordinatesVouchers.map((voucher) => {
                        const vchType = voucher.rawOriginal?.Vch_Type || 'Unknown';
                        const isSales = vchType.toLowerCase().includes('sales');
                        
                        return (
                          <TableRow key={voucher._id}>
                            <TableCell className="font-medium">
                              {voucher.voucherNumber}
                            </TableCell>
                            <TableCell>
                              <Badge variant={isSales ? "default" : "secondary"}>
                                {vchType}
                              </Badge>
                            </TableCell>
                            <TableCell>{formatDate(voucher.date)}</TableCell>
                            <TableCell>{voucher.rawOriginal?.Party || 'N/A'}</TableCell>
                            <TableCell>
                              {voucher.companyId?.name || voucher.companyId?.normalized || 'Unknown'}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${isSales ? 'text-green-600' : ''}`}>
                              {formatCurrency(voucher.totalAmount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No vouchers found for team members
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
