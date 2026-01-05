"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useEmployees, useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from '../../lib/api';
import { Loader2, Users as UsersIcon, Eye, Search, Settings, Plus, Pencil, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EmployeesPage() {
  const router = useRouter();
  const { data, isLoading, isError, error } = useEmployees();
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({ name: '', employeeCode: '' });
  
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createEmployee.mutateAsync(formData);
      setIsCreateOpen(false);
      setFormData({ name: '', employeeCode: '' });
    } catch (error) {
      console.error('Failed to create employee:', error);
    }
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setFormData({ name: employee.name, employeeCode: employee.employeeCode });
    setIsEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    try {
      await updateEmployee.mutateAsync({ id: selectedEmployee._id, data: formData });
      setIsEditOpen(false);
      setFormData({ name: '', employeeCode: '' });
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Failed to update employee:', error);
    }
  };

  const openDeleteDialog = (employee) => {
    setSelectedEmployee(employee);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    try {
      await deleteEmployee.mutateAsync(selectedEmployee._id);
      setIsDeleteOpen(false);
      setSelectedEmployee(null);
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  // Filter employees based on search query
  const filteredEmployees = useMemo(() => {
    if (!data) return data;
    if (!searchQuery.trim()) return data;
    
    const query = searchQuery.toLowerCase().trim();
    return data.filter(emp => 
      emp.name?.toLowerCase().includes(query) ||
      emp.employeeCode?.toLowerCase().includes(query) ||
      emp.designation?.title?.toLowerCase().includes(query)
    );
  }, [data, searchQuery]);

  return (
    <div className="py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Browse employee directory and view details</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Employee</DialogTitle>
                <DialogDescription>
                  Add a new employee to the system. Employee code will be auto-generated if not provided.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeCode">Employee Code (Optional)</Label>
                    <Input
                      id="employeeCode"
                      placeholder="EMP001 (auto-generated if empty)"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createEmployee.isLoading}>
                    {createEmployee.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create Employee
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Link href="/employee-management">
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Manage Employees
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search employees by name or employee code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

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
              <UsersIcon className="h-5 w-5" />
              <p>{error?.message || 'Failed to load employees.'}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Employee Directory</CardTitle>
            <CardDescription>
              {filteredEmployees?.length || 0} employee{filteredEmployees?.length !== 1 ? 's' : ''} 
              {searchQuery && ` found matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Normalized Name</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees && filteredEmployees.length > 0 ? (
                  filteredEmployees.map((row) => (
                    <TableRow key={row._id || row.employeeCode}>
                      <TableCell>
                        <Badge variant="outline">{row.employeeCode}</Badge>
                      </TableCell>
                      <TableCell 
                        className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
                        onClick={() => router.push(`/employees/${row._id}`)}
                      >
                        {row.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.normalized}</TableCell>
                      <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/employees/${row._id}`)}
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(row)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(row)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-employeeCode">Employee Code</Label>
                <Input
                  id="edit-employeeCode"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                  disabled
                />
                <p className="text-xs text-muted-foreground">Employee code cannot be changed</p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateEmployee.isLoading}>
                {updateEmployee.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteEmployee.isLoading}
            >
              {deleteEmployee.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
