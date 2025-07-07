
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, PlusCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { subscribeToOrganizationUsers } from '@/lib/firebase/firestore';
import { subscribeToDepartments, addDepartment, updateDepartment, deleteDepartment } from '@/lib/firebase/departments';
import type { UserProfile, Department } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';


export default function ManageDepartmentsPage() {
    const { user, loading: userLoading } = useAuthListener();

    const [departments, setDepartments] = useState<Department[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
    const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

    const [departmentName, setDepartmentName] = useState('');
    const [supervisorId, setSupervisorId] = useState('');


    useEffect(() => {
        if (!user?.profile?.orgId) {
            if (!userLoading) setLoading(false);
            return;
        }

        setLoading(true);
        const unsubDepartments = subscribeToDepartments(user.profile.orgId, setDepartments);
        const unsubUsers = subscribeToOrganizationUsers(user.profile.orgId, (users) => {
            setUsers(users);
            setLoading(false);
        });

        return () => {
            unsubDepartments();
            unsubUsers();
        };
    }, [user, userLoading]);

    const supervisors = useMemo(() => {
        return users.filter(u => u.role === 'admin' || u.role === 'supervisor');
    }, [users]);

    const departmentsWithData = useMemo(() => {
        const memberCounts = users.reduce((acc, user) => {
            if (user.department) {
                acc[user.department] = (acc[user.department] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return departments.map(dept => ({
            ...dept,
            members: memberCounts[dept.name] || 0,
            supervisor: supervisors.find(s => s.uid === dept.supervisorId)?.name || 'Not Assigned',
        }));
    }, [departments, users, supervisors]);

    const openFormDialog = (dept: Department | null = null) => {
        setEditingDepartment(dept);
        setDepartmentName(dept?.name || '');
        setSupervisorId(dept?.supervisorId || 'none');
        setIsFormDialogOpen(true);
    };

    const openDeleteDialog = (dept: Department) => {
        setDepartmentToDelete(dept);
        setIsDeleteDialogOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.profile?.orgId || !departmentName) return;

        setIsSubmitting(true);
        const supervisor = supervisors.find(s => s.uid === supervisorId);

        const departmentData = {
            name: departmentName,
            supervisorId: supervisor?.uid || '',
            supervisorName: supervisor?.name || '',
        };
        
        const promise = editingDepartment
            ? updateDepartment(user.profile.orgId, editingDepartment.id, departmentData)
            : addDepartment(user.profile.orgId, departmentData);

        toast.promise(promise, {
            loading: 'Saving department...',
            success: () => {
                setIsFormDialogOpen(false);
                return `Department ${editingDepartment ? 'updated' : 'created'} successfully!`;
            },
            error: 'Could not save the department.',
        }).finally(() => {
             setIsSubmitting(false);
        });
    };

    const handleDeleteConfirm = async () => {
        if (!user?.profile?.orgId || !departmentToDelete) return;
        
        setIsSubmitting(true);
        
        toast.promise(deleteDepartment(user.profile.orgId, departmentToDelete.id), {
            loading: 'Deleting department...',
            success: () => {
                setIsDeleteDialogOpen(false);
                setDepartmentToDelete(null);
                return 'Department deleted successfully.';
            },
            error: 'Could not delete the department.',
        }).finally(() => {
            setIsSubmitting(false);
        });
    };

    const isLoading = loading || userLoading;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Departments</h1>
                    <p className="text-muted-foreground">Add, edit, and organize your company's departments.</p>
                </div>
                <Button onClick={() => openFormDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Department
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Department List</CardTitle>
                    <CardDescription>All active departments in your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Department Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Supervisor</TableHead>
                                <TableHead className="hidden sm:table-cell">Members</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {departmentsWithData.length > 0 ? departmentsWithData.map((dept) => (
                                <TableRow key={dept.id}>
                                    <TableCell className="font-medium">{dept.name}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{dept.supervisor}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{dept.members}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openFormDialog(dept)}>Edit</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(dept)}>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No departments found. Add one to get started.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
                        <DialogDescription>
                           {editingDepartment ? 'Update the details for this department.' : 'Set up a new department and assign a supervisor.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                                <Label htmlFor="name" className="sm:text-right">Name</Label>
                                <Input id="name" placeholder="e.g., Marketing" className="sm:col-span-3" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                                <Label htmlFor="supervisor" className="sm:text-right">Supervisor</Label>
                                 <Select value={supervisorId} onValueChange={setSupervisorId}>
                                    <SelectTrigger className="sm:col-span-3">
                                      <SelectValue placeholder="Assign a supervisor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Supervisor</SelectItem>
                                        {supervisors.map(s => (
                                            <SelectItem key={s.uid} value={s.uid}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                            </div>
                        </div>
                        <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setIsFormDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingDepartment ? 'Save Changes' : 'Create Department'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the "{departmentToDelete?.name}" department.
                            Any users in this department will need to be manually reassigned.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
                           {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
