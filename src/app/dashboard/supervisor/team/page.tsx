
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Ticket, CheckCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { subscribeToOrganizationUsers } from '@/lib/firebase/firestore';
import { subscribeToDepartments } from '@/lib/firebase/departments';
import { subscribeToOrganizationTickets } from '@/lib/firebase/tickets';
import type { UserProfile, Department, Ticket } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function SupervisorTeamPage() {
    const { user, loading: userLoading } = useAuthListener();
    
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [allDepartments, setAllDepartments] = useState<Department[]>([]);
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    
    const supervisorDepartments = useMemo(() => {
        if (!user) return [];
        if (user.profile?.role === 'admin') return allDepartments.map(d => d.name);
        return allDepartments.filter(d => d.supervisorId === user.uid).map(d => d.name);
    }, [allDepartments, user]);

    useEffect(() => {
        if (!user?.profile?.orgId) {
            if (!userLoading) setLoadingData(false);
            return;
        }

        setLoadingData(true);
        const unsubUsers = subscribeToOrganizationUsers(user.profile.orgId, (users) => {
            setAllUsers(users);
        });
        const unsubDepts = subscribeToDepartments(user.profile.orgId, (depts) => {
            setAllDepartments(depts);
        });
        const unsubTickets = subscribeToOrganizationTickets(user.profile.orgId, (tickets) => {
            setAllTickets(tickets);
            setLoadingData(false); // Set loading to false after the last listener fires
        });


        return () => {
            unsubUsers();
            unsubDepts();
            unsubTickets();
        };
    }, [user, userLoading]);
    
    const teamMembersWithStats = useMemo(() => {
        const membersInDept = allUsers.filter(
            u => u.department && supervisorDepartments.includes(u.department)
        );

        const membersWithStats = membersInDept.map(member => {
            const memberTickets = allTickets.filter(t => t.reportedById === member.uid);
            const openTickets = memberTickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
            const resolvedTickets = memberTickets.filter(t => t.status === 'Resolved').length;
            return {
                ...member,
                stats: {
                    total: memberTickets.length,
                    open: openTickets,
                    resolved: resolvedTickets
                }
            };
        });

        return membersWithStats.filter(member => {
            const term = searchTerm.toLowerCase();
            return member.name.toLowerCase().includes(term) ||
                   member.email.toLowerCase().includes(term);
        });

    }, [allUsers, allTickets, supervisorDepartments, searchTerm]);

    const isLoading = loadingData || userLoading;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Team Members</h1>
                <p className="text-muted-foreground">View performance and manage employees in your department(s).</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Employee List</CardTitle>
                    <CardDescription>A list of all employees assigned to your departments with their ticket statistics.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by name or email..." 
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
                                <TableHead className="hidden md:table-cell text-center">
                                    <div className="flex items-center justify-center gap-1.5">
                                        <Clock className="w-4 h-4"/> Open
                                    </div>
                                </TableHead>
                                <TableHead className="hidden md:table-cell text-center">
                                     <div className="flex items-center justify-center gap-1.5">
                                        <CheckCircle className="w-4 h-4"/> Resolved
                                    </div>
                                </TableHead>
                                 <TableHead className="hidden md:table-cell text-center">
                                     <div className="flex items-center justify-center gap-1.5">
                                        <Ticket className="w-4 h-4"/> Total
                                    </div>
                                </TableHead>
                                <TableHead className="hidden sm:table-cell">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {teamMembersWithStats.length > 0 ? teamMembersWithStats.map((member) => (
                                <TableRow key={member.uid}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-10 w-10">
                                                <AvatarImage src={`https://avatar.vercel.sh/${member.uid}.png`} alt={member.name} />
                                                <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium">{member.name}</div>
                                                <div className="text-sm text-muted-foreground">{member.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">{member.department || 'N/A'}</TableCell>
                                    <TableCell className="hidden md:table-cell text-center font-mono font-medium">{member.stats.open}</TableCell>
                                    <TableCell className="hidden md:table-cell text-center font-mono font-medium">{member.stats.resolved}</TableCell>
                                    <TableCell className="hidden md:table-cell text-center font-mono font-medium">{member.stats.total}</TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <Badge
                                          variant="secondary"
                                          className={cn(
                                            member.status === 'active' && 'status-active',
                                            member.status === 'pending' && 'status-pending',
                                            member.status === 'inactive' && 'status-inactive',
                                          )}
                                        >
                                            {member.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No team members found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
