
'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { subscribeToOrganizationUsers, updateUserProfile } from '@/lib/firebase/firestore';
import { subscribeToDepartments } from '@/lib/firebase/departments';
import { createNotification } from '@/lib/firebase/notifications';
import type { UserProfile, Department } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function ManageUsersPage() {
    const { user: adminUser, loading: userLoading } = useAuthListener();
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [userRole, setUserRole] = useState<UserProfile['role'] | ''>('');
    const [userDepartment, setUserDepartment] = useState('');

    useEffect(() => {
        if (!adminUser?.profile?.orgId) {
            if (!userLoading) setLoading(false);
            return;
        }

        setLoading(true);
        const unsubUsers = subscribeToOrganizationUsers(adminUser.profile.orgId, (users) => {
            setAllUsers(users);
            if (!departments.length) { 
                setLoading(false);
            }
        });
        const unsubDepts = subscribeToDepartments(adminUser.profile.orgId, (depts) => {
            setDepartments(depts);
            setLoading(false);
        });

        return () => {
            unsubUsers();
            unsubDepts();
        };
    }, [adminUser, userLoading, departments.length]);
    
    const filteredUsers = useMemo(() => {
        return allUsers.filter(user => {
            const term = searchTerm.toLowerCase();
            return user.name.toLowerCase().includes(term) ||
                   user.email.toLowerCase().includes(term);
        });
    }, [allUsers, searchTerm]);

    const openEditDialog = (user: UserProfile) => {
        setEditingUser(user);
        setUserRole(user.role);
        setUserDepartment(user.department || '');
        setIsEditDialogOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser || !userRole || !userDepartment || !adminUser?.profile?.orgId) return;

        setIsSubmitting(true);
        const originalUser = allUsers.find(u => u.uid === editingUser.uid);
        
        const promise = updateUserProfile(editingUser.uid, {
            role: userRole,
            department: userDepartment,
        }).then(() => {
            const roleChanged = originalUser?.role !== userRole;
            const deptChanged = originalUser?.department !== userDepartment;

            if (roleChanged || deptChanged) {
                return createNotification(editingUser.uid, adminUser!.profile!.orgId, {
                    notificationType: 'userProfileUpdated',
                    userName: editingUser.name,
                    orgName: adminUser!.profile!.orgId,
                });
            }
        });

        toast.promise(promise, {
            loading: 'Updating user profile...',
            success: () => {
                setIsEditDialogOpen(false);
                setEditingUser(null);
                return `${editingUser.name}'s profile has been updated.`;
            },
            error: 'Could not update user profile.',
        }).finally(() => {
            setIsSubmitting(false);
        });
    };

    const handleChangeStatus = async (user: UserProfile, status: UserProfile['status']) => {
        if (user.uid === adminUser?.uid) {
            toast.error("You cannot change your own status.");
            return;
        }
        
        toast.promise(updateUserProfile(user.uid, { status }), {
            loading: 'Updating status...',
            success: `${user.name}'s status is now ${status}.`,
            error: 'Could not update user status.'
        });
    };
    
    const isLoading = loading || userLoading;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
                    <p className="text-muted-foreground">Add, edit, and manage user accounts.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>User List</CardTitle>
                    <CardDescription>A list of all users in your organization.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search users by name or email..." 
                                className="pl-8" 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                     {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead className="hidden sm:table-cell">Department</TableHead>
                                <TableHead className="hidden md:table-cell">Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                                <TableRow key={user.uid}>
                                    <TableCell>
                                        <div className="font-medium">{user.name}</div>
                                        <div className="text-sm text-muted-foreground">{user.email}</div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{user.department || 'N/A'}</TableCell>
                                    <TableCell className="hidden md:table-cell capitalize">{user.role}</TableCell>
                                    <TableCell>
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            user.status === 'active' && 'status-active',
                                            user.status === 'pending' && 'status-pending',
                                            user.status === 'inactive' && 'status-inactive',
                                          )}
                                        >
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={user.uid === adminUser?.uid}>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openEditDialog(user)}>Edit</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {user.status !== 'active' && <DropdownMenuItem onClick={() => handleChangeStatus(user, 'active')}>Activate</DropdownMenuItem>}
                                                {user.status !== 'inactive' && <DropdownMenuItem onClick={() => handleChangeStatus(user, 'inactive')}>Deactivate</DropdownMenuItem>}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Edit User: {editingUser?.name}</DialogTitle>
                        <DialogDescription>
                            Update the user's role and department.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateUser}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                                <Label htmlFor="department" className="sm:text-right">Department</Label>
                                 <Select required value={userDepartment} onValueChange={setUserDepartment}>
                                    <SelectTrigger className="sm:col-span-3">
                                      <SelectValue placeholder="Select a department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                  </Select>
                            </div>
                             <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                                <Label htmlFor="role" className="sm:text-right">Role</Label>
                                 <Select required value={userRole} onValueChange={(val: UserProfile['role']) => setUserRole(val)}>
                                    <SelectTrigger className="sm:col-span-3">
                                      <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="employee">Employee</SelectItem>
                                      <SelectItem value="supervisor">Supervisor</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
