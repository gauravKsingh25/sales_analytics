"use client";

import { useState } from 'react';
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
  useDesignations, 
  useDesignationHierarchy,
  useCreateDesignation, 
  useUpdateDesignation, 
  useDeleteDesignation 
} from '../../lib/api';
import { Loader2, Briefcase, Plus, Pencil, Trash2, Network } from 'lucide-react';

export default function DesignationsPage() {
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
    reportsTo: '',
    isActive: true
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        reportsTo: formData.reportsTo || null,
        level: parseInt(formData.level) || 0
      };
      await createDesignation.mutateAsync(payload);
      setIsCreateOpen(false);
      setFormData({ title: '', description: '', level: 0, reportsTo: '', isActive: true });
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
        reportsTo: formData.reportsTo || null,
        level: parseInt(formData.level) || 0
      };
      await updateDesignation.mutateAsync({
        id: selectedDesignation._id,
        data: payload
      });
      setIsEditOpen(false);
      setSelectedDesignation(null);
      setFormData({ title: '', description: '', level: 0, reportsTo: '', isActive: true });
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
      reportsTo: designation.reportsTo?._id || '',
      isActive: designation.isActive !== undefined ? designation.isActive : true
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (designation) => {
    setSelectedDesignation(designation);
    setIsDeleteOpen(true);
  };

  // Render hierarchy tree recursively
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
    <div className="py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Designations</h1>
          <p className="text-muted-foreground">Manage job titles and organizational hierarchy</p>
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
                    <Label htmlFor="reportsTo">Reports To</Label>
                    <Select
                      value={formData.reportsTo}
                      onValueChange={(value) => setFormData({ ...formData, reportsTo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reporting designation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None (Top Level)</SelectItem>
                        {designations?.map((d) => (
                          <SelectItem key={d._id} value={d._id}>
                            {d.title} (Level {d.level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
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
                  onValueChange={(value) => setFormData({ ...formData, reportsTo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reporting designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Top Level)</SelectItem>
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
