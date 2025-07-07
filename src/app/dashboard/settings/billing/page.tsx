'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuthListener } from "@/hooks/use-auth-listener";

const invoices = [
    { invoice: 'INV001', date: '2023-10-01', amount: '$25.00', status: 'Paid' },
    { invoice: 'INV002', date: '2023-11-01', amount: '$25.00', status: 'Paid' },
    { invoice: 'INV003', date: '2023-12-01', amount: '$25.00', status: 'Pending' },
]

export default function BillingSettingsPage() {
    const { user } = useAuthListener();

    // This page is a placeholder and should only be visible to admins.
    // In a real app, you would fetch subscription details for the user's organization.
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
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Subscription Plan</CardTitle>
                    <CardDescription>You are currently on the <strong>Pro Plan</strong>.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Your plan includes up to 10 users and 5 departments. Your next billing date is January 1, 2025.</p>
                </CardContent>
                <CardFooter className="gap-2">
                    <Button>Change Plan</Button>
                    <Button variant="outline">Cancel Subscription</Button>
                </CardFooter>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>View your past invoices and payment details.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Invoice</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead className="text-right">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice.invoice}>
                                    <TableCell className="font-medium">{invoice.invoice}</TableCell>
                                    <TableCell>{invoice.date}</TableCell>
                                    <TableCell>{invoice.amount}</TableCell>
                                    <TableCell className="text-right">
                                        <Badge variant={invoice.status === 'Paid' ? 'secondary' : 'default'} className={invoice.status === 'Paid' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : ''}>{invoice.status}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
