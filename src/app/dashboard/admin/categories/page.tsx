
'use client';

import React, { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { subscribeToCategories, addCategory, updateCategory, deleteCategory } from '@/lib/firebase/categories';
import type { Category } from '@/lib/types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';


export default function ManageCategoriesPage() {
    const { user, loading: userLoading } = useAuthListener();

    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    const [categoryName, setCategoryName] = useState('');
    const [categoryDescription, setCategoryDescription] = useState('');


    useEffect(() => {
        if (!user?.profile?.orgId) {
            if (!userLoading) setLoading(false);
            return;
        }

        setLoading(true);
        const unsubCategories = subscribeToCategories(user.profile.orgId, (cats) => {
            setCategories(cats);
            setLoading(false);
        });
        
        return () => {
            unsubCategories();
        };
    }, [user, userLoading]);


    const openFormDialog = (cat: Category | null = null) => {
        setEditingCategory(cat);
        setCategoryName(cat?.name || '');
        setCategoryDescription(cat?.description || '');
        setIsFormDialogOpen(true);
    };

    const openDeleteDialog = (cat: Category) => {
        setCategoryToDelete(cat);
        setIsDeleteDialogOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.profile?.orgId || !categoryName) return;

        setIsSubmitting(true);
        
        const categoryData = {
            name: categoryName,
            description: categoryDescription,
        };
        
        const promise = editingCategory
            ? updateCategory(user.profile.orgId, editingCategory.id, categoryData)
            : addCategory(user.profile.orgId, categoryData);

        toast.promise(promise, {
            loading: 'Saving category...',
            success: () => {
                setIsFormDialogOpen(false);
                return `Category ${editingCategory ? 'updated' : 'created'} successfully!`;
            },
            error: 'Could not save the category.',
        }).finally(() => {
             setIsSubmitting(false);
        });
    };

    const handleDeleteConfirm = async () => {
        if (!user?.profile?.orgId || !categoryToDelete) return;
        
        setIsSubmitting(true);

        toast.promise(deleteCategory(user.profile.orgId, categoryToDelete.id), {
            loading: 'Deleting category...',
            success: () => {
                setIsDeleteDialogOpen(false);
                setCategoryToDelete(null);
                return 'Category deleted successfully.';
            },
            error: 'Could not delete the category.',
        }).finally(() => {
            setIsSubmitting(false);
        });
    };

    const isLoading = loading || userLoading;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Manage Categories</h1>
                    <p className="text-muted-foreground">Define categories to help classify tickets.</p>
                </div>
                <Button onClick={() => openFormDialog()}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Category
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Category List</CardTitle>
                    <CardDescription>All available ticket categories in your organization.</CardDescription>
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
                                <TableHead>Category Name</TableHead>
                                <TableHead className="hidden md:table-cell">Description</TableHead>
                                <TableHead><span className="sr-only">Actions</span></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length > 0 ? categories.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell className="hidden md:table-cell">{cat.description}</TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => openFormDialog(cat)}>Edit</DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem className="text-destructive" onClick={() => openDeleteDialog(cat)}>Delete</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No categories found. Add one to get started.
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
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
                        <DialogDescription>
                           {editingCategory ? 'Update the details for this category.' : 'Create a new category for classifying tickets.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                                <Label htmlFor="name" className="sm:text-right">Name</Label>
                                <Input id="name" placeholder="e.g., IT Support" className="sm:col-span-3" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} required />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 items-center gap-x-4 gap-y-2">
                                <Label htmlFor="description" className="sm:text-right">Description</Label>
                                <Textarea id="description" placeholder="Issues related to hardware, software..." className="sm:col-span-3" value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} />
                            </div>
                        </div>
                        <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setIsFormDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingCategory ? 'Save Changes' : 'Create Category'}
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
                            This action cannot be undone. This will permanently delete the "{categoryToDelete?.name}" category.
                            Any tickets using this category will need to be manually updated.
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
