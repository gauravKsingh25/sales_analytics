"use client";

import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, FileText, Receipt, TrendingUp, TrendingDown, Building2, Calendar } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

export default function PartyTransactionModal({ isOpen, onClose, partyName }) {

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['party-transactions', partyName],
    queryFn: async () => {
      const encodedParty = encodeURIComponent(partyName);
      const res = await fetch(`${API_BASE}/vouchers/party/${encodedParty}/transactions`);
      if (!res.ok) throw new Error('Failed to fetch party transactions');
      return res.json();
    },
    enabled: isOpen && !!partyName
  });

  const formatCurrency = (amount) => {
    const value = Math.abs(amount || 0);
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getVoucherTypeBadge = (transaction) => {
    if (transaction.type === 'creditnote') {
      return transaction.isCancelled ? (
        <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
          Cancelled Credit Note
        </Badge>
      ) : (
        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-300">
          Credit Note
        </Badge>
      );
    }
    
    const vchType = transaction.voucherType?.toLowerCase() || '';
    if (vchType.includes('sales')) {
      return <Badge className="bg-green-100 text-green-700 border-green-300">Sales</Badge>;
    }
    return <Badge variant="outline">{transaction.voucherType}</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Building2 className="h-6 w-6 text-blue-600" />
            {partyName}
          </DialogTitle>
          <DialogDescription>
            All transactions (vouchers and credit notes) for this party
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {isError && (
          <div className="p-6 text-center">
            <p className="text-red-600">Failed to load transactions: {error?.message}</p>
          </div>
        )}

        {data && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(data.summary?.totalVoucherAmount || data.summary?.totalSales || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.summary?.totalVouchers || 0} vouchers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Credit Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="text-xl font-bold text-red-600">
                      {formatCurrency(data.summary?.totalCreditNotes || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.summary?.totalCreditNotes || 0} credit notes
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-emerald-800">Net Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <span className="text-xl font-bold text-emerald-600">
                      {formatCurrency(data.summary?.netAmount || 0)}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1">Sales - Credit Notes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" />
                    <span className="text-xl font-bold text-blue-600">
                      {data.summary?.totalTransactions || 0}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">All records</p>
                </CardContent>
              </Card>
            </div>

            {/* Transactions Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Voucher Number</TableHead>
                    <TableHead className="font-semibold">Company</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.transactions && data.transactions.length > 0 ? (
                    data.transactions.map((transaction, index) => (
                      <TableRow 
                        key={transaction._id || index}
                        className={transaction.isCancelled ? 'bg-gray-50 opacity-60' : ''}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {formatDate(transaction.date)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getVoucherTypeBadge(transaction)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {transaction.voucherNumber}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {transaction.company || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {transaction.type === 'creditnote' ? (
                            <span className="text-red-600">
                              - {formatCurrency(Math.abs(transaction.amount))}
                            </span>
                          ) : (
                            <span className="text-green-600">
                              {formatCurrency(transaction.amount)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No transactions found for this party
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {data.transactions && data.transactions.length > 10 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Showing all {data.transactions.length} transactions (newest first)
              </p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
