
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, ShieldCheck, Clock, ArrowUpRight, Loader2, FolderKanban } from "lucide-react";
import Link from "next/link";
import { useAuthListener } from '@/hooks/use-auth-listener';
import { subscribeToDepartments } from '@/lib/firebase/departments';
import { subscribeToOrganizationTickets } from '@/lib/firebase/tickets';
import { subscribeToOrganizationUsers } from '@/lib/firebase/firestore';
import type { Department, Ticket, UserProfile } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function formatDuration(ms: number): string {
  if (ms <= 0) return '0m';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export default function SupervisorDashboard() {
  const { user, loading: userLoading } = useAuthListener();

  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allTickets, setAllTickets] = useState<Ticket[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  
  const supervisorDepartments = useMemo(() => {
    if (!user) return [];
    if (user.profile?.role === 'admin') return allDepartments;
    return allDepartments.filter(d => d.supervisorId === user.uid);
  }, [allDepartments, user]);

  const departmentNames = useMemo(() => supervisorDepartments.map(d => d.name), [supervisorDepartments]);

  const relevantTickets = useMemo(() => {
    if (user?.profile?.role === 'admin') return allTickets;
    return allTickets.filter(t => departmentNames.includes(t.department));
  }, [allTickets, departmentNames, user]);

  const relevantUsers = useMemo(() => {
     if (user?.profile?.role === 'admin') return allUsers;
    return allUsers.filter(u => u.department && departmentNames.includes(u.department))
  }, [allUsers, departmentNames, user]);

  useEffect(() => {
    if (!user?.profile?.orgId) {
      if (!userLoading) setLoading(false);
      return;
    }
    setLoading(true);
    const unsubDepartments = subscribeToDepartments(user.profile.orgId, setAllDepartments);
    const unsubTickets = subscribeToOrganizationTickets(user.profile.orgId, setAllTickets);
    const unsubUsers = subscribeToOrganizationUsers(user.profile.orgId, (users) => {
        setAllUsers(users);
        setLoading(false);
    });

    return () => {
        unsubDepartments();
        unsubTickets();
        unsubUsers();
    }
  }, [user, userLoading]);

  const aggregateData = useMemo(() => {
    const openTickets = relevantTickets.filter(t => t.status === 'Open' || t.status === 'In Progress');
    
    const resolvedTickets = relevantTickets.filter(t => t.status === 'Resolved' && t.createdAt && t.updatedAt);
    const totalResolutionTime = resolvedTickets.reduce((acc, t) => {
        const resolutionTime = t.updatedAt.toMillis() - t.createdAt.toMillis();
        return acc + resolutionTime;
    }, 0);
    const avgResolutionTimeMs = resolvedTickets.length > 0 ? totalResolutionTime / resolvedTickets.length : 0;
    
    return {
        totalMembers: relevantUsers.length,
        openTicketsCount: openTickets.length,
        avgResolutionTime: formatDuration(avgResolutionTimeMs),
        openTickets: openTickets.sort((a,b) => {
            const priorityOrder = { 'Urgent': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
            return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        }).slice(0, 10),
    }
  }, [relevantUsers, relevantTickets]);
  
  const isLoading = loading || userLoading;

  if (supervisorDepartments.length === 0 && user?.profile?.role !== 'admin' && !isLoading) {
      return (
        <div className="text-center py-12 text-muted-foreground">
            <h2 className="text-xl font-semibold">No Departments Assigned</h2>
            <p className="mt-2">You are not currently assigned as a supervisor to any departments.</p>
            <p>Please contact an administrator for assistance.</p>
        </div>
      )
  }
  
  const StatCardSkeleton = () => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-5 w-5 rounded-sm" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-1/3 mb-1" />
        <Skeleton className="h-3 w-1/2" />
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">Supervisor Dashboard</h1>
            <p className="text-muted-foreground">Aggregated view of all your assigned departments.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
            <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </>
        ) : (
            <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Managed Departments</CardTitle>
                    <FolderKanban className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{supervisorDepartments.length}</div>
                    <p className="text-xs text-muted-foreground">under your supervision</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Team Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aggregateData.totalMembers}</div>
                    <p className="text-xs text-muted-foreground">across your departments</p>
                  </CardContent>
                  <CardFooter>
                     <Button asChild size="sm" variant="outline" className="w-full">
                        <Link href="/dashboard/supervisor/team">Manage Team</Link>
                    </Button>
                  </CardFooter>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Open Tickets</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aggregateData.openTicketsCount}</div>
                     <p className="text-xs text-muted-foreground">requiring attention</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Resolution Time</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aggregateData.avgResolutionTime}</div>
                    <p className="text-xs text-muted-foreground">for all resolved tickets</p>
                  </CardContent>
                </Card>
            </>
        )}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Open Tickets Requiring Action</CardTitle>
          <CardDescription>A combined list of open tickets from all your departments, sorted by priority.</CardDescription>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : aggregateData.openTickets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aggregateData.openTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell>{ticket.department}</TableCell>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>{ticket.reportedByName}</TableCell>
                      <TableCell>
                        <Badge className={ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-primary/10 text-primary'}>{ticket.status}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={ticket.priority === 'High' || ticket.priority === 'Urgent' ? 'border-red-500 text-red-500' : ticket.priority === 'Medium' ? 'border-yellow-500 text-yellow-500' : 'border-gray-400'}>{ticket.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/tickets/${ticket.id}`}><ArrowUpRight className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
                <div className="text-center py-12 text-muted-foreground">
                    No open tickets in your departments. Great job!
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
