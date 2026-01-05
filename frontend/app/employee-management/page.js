"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  useEmployees, 
  useDesignations, 
  useDesignationHierarchy,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  useCreateDesignation,
  useUpdateDesignation,
  useDeleteDesignation
} from '../../lib/api';
import { 
  Loader2, 
  Pencil, 
  Search, 
  CheckCircle, 
  XCircle, 
  Plus, 
  Trash2, 
  Briefcase, 
  Users, 
  Network,
  AlertCircle 
} from 'lucide-react';

export default function EmployeeManagementPage() {
  const [activeTab, setActiveTab] = useState('designations');

  return (
    <div className="py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
        <p className="text-muted-foreground">
          Comprehensive employee management system - designations, hierarchy, and employee details
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === 'designations' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('designations')}
          className="rounded-b-none"
        >
          <Briefcase className="h-4 w-4 mr-2" />
          Designations
        </Button>
        <Button
          variant={activeTab === 'employees' ? 'default' : 'ghost'}
          onClick={() => setActiveTab('employees')}
          className="rounded-b-none"
        >
          <Users className="h-4 w-4 mr-2" />
          Manage Employees
        </Button>
      </div>

      {/* Tab Content */}
      {activeTab === 'designations' ? (
        <DesignationsTab />
      ) : (
        <EmployeesTab />
      )}
    </div>
  );
}

