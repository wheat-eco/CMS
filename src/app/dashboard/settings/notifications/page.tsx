
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { updateUserProfile } from "@/lib/firebase/firestore";
import type { UserProfile } from "@/lib/types";

type NotificationPreferences = NonNullable<UserProfile['notificationPreferences']>;

export default function NotificationSettingsPage() {
    const { user, loading } = useAuthListener();
    const [isSaving, setIsSaving] = useState(false);
    
    const [preferences, setPreferences] = useState<NotificationPreferences>({
        ticketUpdates: true,
        newComments: true,
        userApprovals: false,
    });
    
    useEffect(() => {
        if (user?.profile?.notificationPreferences) {
            setPreferences(user.profile.notificationPreferences);
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        
        setIsSaving(true);
        
        toast.promise(
            updateUserProfile(user.uid, { notificationPreferences: preferences }),
            {
                loading: 'Saving preferences...',
                success: 'Your notification preferences have been updated.',
                error: 'Could not save your preferences.'
            }
        ).finally(() => {
            setIsSaving(false);
        });
    };
    
    const handleCheckedChange = (key: keyof NotificationPreferences, checked: boolean) => {
        setPreferences(prev => ({...prev, [key]: checked}));
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Manage how you receive notifications from the system.</CardDescription>
            </CardHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <CardContent className="space-y-6">
                    <div>
                        <h3 className="text-lg font-medium">Email Notifications</h3>
                        <p className="text-sm text-muted-foreground">
                            Choose which email notifications you want to receive.
                        </p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="ticket-updates" className="cursor-pointer">Ticket Updates</Label>
                            <span className="text-xs text-muted-foreground">
                                Receive an email when a ticket you reported is updated or resolved.
                            </span>
                        </div>
                        <Switch
                            id="ticket-updates"
                            checked={preferences.ticketUpdates}
                            onCheckedChange={(checked) => handleCheckedChange('ticketUpdates', checked)}
                            disabled={isSaving}
                        />
                    </div>
                    <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
                        <div className="flex flex-col space-y-1">
                            <Label htmlFor="new-comments" className="cursor-pointer">New Comments</Label>
                            <span className="text-xs text-muted-foreground">
                                Get notified when someone comments on one of your tickets.
                            </span>
                        </div>
                        <Switch
                            id="new-comments"
                            checked={preferences.newComments}
                            onCheckedChange={(checked) => handleCheckedChange('newComments', checked)}
                            disabled={isSaving}
                        />
                    </div>
                    {user?.profile?.role === 'admin' && (
                        <div className="flex items-center justify-between space-x-4 rounded-md border p-4">
                            <div className="flex flex-col space-y-1">
                                <Label htmlFor="user-approvals" className="cursor-pointer">New User Approvals</Label>
                                <span className="text-xs text-muted-foreground">
                                Receive an email when a new employee registers for your organization.
                                </span>
                            </div>
                            <Switch
                                id="user-approvals"
                                checked={preferences.userApprovals}
                                onCheckedChange={(checked) => handleCheckedChange('userApprovals', checked)}
                                disabled={isSaving}
                            />
                        </div>
                    )}
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
