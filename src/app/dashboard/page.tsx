
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, PlusCircle, ShieldCheck, Clock, Users } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { getUserTickets, getDepartmentPublicTickets } from "@/lib/firebase/tickets";
import type { Ticket } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";

export default function EmployeeDashboard() {
  const { user, loading: userLoading } = useAuthListener();
  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [departmentTickets, setDepartmentTickets] = useState<Ticket[]>([]);
  const [loadingMyTickets, setLoadingMyTickets] = useState(true);
  const [loadingDeptTickets, setLoadingDeptTickets] = useState(true);

  useEffect(() => {
    if (user) {
      setLoadingMyTickets(true);
      getUserTickets(user.uid)
        .then(setMyTickets)
        .catch(console.error)
        .finally(() => setLoadingMyTickets(false));
      
      if (user.profile?.department && user.profile?.orgId) {
        setLoadingDeptTickets(true);
        getDepartmentPublicTickets(user.profile.orgId, user.profile.department)
            .then(tickets => {
                setDepartmentTickets(tickets.filter(t => t.reportedById !== user.uid));
            })
            .catch(console.error)
            .finally(() => setLoadingDeptTickets(false));
      } else {
        setLoadingDeptTickets(false);
      }
    }
  }, [user]);

  const openTickets = myTickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length;
  
  const isLoading = userLoading || loadingMyTickets || loadingDeptTickets;

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
  
  const TableSkeleton = () => (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
            <h1 className="text-2xl font-bold tracking-tight font-headline">Welcome back, {user?.profile?.name?.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Here's a summary of your activity and what's happening in your department.</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
            <Link href="/dashboard/tickets/new"><PlusCircle className="mr-2 h-4 w-4"/>Create New Ticket</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
         {isLoading ? (
            <>
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
            </>
         ) : (
            <>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Total Tickets</CardTitle>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{myTickets.length}</div>
                    <p className="text-xs text-muted-foreground">All tickets you've submitted.</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">My Pending Tickets</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{openTickets}</div>
                    <p className="text-xs text-muted-foreground">Awaiting supervisor review</p>
                  </CardContent>
                </Card>
                 <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Public Department Tickets</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{departmentTickets.length}</div>
                    <p className="text-xs text-muted-foreground">Active tickets in your department.</p>
                  </CardContent>
                </Card>
            </>
         )}
      </div>
      
      <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>My Recent Tickets</CardTitle>
              <CardDescription>A list of your most recent tickets.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton />
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTickets.length > 0 ? myTickets.slice(0,5).map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>
                        <Badge variant={ticket.status === 'Resolved' ? 'secondary' : 'default'} className={ticket.status === 'Resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ticket.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-primary/10 text-primary'}>{ticket.status}</Badge>
                      </TableCell>
                       <TableCell>
                        {ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/tickets/${ticket.id}`}><ArrowUpRight className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        You haven't created any tickets yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Public Department Tickets</CardTitle>
              <CardDescription>Recent public tickets from other members of your department.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <TableSkeleton />
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Reported By</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentTickets.length > 0 ? departmentTickets.slice(0,5).map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">{ticket.title}</TableCell>
                      <TableCell>{ticket.reportedByName.split(' ')[0]}</TableCell>
                      <TableCell>
                        {ticket.createdAt ? formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/dashboard/tickets/${ticket.id}`}><ArrowUpRight className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No public tickets in your department right now.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
      </div>
    </div>
  )
}
