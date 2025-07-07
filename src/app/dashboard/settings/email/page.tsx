
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
import { Separator } from "@/components/ui/separator";
import { sendTestEmail } from "@/ai/flows/send-test-email-flow";

export default function EmailSettingsPage() {
    const { user, loading: userLoading } = useAuthListener();
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [testEmail, setTestEmail] = useState('');

    const [smtpSettings, setSmtpSettings] = useState({
        host: '',
        port: '',
        user: '',
        pass: ''
    });

    useEffect(() => {
        if (user?.profile?.orgId) {
            setIsLoadingData(true);
            getOrganizationById(user.profile.orgId)
                .then(org => {
                    if (org?.smtp) {
                        setSmtpSettings(org.smtp);
                    }
                    if (user.email) {
                        setTestEmail(user.email);
                    }
                })
                .catch(err => {
                    console.error("Failed to fetch organization details", err);
                    toast.error("Could not load email settings.");
                })
                .finally(() => {
                    setIsLoadingData(false);
                });
        }
    }, [user]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;
        setSmtpSettings(prev => ({ ...prev, [id]: value }));
    };

    const handleSave = async () => {
        if (!user?.profile?.orgId) return;
        setIsSaving(true);
        
        toast.promise(
            updateOrganization(user.profile.orgId, { smtp: smtpSettings }),
            {
                loading: 'Saving email settings...',
                success: 'Your email server settings have been updated.',
                error: 'Could not save your email settings. Please try again.',
            }
        ).finally(() => {
            setIsSaving(false);
        });
    };
    
    const handleSendTestEmail = async () => {
        if (!user?.profile?.orgId || !testEmail) {
            toast.error("User organization not found or recipient email is missing.");
            return;
        }
        setIsTesting(true);
        toast.promise(
            sendTestEmail({ recipientEmail: testEmail, orgId: user.profile.orgId }),
            {
                loading: 'Sending test email...',
                success: `Test email sent to ${testEmail}! Please check the inbox.`,
                error: (err) => err.message || 'Failed to send test email. Check SMTP settings.',
            }
        ).finally(() => {
            setIsTesting(false);
        });
    };

    const isLoading = userLoading || isLoadingData;
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

    if (isLoading) {
        return <div className="flex items-center justify-center p-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Email Server (SMTP)</CardTitle>
                    <CardDescription>
                        Configure your outgoing mail server for sending system notifications. These credentials are encrypted and stored securely.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="host">SMTP Host</Label>
                                <Input id="host" placeholder="smtp.example.com" value={smtpSettings.host} onChange={handleInputChange} disabled={isSaving} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="port">SMTP Port</Label>
                                <Input id="port" placeholder="587" value={smtpSettings.port} onChange={handleInputChange} disabled={isSaving} />
                            </div>
                        </div>
                        <Separator />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="user">Username</Label>
                                <Input id="user" placeholder="your-email@example.com" value={smtpSettings.user} onChange={handleInputChange} disabled={isSaving} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="pass">Password</Label>
                                <Input id="pass" type="password" placeholder="••••••••" value={smtpSettings.pass} onChange={handleInputChange} disabled={isSaving} />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Email Settings
                        </Button>
                    </CardFooter>
                </form>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Test Email Configuration</CardTitle>
                    <CardDescription>
                        Send a test email to verify your SMTP settings are working correctly. This will use your currently saved settings.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label htmlFor="testEmail">Recipient Email Address</Label>
                        <Input 
                            id="testEmail" 
                            type="email" 
                            placeholder="test@example.com" 
                            value={testEmail} 
                            onChange={(e) => setTestEmail(e.target.value)}
                            disabled={isTesting}
                        />
                    </div>
                </CardContent>
                <CardFooter>
                    <Button onClick={handleSendTestEmail} disabled={isTesting || !testEmail || isSaving}>
                        {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Test Email
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
