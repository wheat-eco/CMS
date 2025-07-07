
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
import { Input } from '@/components/ui/input';
import { ArrowUpRight, Search, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { subscribeToOrganizationTickets } from '@/lib/firebase/tickets';
import type { Ticket } from '@/lib/types';
import { format } from 'date-fns';

export default function AllTicketsPage() {
    const { user, loading: userLoading } = useAuthListener();
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    useEffect(() => {
        if (!user?.profile?.orgId) {
            if (!userLoading) setLoading(false);
            return;
        }
        
        const unsubscribe = subscribeToOrganizationTickets(user.profile.orgId, (tickets) => {
            setAllTickets(tickets);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, userLoading]);

    const filteredTickets = useMemo(() => {
        return allTickets
            .filter(ticket => {
                // Tab filter
                if (activeTab === 'all') return true;
                if (activeTab === 'in-progress') return ticket.status === 'In Progress';
                return ticket.status.toLowerCase() === activeTab;
            })
            .filter(ticket => {
                // Search term filter
                const term = searchTerm.toLowerCase();
                return ticket.title.toLowerCase().includes(term) ||
                       ticket.id.toLowerCase().includes(term) ||
                       ticket.reportedByName.toLowerCase().includes(term);
            });
    }, [allTickets, activeTab, searchTerm]);
    
    const isLoading = loading || userLoading;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">All Tickets</h1>
                <p className="text-muted-foreground">View and manage all tickets across departments.</p>
            </div>

            <Card>
                <CardHeader className='pb-2'>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <CardTitle>Department Tickets</CardTitle>
                         <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by ID, title, or user..." 
                                className="pl-8" 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                     <CardDescription>Browse and filter tickets assigned to your departments.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={setActiveTab} className='mt-4'>
                        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:grid-cols-4">
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="open">Open</TabsTrigger>
                            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                            <TabsTrigger value="resolved">Resolved</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="mt-4 rounded-md border">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="hidden md:table-cell">ID</TableHead>
                                        <TableHead>Title</TableHead>
                                        <TableHead className="hidden sm:table-cell">Reported By</TableHead>
                                        <TableHead className="hidden md:table-cell">Created</TableHead>
                                        <TableHead className="hidden sm:table-cell">Priority</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead><span className="sr-only">Actions</span></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredTickets.length > 0 ? filteredTickets.map((ticket) => (
                                        <TableRow key={ticket.id}>
                                            <TableCell className="hidden md:table-cell font-medium">{ticket.id.substring(0, 8).toUpperCase()}</TableCell>
                                            <TableCell>{ticket.title}</TableCell>
                                            <TableCell className="hidden sm:table-cell">{ticket.reportedByName}</TableCell>
                                            <TableCell className="hidden md:table-cell">{ticket.createdAt ? format(ticket.createdAt.toDate(), 'PP') : 'N/A'}</TableCell>
                                            <TableCell className="hidden sm:table-cell">
                                                <Badge
                                                    variant="outline"
                                                    className={
                                                        ticket.priority === 'High' || ticket.priority === 'Urgent' ? 'border-red-500 text-red-500'
                                                        : ticket.priority === 'Medium' ? 'border-yellow-500 text-yellow-500'
                                                        : 'border-gray-400'
                                                    }
                                                >
                                                    {ticket.priority}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={ticket.status === 'Resolved' ? 'secondary' : 'default'}
                                                    className={
                                                        ticket.status === 'Resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                        : ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        : 'bg-primary/10 text-primary'
                                                    }
                                                >
                                                    {ticket.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="ghost" size="icon" asChild>
                                                    <Link href={`/dashboard/tickets/${ticket.id}`}><ArrowUpRight className="h-4 w-4" /></Link>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center">
                                                No tickets found for the current filter.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
