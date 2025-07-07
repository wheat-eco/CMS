'use client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import toast from "react-hot-toast";
import { Loader2, Upload } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { updateUserProfile } from "@/lib/firebase/firestore";

export default function ProfileSettingsPage() {
    const { user, loading } = useAuthListener();
    const [isSaving, setIsSaving] = useState(false);
    const [fullName, setFullName] = useState('');

    useEffect(() => {
        if (user?.profile?.name) {
            setFullName(user.profile.name);
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        toast.promise(
            updateUserProfile(user.uid, { name: fullName }),
            {
                loading: 'Saving changes...',
                success: 'Your changes have been saved successfully.',
                error: 'Could not update your profile. Please try again.',
            }
        ).finally(() => {
            setIsSaving(false);
        });
    };
    
    if (loading || !user) {
        return <div className="flex items-center justify-center p-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }
    
    const fallback = fullName ? fullName.substring(0, 2).toUpperCase() : '...';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>This is how others will see you on the site.</CardDescription>
            </CardHeader>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.photoURL ?? `https://avatar.vercel.sh/${user.uid}.png`} data-ai-hint="person avatar" />
                            <AvatarFallback>{fallback}</AvatarFallback>
                        </Avatar>
                        <Button type="button" variant="outline" disabled><Upload className="mr-2 h-4 w-4" /> Change Photo (Soon)</Button>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={isSaving || loading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={user?.email || ''} disabled />
                        <p className="text-xs text-muted-foreground">You can't change your email address.</p>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit" disabled={isSaving || loading || fullName === user?.profile?.name}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
