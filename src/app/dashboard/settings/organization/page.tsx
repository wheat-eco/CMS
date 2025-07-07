'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import toast from "react-hot-toast";
import { Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { getOrganizationById, updateOrganization } from "@/lib/firebase/organizations";

export default function OrganizationSettingsPage() {
    const { user, loading: userLoading } = useAuthListener();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        if (user?.profile?.orgId) {
            setIsLoadingData(true);
            getOrganizationById(user.profile.orgId)
                .then(org => {
                    if (org) {
                        setOrgName(org.name);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch organization details", err);
                    toast.error("Could not load your organization's details.");
                })
                .finally(() => {
                    setIsLoadingData(false);
                });
        }
    }, [user]);

    const handleSave = async () => {
        if (!user?.profile?.orgId) return;
        setIsSaving(true);
        toast.promise(
            updateOrganization(user.profile.orgId, { name: orgName }),
            {
                loading: 'Saving changes...',
                success: "Organization's settings have been saved successfully.",
                error: "Could not update your organization. Please try again.",
            }
        ).finally(() => {
            setIsSaving(false);
        });
    };
    
    const isLoading = userLoading || isLoadingData;

    if (isLoading) {
        return <div className="flex items-center justify-center p-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    if (user?.profile?.role !== 'admin') {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                    <CardDescription>You do not have permission to view this page.</CardDescription>
                </CardHeader>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Organization</CardTitle>
                <CardDescription>Manage your organization's general settings.</CardDescription>
            </CardHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="orgName">Organization Name</Label>
                        <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} disabled={isSaving || isLoading} />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving || isLoading}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
