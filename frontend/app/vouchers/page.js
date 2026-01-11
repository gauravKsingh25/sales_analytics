"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useVouchers, useVoucherItems, useCreditNotes } from '../../lib/api';
import { useState } from 'react';
import { Loader2, ChevronDown, ChevronUp, FileText, ChevronLeft, ChevronRight, Filter, X, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import PartyTransactionModal from '@/components/PartyTransactionModal';

function VoucherDetails({ voucherId, employees, voucher, onPartyClick }) {
  const { data, isLoading } = useVoucherItems(voucherId);
  const [employeeSearch, setEmployeeSearch] = useState('');

  // Filter employees based on search
  const filteredEmployees = employees?.filter(emp => 
    emp.name?.toLowerCase().includes(employeeSearch.toLowerCase()) ||
    emp.role?.toLowerCase().includes(employeeSearch.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const rawOriginal = voucher?.rawOriginal;
  const details = rawOriginal?.Details || [];
  
  // Separate accounts/ledgers from staff entries
  const accountEntries = details.filter(d => d.Account);
  const staffEntries = details.filter(d => d.Staff && !d.Account);

  return (
    <div className="p-4 space-y-4">
      {/* Basic Voucher Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">Voucher Type</p>
          <p className="font-medium">{rawOriginal?.Vch_Type || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Party</p>
          <button
            onClick={() => rawOriginal?.Party && onPartyClick(rawOriginal.Party)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
          >
            {rawOriginal?.Party || 'N/A'}
          </button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Debit Amount</p>
          <p className="font-medium">₹{rawOriginal?.Debit_Amount?.toLocaleString('en-IN') || '0'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Credit Amount</p>
          <p className="font-medium">₹{rawOriginal?.Credit_Amount?.toLocaleString('en-IN') || '0'}</p>
        </div>
      </div>

      {/* Account Ledger Entries */}
      {accountEntries.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Accounting Entries:
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account/Ledger</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accountEntries.map((entry, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{entry.Account}</TableCell>
                  <TableCell>
                    {entry.Account?.includes('SALE') ? (
                      <Badge variant="default" className="bg-green-600">Sales</Badge>
                    ) : entry.Account?.includes('GST') || entry.Account?.includes('IGST') ? (
                      <Badge variant="secondary">Tax</Badge>
                    ) : entry.Account?.includes('DISCOUNT') ? (
                      <Badge variant="outline">Discount</Badge>
                    ) : (
                      <Badge variant="outline">Other</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {entry.Amount?.toLocaleString('en-IN') || '0'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Staff Allocation */}
      {staffEntries.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Staff Allocation:</h4>
          <div className="space-y-2">
            {staffEntries.map((entry, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-blue-600 text-white">Staff</Badge>
                  <span className="font-medium">{entry.Staff}</span>
                </div>
                <span className="font-semibold">₹{entry.Amount?.toLocaleString('en-IN') || '0'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Employees Section */}
      {employees && employees.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm">Associated Employees:</h4>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees by name or role..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredEmployees.length > 0 ? (
                filteredEmployees.map((e, idx) => (
                  <Badge key={idx} variant="outline" className="px-3 py-1">
                    {e.name} <span className="text-muted-foreground ml-1">({e.role})</span>
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No employees match your search</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No data message */}
      {accountEntries.length === 0 && staffEntries.length === 0 && (!employees || employees.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No additional details available for this voucher
        </p>
      )}
    </div>
  );
}

function CreditNoteDetails({ creditNote, onPartyClick }) {
  return (
    <div className="p-4 space-y-4">
      {/* Basic Credit Note Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-red-50 rounded-lg border border-red-200">
        <div>
          <p className="text-xs text-muted-foreground">Credit Note #</p>
          <p className="font-medium">{creditNote?.creditNoteNumber || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Party</p>
          <button
            onClick={() => creditNote?.party && onPartyClick(creditNote.party)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer text-left"
          >
            {creditNote?.party || 'N/A'}
          </button>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Credit Amount</p>
          <p className="font-medium text-red-600">₹{creditNote?.creditAmount?.toLocaleString('en-IN') || '0'}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Status</p>
          {creditNote?.isCancelled ? (
            <Badge variant="destructive">Cancelled</Badge>
          ) : (
            <Badge className="bg-green-600">Active</Badge>
          )}
        </div>
      </div>

      {/* Credit Note Details */}
      {creditNote?.details && creditNote.details.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Credit Note Items:
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Rate (₹)</TableHead>
                <TableHead className="text-right">Amount (₹)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {creditNote.details.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.description || 'N/A'}</TableCell>
                  <TableCell className="text-right">{item.quantity || '-'}</TableCell>
                  <TableCell className="text-right">{item.rate?.toLocaleString('en-IN') || '-'}</TableCell>
                  <TableCell className="text-right font-medium">
                    {item.amount?.toLocaleString('en-IN') || '0'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Metadata */}
      {creditNote?.meta && (
        <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
          {creditNote.meta.enteredBy && (
            <div>
              <p className="text-xs text-muted-foreground">Entered By</p>
              <p className="font-medium">{creditNote.meta.enteredBy}</p>
            </div>
          )}
          {creditNote.meta.grnNo && (
            <div>
              <p className="text-xs text-muted-foreground">GRN No</p>
              <p className="font-medium">{creditNote.meta.grnNo}</p>
            </div>
          )}
        </div>
      )}

      {/* No data message */}
      {(!creditNote?.details || creditNote.details.length === 0) && !creditNote?.meta && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No additional details available for this credit note
        </p>
      )}
    </div>
  );
}

export default function VouchersPage() {
  const [activeTab, setActiveTab] = useState('vouchers'); // 'vouchers' or 'creditnotes'
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    voucherNumber: '',
    partyName: '',
    dateFrom: '',
    dateTo: '',
    minAmount: '',
    maxAmount: '',
  });
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [selectedParty, setSelectedParty] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handlePartyClick = (partyName) => {
    setSelectedParty(partyName);
    setIsModalOpen(true);
  };

  // Build query params for vouchers
  const voucherQueryParams = {
    page,
    limit: 25,
    sortBy,
    sortOrder,
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  };

  // Build query params for credit notes - only include non-empty values
  const creditNoteQueryParams = {
    skip: (page - 1) * 25,
    limit: 25,
    sortBy,
    sortOrder,
    ...(filters.partyName && { party: filters.partyName }),
    ...(filters.dateFrom && { startDate: filters.dateFrom }),
    ...(filters.dateTo && { endDate: filters.dateTo }),
  };

  // Fetch data based on active tab
  const vouchersQuery = useVouchers(activeTab === 'vouchers' ? voucherQueryParams : {});
  const creditNotesQuery = useCreditNotes(activeTab === 'creditnotes' ? creditNoteQueryParams : {});

  // Use the appropriate query based on active tab
  const { data, isLoading, isError, error } = activeTab === 'vouchers' ? vouchersQuery : creditNotesQuery;

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      voucherNumber: '',
      partyName: '',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
    });
    setSortBy('date');
    setSortOrder('desc');
    setPage(1);
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="h-4 w-4" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  // Handle different data structures for vouchers and credit notes
  const items = activeTab === 'vouchers' 
    ? (data?.data || [])
    : (data?.data || []);
  
  const pagination = activeTab === 'vouchers'
    ? (data?.pagination || { total: 0, page: 1, pages: 1 })
    : {
        total: data?.total || 0,
        page,
        pages: Math.ceil((data?.total || 0) / 25)
      };

  // Reset to page 1 when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setExpanded(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 space-y-6">
        <div className="flex items-center justify-between animate-fadeIn">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Vouchers & Credit Notes</h1>
            <p className="text-gray-600 mt-1">Browse and manage all vouchers and credit notes in the system</p>
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-300" : "hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 animate-fadeIn">
          <Button
            variant={activeTab === 'vouchers' ? 'default' : 'ghost'}
            onClick={() => handleTabChange('vouchers')}
            className={activeTab === 'vouchers' 
              ? 'bg-blue-600 hover:bg-blue-700 text-white rounded-b-none border-b-2 border-blue-600' 
              : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-b-none'
            }
          >
            <FileText className="h-4 w-4 mr-2" />
            Sales Vouchers
          </Button>
          <Button
            variant={activeTab === 'creditnotes' ? 'default' : 'ghost'}
            onClick={() => handleTabChange('creditnotes')}
            className={activeTab === 'creditnotes' 
              ? 'bg-red-600 hover:bg-red-700 text-white rounded-b-none border-b-2 border-red-600' 
              : 'text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-b-none'
            }
          >
            <FileText className="h-4 w-4 mr-2" />
            Credit Notes
          </Button>
        </div>

      {showFilters && (
        <Card className="animate-slideInRight hover-lift bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Search className="h-4 w-4 text-blue-600" />
                </div>
                Filter {activeTab === 'vouchers' ? 'Vouchers' : 'Credit Notes'}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={clearFilters} className="hover:bg-red-50 hover:text-red-600 transition-colors">
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeTab === 'vouchers' && (
                <div className="space-y-2">
                  <Label htmlFor="voucherNumber">Voucher Number</Label>
                  <Input
                    id="voucherNumber"
                    placeholder="Search by number..."
                    value={filters.voucherNumber}
                    onChange={(e) => handleFilterChange('voucherNumber', e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="partyName">Party Name</Label>
                <Input
                  id="partyName"
                  placeholder="Search by party name..."
                  value={filters.partyName}
                  onChange={(e) => handleFilterChange('partyName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Date From</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Date To</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
              {activeTab === 'vouchers' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="minAmount">Min Amount</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      placeholder="0"
                      value={filters.minAmount}
                      onChange={(e) => handleFilterChange('minAmount', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="maxAmount">Max Amount</Label>
                    <Input
                      id="maxAmount"
                      type="number"
                      placeholder="100000"
                      value={filters.maxAmount}
                      onChange={(e) => handleFilterChange('maxAmount', e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <FileText className="h-5 w-5" />
              <p>{error?.message || 'Failed to load vouchers.'}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="hover-lift animate-fadeIn bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`p-2 rounded-lg ${activeTab === 'vouchers' ? 'bg-blue-50' : 'bg-red-50'}`}>
                  <FileText className={`h-5 w-5 ${activeTab === 'vouchers' ? 'text-blue-600' : 'text-red-600'}`} />
                </div>
                All {activeTab === 'vouchers' ? 'Vouchers' : 'Credit Notes'}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <Badge className={activeTab === 'vouchers' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}>{pagination.total}</Badge>
                total {activeTab === 'vouchers' ? 'vouchers' : 'credit notes'} • Page <Badge variant="outline">{pagination.page}</Badge> of <Badge variant="outline">{pagination.pages}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {activeTab === 'vouchers' ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('voucherNumber')} className="-ml-3">
                          Voucher # {getSortIcon('voucherNumber')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button variant="ghost" size="sm" onClick={() => handleSort('date')} className="-ml-3">
                          Date {getSortIcon('date')}
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleSort('totalAmount')} className="-mr-3">
                          Amount {getSortIcon('totalAmount')}
                        </Button>
                      </TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Employees</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.length > 0 ? (
                      items.map(row => (
                        <>
                          <TableRow key={row._id}>
                            <TableCell className="font-medium">{row.voucherNumber}</TableCell>
                            <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">{row.totalAmount?.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{row.currency || 'N/A'}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {row.employees?.slice(0, 2).map((e, idx) => (
                                  <Badge key={idx} variant="secondary">{e.name}</Badge>
                                ))}
                                {row.employees?.length > 2 && (
                                  <Badge variant="secondary">+{row.employees.length - 2}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpanded(expanded === row._id ? null : row._id)}
                                className="hover:bg-blue-100 hover:text-blue-700 transition-all duration-300"
                              >
                                {expanded === row._id ? (
                                  <>
                                    <ChevronUp className="h-4 w-4 mr-1" />
                                    Hide
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-4 w-4 mr-1" />
                                    Details
                                  </>
                                )}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expanded === row._id && (
                            <TableRow className="animate-fadeIn">
                              <TableCell colSpan={6} className="bg-blue-50 border-l-4 border-l-blue-500">
                                <VoucherDetails voucherId={row._id} employees={row.employees} voucher={row} onPartyClick={handlePartyClick} />
                              </TableCell>
                            </TableRow>
                          )}
                        </>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                          No vouchers found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('creditNoteNumber')} className="-ml-3">
                            Credit Note # {getSortIcon('creditNoteNumber')}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button variant="ghost" size="sm" onClick={() => handleSort('date')} className="-ml-3">
                            Date {getSortIcon('date')}
                          </Button>
                        </TableHead>
                        <TableHead>Party</TableHead>
                        <TableHead className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleSort('creditAmount')} className="-mr-3">
                            Credit Amount {getSortIcon('creditAmount')}
                          </Button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length > 0 ? (
                        items.map(row => (
                          <>
                            <TableRow key={row._id}>
                              <TableCell className="font-medium">{row.creditNoteNumber}</TableCell>
                              <TableCell>{new Date(row.date).toLocaleDateString()}</TableCell>
                              <TableCell>
                                <button
                                  onClick={() => row.party && handlePartyClick(row.party)}
                                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                >
                                  {row.party || 'N/A'}
                                </button>
                              </TableCell>
                              <TableCell className="text-right text-red-600 font-semibold">
                                ₹{row.creditAmount?.toLocaleString('en-IN')}
                              </TableCell>
                              <TableCell>
                                {row.isCancelled ? (
                                  <Badge variant="destructive">Cancelled</Badge>
                                ) : (
                                  <Badge className="bg-green-600">Active</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setExpanded(expanded === row._id ? null : row._id)}
                                  className="hover:bg-red-100 hover:text-red-700 transition-all duration-300"
                                >
                                  {expanded === row._id ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-1" />
                                      Hide
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-1" />
                                      Details
                                    </>
                                  )}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {expanded === row._id && (
                              <TableRow className="animate-fadeIn">
                                <TableCell colSpan={6} className="bg-red-50 border-l-4 border-l-red-500">
                                  <CreditNoteDetails creditNote={row} onPartyClick={handlePartyClick} />
                                </TableCell>
                              </TableRow>
                            )}
                          </>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                            No credit notes found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <Card className="animate-fadeIn animate-delay-200 bg-white">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 disabled:opacity-50"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-2">
                    <Badge className={activeTab === 'vouchers' ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}>Page {page}</Badge>
                    <span className="text-gray-600">of</span>
                    <Badge variant="outline">{pagination.pages}</Badge>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                    disabled={page === pagination.pages}
                    className="hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 disabled:opacity-50"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Party Transaction Modal */}
      <PartyTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        partyName={selectedParty}
      />
    </div>
    </div>
  );
}
