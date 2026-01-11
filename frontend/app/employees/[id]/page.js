"use client";

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowLeft, TrendingUp, Receipt, Users, Search, Filter, X } from 'lucide-react';
import PartyTransactionModal from '@/components/PartyTransactionModal';
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';
export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id;

  const [selectedParty, setSelectedParty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [voucherTypeFilter, setVoucherTypeFilter] = useState('');
  const [partyFilter, setPartyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const handlePartyClick = (partyName) => {
    setSelectedParty(partyName);
    setIsModalOpen(true);
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employee-details', employeeId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/employees/${employeeId}/details`);
      if (!res.ok) throw new Error('Failed to fetch employee details');
      return res.json();
    },
    enabled: !!employeeId
  });

  const { employee, totalSales, totalCreditNotes, netSales, allVouchers, stats, subordinates, subordinatesTotalSales, teamSales, subordinatesVouchers, responsibleParties } = data || {};

  // Filter and search vouchers - MUST be before conditional returns
  const filteredVouchers = useMemo(() => {
    if (!allVouchers) return [];
    
    return allVouchers.filter(voucher => {
      const voucherNumber = voucher.voucherNumber?.toLowerCase() || '';
      const vchType = voucher.rawOriginal?.Vch_Type?.toLowerCase() || '';
      const party = voucher.rawOriginal?.Party?.toLowerCase() || '';
      const company = (voucher.companyId?.name || voucher.companyId?.normalized || '').toLowerCase();
      const search = searchQuery.toLowerCase();
      
      // Search filter
      if (searchQuery && !(
        voucherNumber.includes(search) ||
        vchType.includes(search) ||
        party.includes(search) ||
        company.includes(search)
      )) {
        return false;
      }
      
      // Voucher type filter
      if (voucherTypeFilter && !vchType.includes(voucherTypeFilter.toLowerCase())) {
        return false;
      }
      
      // Party filter
      if (partyFilter && !party.includes(partyFilter.toLowerCase())) {
        return false;
      }
      
      // Date range filter
      if (dateFrom) {
        const voucherDate = new Date(voucher.date);
        const fromDate = new Date(dateFrom);
        if (voucherDate < fromDate) return false;
      }
      
      if (dateTo) {
        const voucherDate = new Date(voucher.date);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (voucherDate > toDate) return false;
      }
      
      return true;
    });
  }, [allVouchers, searchQuery, voucherTypeFilter, partyFilter, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchQuery('');
    setVoucherTypeFilter('');
    setPartyFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchQuery || voucherTypeFilter || partyFilter || dateFrom || dateTo;

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

  // Conditional returns AFTER all hooks
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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

        <Card className="border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Notes (Cost)</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalCreditNotes)}</div>
            <p className="text-xs text-gray-500 mt-1">
              From {stats?.creditNotesCount || 0} credit notes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Sales</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrency(netSales)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Sales - Credit Notes
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
            <CardTitle className="text-sm font-medium">Responsible Parties</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats?.partiesCount || 0}</div>
            <p className="text-xs text-gray-500 mt-1">Unique customers handled</p>
          </CardContent>
        </Card>
      </div>

      {/* Responsible Parties Card */}
      {responsibleParties && responsibleParties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Responsible Parties ({responsibleParties.length})</CardTitle>
            <CardDescription>All customers this employee is responsible for</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {responsibleParties.map((party, index) => (
                <button
                  key={index}
                  onClick={() => handlePartyClick(party)}
                  className="flex items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-300 transition-all cursor-pointer group"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mr-3 group-hover:bg-blue-200">
                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-300">
                      {party.charAt(0)}
                    </span>
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600">
                      {party}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Click to view transactions
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Vouchers Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Vouchers ({filteredVouchers?.length || 0})</CardTitle>
              <CardDescription>
                {hasActiveFilters ? `Filtered from ${allVouchers?.length || 0} total vouchers` : 'All voucher transactions'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </div>

          {/* Filter Section */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Search */}
                <div>
                  <Label htmlFor="search" className="text-sm font-medium">
                    Search
                  </Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Voucher, party, company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Voucher Type */}
                <div>
                  <Label htmlFor="voucherType" className="text-sm font-medium">
                    Voucher Type
                  </Label>
                  <Input
                    id="voucherType"
                    placeholder="e.g., Sales, Payment..."
                    value={voucherTypeFilter}
                    onChange={(e) => setVoucherTypeFilter(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Party */}
                <div>
                  <Label htmlFor="party" className="text-sm font-medium">
                    Party Name
                  </Label>
                  <Input
                    id="party"
                    placeholder="Filter by party..."
                    value={partyFilter}
                    onChange={(e) => setPartyFilter(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Date From */}
                <div>
                  <Label htmlFor="dateFrom" className="text-sm font-medium">
                    Date From
                  </Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="mt-1"
                  />
                </div>

                {/* Date To */}
                <div>
                  <Label htmlFor="dateTo" className="text-sm font-medium">
                    Date To
                  </Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {filteredVouchers && filteredVouchers.length > 0 ? (
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
                  {filteredVouchers.map((voucher) => {
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
                        <TableCell>
                          <button
                            onClick={() => voucher.rawOriginal?.Party && handlePartyClick(voucher.rawOriginal.Party)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {voucher.rawOriginal?.Party || 'N/A'}
                          </button>
                        </TableCell>
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
              {hasActiveFilters ? 'No vouchers match your filters' : 'No vouchers found for this employee'}
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

      {/* Party Transaction Modal */}
      <PartyTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partyName={selectedParty}
      />
    </div>
  );
}