// Designations Tab Component
function DesignationsTab() {
  const { data: designations, isLoading, isError, error } = useDesignations();
  const { data: hierarchy } = useDesignationHierarchy();
  const createDesignation = useCreateDesignation();
  const updateDesignation = useUpdateDesignation();
  const deleteDesignation = useDeleteDesignation();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDesignation, setSelectedDesignation] = useState(null);
  const [showHierarchy, setShowHierarchy] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    level: 0,
    reportsTo: 'none',
    isActive: true
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        reportsTo: formData.reportsTo && formData.reportsTo !== 'none' ? formData.reportsTo : null,
        level: parseInt(formData.level) || 0
      };
      await createDesignation.mutateAsync(payload);
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', level: 0, reportsTo: 'none', isActive: true });
    } catch (err) {
      console.error('Failed to create designation:', err);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedDesignation) return;
    try {
      const payload = {
        ...formData,
        reportsTo: formData.reportsTo && formData.reportsTo !== 'none' ? formData.reportsTo : null,
        level: parseInt(formData.level) || 0
      };
      await updateDesignation.mutateAsync({
        id: selectedDesignation._id,
        data: payload
      });
      setIsEditOpen(false);
      setSelectedDesignation(null);
      setFormData({ title: '', description: '', level: 0, reportsTo: 'none', isActive: true });
    } catch (err) {
      console.error('Failed to update designation:', err);
    }
  };

  const handleDelete = async () => {
    if (!selectedDesignation) return;
    try {
      await deleteDesignation.mutateAsync(selectedDesignation._id);
      setIsDeleteOpen(false);
      setSelectedDesignation(null);
    } catch (err) {
      console.error('Failed to delete designation:', err);
    }
  };

  const openEditDialog = (designation) => {
    setSelectedDesignation(designation);
    setFormData({
      title: designation.title || '',
      description: designation.description || '',
      level: designation.level || 0,
      reportsTo: designation.reportsTo?._id || 'none',
      isActive: designation.isActive !== undefined ? designation.isActive : true
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (designation) => {
    setSelectedDesignation(designation);
    setIsDeleteOpen(true);
  };

  const renderHierarchyNode = (node, depth = 0) => {
    return (
      <div key={node._id} className={`pl-${depth * 4}`}>
        <div className="flex items-center gap-2 py-2 border-l-2 border-muted pl-4 mb-2">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{node.title}</span>
          <Badge variant="outline">Level {node.level}</Badge>
        </div>
        {node.children && node.children.length > 0 && (
          <div className="ml-6 border-l border-muted">
            {node.children.map(child => renderHierarchyNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Designations & Hierarchy</h2>
          <p className="text-sm text-muted-foreground">
            Create designations first to establish organizational hierarchy
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={showHierarchy ? "default" : "outline"}
            onClick={() => setShowHierarchy(!showHierarchy)}
          >
            <Network className="h-4 w-4 mr-2" />
            {showHierarchy ? 'Show List' : 'Show Hierarchy'}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Designation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Designation</DialogTitle>
                <DialogDescription>
                  Add a new job title/designation to your organization
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Sales Manager"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Role description..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Level</Label>
                    <Input
                      id="level"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={formData.level}
                      onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">Higher numbers indicate senior positions</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reportsTo">Reports To (Designation)</Label>
                    <Select
                      value={formData.reportsTo}
                      onValueChange={(value) => setFormData({ ...formData, reportsTo: value === 'none' ? '' : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reporting designation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {designations?.map((d) => (
                          <SelectItem key={d._id} value={d._id}>
                            {d.title} (Level {d.level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Defines organizational hierarchy</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createDesignation.isLoading}>
                    {createDesignation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Create
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {showHierarchy ? (
        <Card>
          <CardHeader>
            <CardTitle>Organizational Hierarchy</CardTitle>
            <CardDescription>Visual representation of designation reporting structure</CardDescription>
          </CardHeader>
          <CardContent>
            {hierarchy && hierarchy.length > 0 ? (
              <div className="space-y-4">
                {hierarchy.map(node => renderHierarchyNode(node))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No hierarchy data available</p>
            )}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-destructive">
              <Briefcase className="h-5 w-5" />
              <p>{error?.message || 'Failed to load designations.'}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Designations</CardTitle>
            <CardDescription>
              {designations?.length || 0} designation{designations?.length !== 1 ? 's' : ''} configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Reports To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designations && designations.length > 0 ? (
                  designations.map((designation) => (
                    <TableRow key={designation._id}>
                      <TableCell className="font-medium">{designation.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">Level {designation.level}</Badge>
                      </TableCell>
                      <TableCell>
                        {designation.reportsTo ? (
                          <span className="text-sm">{designation.reportsTo.title}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={designation.isActive ? "default" : "secondary"}>
                          {designation.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(designation)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(designation)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No designations found. Create one to get started.
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
            <DialogTitle>Edit Designation</DialogTitle>
            <DialogDescription>Update designation information</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-level">Level</Label>
                <Input
                  id="edit-level"
                  type="number"
                  min="0"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reportsTo">Reports To</Label>
                <Select
                  value={formData.reportsTo}
                  onValueChange={(value) => setFormData({ ...formData, reportsTo: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None (Top Level)</SelectItem>
                    {designations
                      ?.filter(d => d._id !== selectedDesignation?._id)
                      .map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.title} (Level {d.level})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateDesignation.isLoading}>
                {updateDesignation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Designation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedDesignation?.title}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteDesignation.isLoading}
            >
              {deleteDesignation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Employees Tab Component (to be continued in next part due to length)
function EmployeesTab() {
  const { data: employees, isLoading: loadingEmployees } = useEmployees();
  const { data: designations } = useDesignations();
  const createEmployee = useCreateEmployee();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, former
  const [designationFilter, setDesignationFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    employeeCode: '',
    dateOfJoining: '',
    currentlyWorking: true,
    dateOfLeaving: '',
    workZones: '',
    designation: '',
    reportingTo: 'none'
  });

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!employees) return employees;
    
    let filtered = employees;
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(emp => 
        emp.name?.toLowerCase().includes(query) ||
        emp.employeeCode?.toLowerCase().includes(query) ||
        emp.designation?.title?.toLowerCase().includes(query)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        filtered = filtered.filter(emp => emp.currentlyWorking !== false);
      } else if (statusFilter === 'former') {
        filtered = filtered.filter(emp => emp.currentlyWorking === false);
      }
    }
    
    // Designation filter
    if (designationFilter !== 'all') {
      filtered = filtered.filter(emp => emp.designation?._id === designationFilter);
    }
    
    return filtered;
  }, [employees, searchQuery, statusFilter, designationFilter]);

  // Filter for active employees only for reporting dropdown
  const activeEmployees = useMemo(() => {
    return employees?.filter(emp => emp.currentlyWorking !== false) || [];
  }, [employees]);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // Check if designations exist
    if (!designations || designations.length === 0) {
      alert('Please create at least one designation first before adding employees.');
      return;
    }
    
    // Validate designation is selected
    if (!formData.designation) {
      alert('Please select a designation for the employee.');
      return;
    }
    
    try {
      const payload = {
        name: formData.name,
        employeeCode: formData.employeeCode || undefined,
        dateOfJoining: formData.dateOfJoining || null,
        currentlyWorking: formData.currentlyWorking,
        dateOfLeaving: formData.dateOfLeaving || null,
        workZones: formData.workZones ? formData.workZones.split(',').map(z => z.trim()).filter(Boolean) : [],
        designation: formData.designation,
        reportingTo: formData.reportingTo && formData.reportingTo !== 'none' ? formData.reportingTo : null
      };
      
      await createEmployee.mutateAsync(payload);
      setIsCreateOpen(false);
      setFormData({
        name: '',
        employeeCode: '',
        dateOfJoining: '',
        currentlyWorking: true,
        dateOfLeaving: '',
        workZones: '',
        designation: '',
        reportingTo: 'none'
      });
    } catch (err) {
      console.error('Failed to create employee:', err);
      alert('Failed to create employee: ' + (err.message || 'Unknown error'));
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedEmployee) return;
    
    // Validate designation is selected
    if (!formData.designation) {
      alert('Please select a designation for the employee.');
      return;
    }
    
    try {
      const payload = {
        name: formData.name,
        dateOfJoining: formData.dateOfJoining || null,
        currentlyWorking: formData.currentlyWorking,
        dateOfLeaving: formData.dateOfLeaving || null,
        workZones: formData.workZones ? formData.workZones.split(',').map(z => z.trim()).filter(Boolean) : [],
        designation: formData.designation,
        reportingTo: formData.reportingTo && formData.reportingTo !== 'none' ? formData.reportingTo : null
      };
      
      await updateEmployee.mutateAsync({
        id: selectedEmployee._id,
        data: payload
      });
      
      setIsEditOpen(false);
      setSelectedEmployee(null);
      setFormData({
        name: '',
        employeeCode: '',
        dateOfJoining: '',
        currentlyWorking: true,
        dateOfLeaving: '',
        workZones: '',
        designation: '',
        reportingTo: 'none'
      });
    } catch (err) {
      console.error('Failed to update employee:', err);
      alert('Failed to update employee: ' + (err.message || 'Unknown error'));
    }
  };

  const handleDelete = async () => {
    if (!selectedEmployee) return;
    try {
      await deleteEmployee.mutateAsync(selectedEmployee._id);
      setIsDeleteOpen(false);
      setSelectedEmployee(null);
    } catch (err) {
      console.error('Failed to delete employee:', err);
      alert('Failed to delete employee: ' + (err.message || 'Unknown error'));
    }
  };

  const openEditDialog = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      name: employee.name || '',
      employeeCode: employee.employeeCode || '',
      dateOfJoining: employee.dateOfJoining ? new Date(employee.dateOfJoining).toISOString().split('T')[0] : '',
      currentlyWorking: employee.currentlyWorking !== false,
      dateOfLeaving: employee.dateOfLeaving ? new Date(employee.dateOfLeaving).toISOString().split('T')[0] : '',
      workZones: employee.workZones ? employee.workZones.join(', ') : '',
      designation: employee.designation?._id || '',
      reportingTo: employee.reportingTo?._id || 'none'
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (employee) => {
    setSelectedEmployee(employee);
    setIsDeleteOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Check if designations exist
  const noDesignations = !designations || designations.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Employee Management</h2>
          <p className="text-sm text-muted-foreground">
            Add and manage employee details, assignments, and reporting structure
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button disabled={noDesignations}>
              <Plus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Employee</DialogTitle>
              <DialogDescription>
                Add a new employee with designation and reporting manager
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate}>
              <div className="space-y-4 py-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Employee name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employeeCode">Employee Code</Label>
                    <Input
                      id="employeeCode"
                      placeholder="Auto-generated if empty"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                    />
                  </div>
                </div>

                {/* Designation - REQUIRED */}
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                  <Label htmlFor="designation" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Designation * (Following Hierarchy)
                  </Label>
                  <Select
                    value={formData.designation}
                    onValueChange={(value) => setFormData({ ...formData, designation: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select designation" />
                    </SelectTrigger>
                    <SelectContent>
                      {designations?.map((d) => (
                        <SelectItem key={d._id} value={d._id}>
                          {d.title} (Level {d.level})
                          {d.reportsTo && ` → Reports to ${d.reportsTo.title}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select designation to follow organizational hierarchy
                  </p>
                </div>

                {/* Reporting Manager */}
                <div className="space-y-2 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border-2 border-amber-200 dark:border-amber-800">
                  <Label htmlFor="reportingTo" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Reporting Manager (Optional)
                  </Label>
                  <Select
                    value={formData.reportingTo}
                    onValueChange={(value) => setFormData({ ...formData, reportingTo: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select reporting manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (Top Level)</SelectItem>
                      {activeEmployees.length > 0 && activeEmployees.map((e) => (
                        <SelectItem key={e._id} value={e._id}>
                          {e.name} ({e.employeeCode})
                          {e.designation && ` - ${e.designation.title}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the person this employee will report to (optional for top-level employees)
                  </p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateOfJoining">Date of Joining</Label>
                    <Input
                      id="dateOfJoining"
                      type="date"
                      value={formData.dateOfJoining}
                      onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfLeaving">Date of Leaving</Label>
                    <Input
                      id="dateOfLeaving"
                      type="date"
                      value={formData.dateOfLeaving}
                      onChange={(e) => setFormData({ ...formData, dateOfLeaving: e.target.value })}
                      disabled={formData.currentlyWorking}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
                  <input
                    type="checkbox"
                    id="currentlyWorking"
                    checked={formData.currentlyWorking}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      currentlyWorking: e.target.checked,
                      dateOfLeaving: e.target.checked ? '' : formData.dateOfLeaving
                    })}
                    className="h-4 w-4"
                  />
                  <Label htmlFor="currentlyWorking" className="cursor-pointer">
                    Currently Working
                  </Label>
                </div>

                {/* Work Zones */}
                <div className="space-y-2">
                  <Label htmlFor="workZones">Work Zones / Locations</Label>
                  <Input
                    id="workZones"
                    placeholder="e.g., North Delhi, Gurgaon, Noida (comma-separated)"
                    value={formData.workZones}
                    onChange={(e) => setFormData({ ...formData, workZones: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter work locations/zones separated by commas
                  </p>
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
      </div>

      {/* No Designations Warning */}
      {noDesignations && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-100">
                  No Designations Found
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
                  Please create at least one designation in the Designations tab before adding employees. 
                  Designations are required to establish organizational hierarchy.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Statistics */}
      {!noDesignations && employees && employees.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.currentlyWorking !== false).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Former Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {employees.filter(e => e.currentlyWorking === false).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Designations Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {new Set(employees.map(e => e.designation?._id).filter(Boolean)).size}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="former">Former Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Designation</Label>
                <Select value={designationFilter} onValueChange={setDesignationFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Designations</SelectItem>
                    {designations?.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingEmployees ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Employees</CardTitle>
            <CardDescription>
              {filteredEmployees?.length || 0} employee{filteredEmployees?.length !== 1 ? 's' : ''}
              {searchQuery && ` found matching "${searchQuery}"`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Reports To</TableHead>
                    <TableHead>Work Zones</TableHead>
                    <TableHead>Joining Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees && filteredEmployees.length > 0 ? (
                    filteredEmployees.map((employee) => (
                      <TableRow key={employee._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{employee.name}</p>
                            <p className="text-xs text-muted-foreground">{employee.employeeCode}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {employee.designation ? (
                            <Badge variant="outline">{employee.designation.title}</Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.reportingTo ? (
                            <div className="text-sm">
                              <p>{employee.reportingTo.name}</p>
                              <p className="text-xs text-muted-foreground">{employee.reportingTo.employeeCode}</p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {employee.workZones && employee.workZones.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {employee.workZones.slice(0, 2).map((zone, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {zone}
                                </Badge>
                              ))}
                              {employee.workZones.length > 2 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{employee.workZones.length - 2}
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(employee.dateOfJoining)}
                        </TableCell>
                        <TableCell>
                          {employee.currentlyWorking !== false ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <XCircle className="h-3 w-3 mr-1" />
                              Left
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(employee)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openDeleteDialog(employee)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {noDesignations 
                          ? 'Create designations first, then add employees'
                          : 'No employees found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Employee Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee management details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit}>
            <div className="space-y-4 py-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
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
                    disabled
                  />
                </div>
              </div>

              {/* Designation */}
              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Select
                  value={formData.designation}
                  onValueChange={(value) => setFormData({ ...formData, designation: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    {designations?.map((d) => (
                      <SelectItem key={d._id} value={d._id}>
                        {d.title} (Level {d.level})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reporting To */}
              <div className="space-y-2">
                <Label htmlFor="edit-reportingTo">Reports To</Label>
                <Select
                  value={formData.reportingTo}
                  onValueChange={(value) => setFormData({ ...formData, reportingTo: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {activeEmployees
                      ?.filter(e => e._id !== selectedEmployee?._id)
                      .map((e) => (
                        <SelectItem key={e._id} value={e._id}>
                          {e.name} ({e.employeeCode})
                          {e.designation && ` - ${e.designation.title}`}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-dateOfJoining">Date of Joining</Label>
                  <Input
                    id="edit-dateOfJoining"
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-dateOfLeaving">Date of Leaving</Label>
                  <Input
                    id="edit-dateOfLeaving"
                    type="date"
                    value={formData.dateOfLeaving}
                    onChange={(e) => setFormData({ ...formData, dateOfLeaving: e.target.value })}
                    disabled={formData.currentlyWorking}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 p-4 bg-muted/30 rounded-lg">
                <input
                  type="checkbox"
                  id="edit-currentlyWorking"
                  checked={formData.currentlyWorking}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    currentlyWorking: e.target.checked,
                    dateOfLeaving: e.target.checked ? '' : formData.dateOfLeaving
                  })}
                  className="h-4 w-4"
                />
                <Label htmlFor="edit-currentlyWorking" className="cursor-pointer">
                  Currently Working
                </Label>
              </div>

              {/* Work Zones */}
              <div className="space-y-2">
                <Label htmlFor="edit-workZones">Work Zones</Label>
                <Input
                  id="edit-workZones"
                  placeholder="e.g., North Delhi, Gurgaon, Noida (comma-separated)"
                  value={formData.workZones}
                  onChange={(e) => setFormData({ ...formData, workZones: e.target.value })}
                />
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

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{selectedEmployee?.name}&rdquo;? This action cannot be undone.
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
