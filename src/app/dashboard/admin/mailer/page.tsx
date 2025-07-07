'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { subscribeToOrganizationUsers } from '@/lib/firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { MultiSelect, type Option } from '@/components/ui/multi-select';
import { sendCustomEmail } from '@/ai/flows/send-custom-email-flow';
import { Skeleton } from '@/components/ui/skeleton';

export default function MailerPage() {
    const { user, loading: userLoading } = useAuthListener();
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    
    const [isSending, setIsSending] = useState(false);
    const [recipients, setRecipients] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');

    useEffect(() => {
        if (user?.profile?.orgId) {
            setLoadingUsers(true);
            const unsubscribe = subscribeToOrganizationUsers(user.profile.orgId, (users) => {
                setAllUsers(users);
                setLoadingUsers(false);
            });
            return () => unsubscribe();
        } else if (!userLoading) {
            setLoadingUsers(false);
        }
    }, [user, userLoading]);

    const userOptions: Option[] = useMemo(() => {
        return allUsers.map(u => ({ value: u.uid, label: `${u.name} <${u.email}>` }));
    }, [allUsers]);

    const handleSendEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.profile?.orgId) {
            toast.error("Could not determine your organization.");
            return;
        }
        if (recipients.length === 0 || !subject || !body) {
            toast.error("Please select recipients and fill out the subject and body.");
            return;
        }

        setIsSending(true);
        toast.promise(
            sendCustomEmail({
                recipientUids: recipients,
                subject,
                body,
                orgId: user.profile.orgId,
            }),
            {
                loading: 'Sending emails...',
                success: () => {
                    setRecipients([]);
                    setSubject('');
                    setBody('');
                    return 'Emails have been sent successfully!';
                },
                error: 'There was an error sending the emails. Please check your settings and try again.'
            }
        ).finally(() => {
            setIsSending(false);
        });
    };
    
    const isLoading = userLoading || loadingUsers;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Mailer</h1>
                <p className="text-muted-foreground">Send custom emails to users in your organization.</p>
            </div>
            
            <form onSubmit={handleSendEmail}>
                <Card>
                    <CardHeader>
                        <CardTitle>Compose Email</CardTitle>
                        <CardDescription>Select recipients and write your message. The email will be sent using your configured SMTP settings.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                             <div className="space-y-2">
                                <Label htmlFor="recipients">Recipients</Label>
                                <MultiSelect
                                    options={userOptions}
                                    selected={recipients}
                                    onChange={setRecipients}
                                    placeholder="Select users..."
                                    className="w-full"
                                    disabled={isSending}
                                />
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject line" disabled={isSending || isLoading} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="body">Body</Label>
                            <Textarea id="body" value={body} onChange={e => setBody(e.target.value)} placeholder="Write your email content here. You can use HTML for formatting." className="min-h-48" disabled={isSending || isLoading} />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSending || isLoading || recipients.length === 0 || !subject || !body}>
                            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Email
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    )
}