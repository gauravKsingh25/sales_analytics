"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  Plus, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2,
  Trash2,
  Users,
  MapPin
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api';

export default function TargetsPage() {
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Fetch employees for dropdown
  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/employees`);
      if (!res.ok) throw new Error('Failed to fetch employees');
      return res.json();
    }
  });

  // Fetch current month targets
  const { data: currentTargets, isLoading, isError, error } = useQuery({
    queryKey: ['current-targets'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/targets/current`);
      if (!res.ok) {
        // If 404 or 500, return empty array instead of throwing
        if (res.status === 404 || res.status === 500) {
          return [];
        }
        throw new Error('Failed to fetch targets');
      }
      return res.json();
    },
    retry: 1,
    staleTime: 30000, // Cache for 30 seconds
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Create target mutation
  const createTarget = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`${API_BASE}/targets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!res.ok) throw new Error('Failed to create target');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['current-targets']);
      setIsCreateOpen(false);
    }
  });

  // Delete target mutation
  const deleteTarget = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`${API_BASE}/targets/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete target');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['current-targets']);
    }
  });

  const [formData, setFormData] = useState({
    type: 'employee',
    employeeId: '',
    region: '',
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    targetAmount: '',
    targetVouchers: ''
  });

  const handleCreate = () => {
    const data = {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      targetVouchers: formData.targetVouchers ? parseInt(formData.targetVouchers) : undefined,
      month: parseInt(formData.month),
      year: parseInt(formData.year)
    };

    if (formData.type === 'employee' && !formData.employeeId) {
      alert('Please select an employee');
      return;
    }
    if (formData.type === 'region' && !formData.region) {
      alert('Please enter a region');
      return;
    }

    createTarget.mutate(data);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getStatusBadge = (status) => {
    const variants = {
      'achieved': 'default',
      'on-track': 'secondary',
      'at-risk': 'outline',
      'off-track': 'destructive'
    };
    return variants[status] || 'secondary';
  };

  const getStatusIcon = (status) => {
    if (status === 'achieved') return <CheckCircle2 className="h-4 w-4" />;
    if (status === 'off-track' || status === 'at-risk') return <AlertTriangle className="h-4 w-4" />;
    return <TrendingUp className="h-4 w-4" />;
  };

  const offTrackTargets = currentTargets?.filter(t => t.isOffTrack) || [];
  const onTrackTargets = currentTargets?.filter(t => !t.isOffTrack) || [];

  return (
    <div className="py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Targets</h1>
          <p className="text-muted-foreground">Set and track monthly sales targets for employees and regions</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Target
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Target</DialogTitle>
              <DialogDescription>Set a monthly sales target for an employee or region</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Target Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="region">Region</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'employee' && (
                <div>
                  <Label>Employee</Label>
                  <Select
                    value={formData.employeeId}
                    onValueChange={(value) => setFormData({ ...formData, employeeId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp) => (
                        <SelectItem key={emp._id} value={emp._id}>
                          {emp.name} ({emp.employeeCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {formData.type === 'region' && (
                <div>
                  <Label>Region</Label>
                  <Input
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    placeholder="e.g., North, South, Maharashtra"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Month</Label>
                  <Select
                    value={formData.month.toString()}
                    onValueChange={(value) => setFormData({ ...formData, month: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(0, m - 1).toLocaleString('default', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Year</Label>
                  <Select
                    value={formData.year.toString()}
                    onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Target Amount (₹)</Label>
                <Input
                  type="number"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  placeholder="1000000"
                />
              </div>

              <div>
                <Label>Target Vouchers (Optional)</Label>
                <Input
                  type="number"
                  value={formData.targetVouchers}
                  onChange={(e) => setFormData({ ...formData, targetVouchers: e.target.value })}
                  placeholder="50"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleCreate}
                  disabled={createTarget.isPending}
                  className="flex-1"
                >
                  {createTarget.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Target
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Targets</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentTargets?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Active this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Track</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{onTrackTargets.length}</div>
            <p className="text-xs text-muted-foreground">Meeting expectations</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{offTrackTargets.length}</div>
            <p className="text-xs text-muted-foreground">Behind schedule</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Target</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(currentTargets?.reduce((sum, t) => sum + t.targetAmount, 0) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Combined targets</p>
          </CardContent>
        </Card>
      </div>

      {/* Targets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Month Targets</CardTitle>
          <CardDescription>
            {new Date(0, new Date().getMonth()).toLocaleString('default', { month: 'long' })} {new Date().getFullYear()} - Real-time progress tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading targets...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="h-12 w-12 text-orange-500" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">Could not load targets</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error?.message || 'An error occurred while fetching targets'}
                  </p>
                  <Button onClick={() => queryClient.invalidateQueries(['current-targets'])}>
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          ) : !currentTargets || currentTargets.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Target className="h-16 w-16 text-muted-foreground/50" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">No Targets Set</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    No targets have been set for {new Date(0, new Date().getMonth()).toLocaleString('default', { month: 'long' })} {new Date().getFullYear()}
                  </p>
                  <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Target
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Target Amount</TableHead>
                  <TableHead className="text-right">Achieved</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentTargets.map((target) => (
                  <TableRow key={target._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {target.type === 'employee' ? (
                          <Users className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                        )}
                        {target.employeeId?.name || target.region}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{target.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(target.targetAmount)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      {formatCurrency(target.achievedAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              parseFloat(target.progressPercentage) >= 100
                                ? 'bg-green-500'
                                : parseFloat(target.progressPercentage) >= 75
                                ? 'bg-blue-500'
                                : parseFloat(target.progressPercentage) >= 50
                                ? 'bg-yellow-500'
                                : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(parseFloat(target.progressPercentage), 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{target.progressPercentage}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={getStatusBadge(target.status)} className="flex items-center gap-1 w-fit mx-auto">
                        {getStatusIcon(target.status)}
                        {target.status.replace('-', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTarget.mutate(target._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
