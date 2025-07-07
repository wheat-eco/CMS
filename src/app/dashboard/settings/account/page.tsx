'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { updateUserPassword, deleteCurrentUser, reauthenticate } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

export default function AccountSettingsPage() {
    const router = useRouter();
    const [isUpdating, setIsUpdating] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [reauthPassword, setReauthPassword] = useState('');

    const handleChangePassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("New passwords do not match.");
            return;
        }
        if (!currentPassword) {
             toast.error("Please enter your current password.");
            return;
        }

        setIsUpdating(true);
        const toastId = toast.loading('Updating password...');

        try {
            await reauthenticate(currentPassword);
            await updateUserPassword(newPassword);
            toast.success("Your password has been updated.", { id: toastId });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            toast.error(error.message, { id: toastId });
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        const toastId = toast.loading('Deleting account...');
        try {
            await reauthenticate(reauthPassword);
            await deleteCurrentUser();
            toast.success("Your account has been permanently deleted.", { id: toastId });
            router.push('/');
        } catch (error: any) {
             toast.error(error.message, { id: toastId });
             console.error(error);
             setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <form onSubmit={handleChangePassword}>
                    <CardHeader>
                        <CardTitle>Change Password</CardTitle>
                        <CardDescription>Update your password here. Please choose a strong password.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">Current Password</Label>
                            <Input id="current-password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} disabled={isUpdating} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isUpdating} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                            <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isUpdating} required />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isUpdating}>
                            {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Update Password
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card className="border-destructive">
                <CardHeader>
                    <CardTitle>Delete Account</CardTitle>
                    <CardDescription>Permanently delete your account and all of your content. This action is not reversible.</CardDescription>
                </CardHeader>
                <CardFooter>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">Delete My Account</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your account and remove your data from our servers. To confirm, please enter your password.
                                </AlertDialogDescription>
                                <div className="pt-2">
                                    <Label htmlFor="reauth-password" className="sr-only">Password</Label>
                                    <Input id="reauth-password" type="password" value={reauthPassword} onChange={(e) => setReauthPassword(e.target.value)} placeholder="Enter your password" />
                                </div>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteAccount} disabled={!reauthPassword || isDeleting} className="bg-destructive hover:bg-destructive/90">
                                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Delete Account
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardFooter>
            </Card>
        </div>
    )
}
