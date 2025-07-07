
'use client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Users, ShieldAlert, FolderKanban, CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import React, { useState, useEffect, useMemo } from "react";
import toast from "react-hot-toast";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { subscribeToOrganizationUsers, updateUserProfile } from "@/lib/firebase/firestore";
import { subscribeToOrganizationTickets } from "@/lib/firebase/tickets";
import { subscribeToDepartments } from "@/lib/firebase/departments";
import type { UserProfile, Ticket, Department } from "@/lib/types";
import { subMonths, format, startOfMonth } from 'date-fns';
import { createNotification } from "@/lib/firebase/notifications";
import { Skeleton } from "@/components/ui/skeleton";


const chartConfig = {
  tickets: {
    label: "Tickets",
    color: "hsl(var(--primary))",
  },
};

export default function AdminDashboard() {
  const { user: adminUser, loading: adminLoading } = useAuthListener();
  const [actionState, setActionState] = React.useState<{ user: UserProfile; action: 'approve' | 'reject' } | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [loadingDepts, setLoadingDepts] = useState(true);

  const pendingUsers = useMemo(() => {
    return allUsers.filter(u => u.status === 'pending');
  }, [allUsers]);

  const stats = useMemo(() => {
    return {
      totalUsers: allUsers.length,
      openTickets: tickets.filter(t => t.status === 'Open' || t.status === 'In Progress').length,
      totalDepartments: departments.length,
    }
  }, [allUsers, tickets, departments]);

   const chartData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), 5 - i);
      return {
        month: format(d, 'MMM'),
        date: startOfMonth(d),
        tickets: 0,
      };
    });

    tickets.forEach(ticket => {
      if (ticket.createdAt) {
        const ticketMonth = startOfMonth(ticket.createdAt.toDate());
        const monthData = months.find(m => m.date.getTime() === ticketMonth.getTime());
        if (monthData) {
          monthData.tickets += 1;
        }
      }
    });

    return months;
  }, [tickets]);

  useEffect(() => {
    if (adminUser?.profile?.orgId) {
      setLoadingUsers(true);
      const unsubAllUsers = subscribeToOrganizationUsers(adminUser.profile.orgId, (users) => {
          setAllUsers(users);
          setLoadingUsers(false);
      });

      setLoadingTickets(true);
      const unsubTickets = subscribeToOrganizationTickets(adminUser.profile.orgId, (tickets) => {
          setTickets(tickets);
          setLoadingTickets(false);
      });
      
      setLoadingDepts(true);
      const unsubDepts = subscribeToDepartments(adminUser.profile.orgId, (depts) => {
          setDepartments(depts);
          setLoadingDepts(false);
      });

      return () => {
        unsubAllUsers();
        unsubTickets();
        unsubDepts();
      }
    }
  }, [adminUser]);

  const handleActionConfirm = async () => {
    if (!actionState || !adminUser?.profile) return;

    setIsSubmitting(true);
    const newStatus = actionState.action === 'approve' ? 'active' : 'inactive';

    const promise = updateUserProfile(actionState.user.uid, { status: newStatus })
        .then(() => {
            if (actionState.action === 'approve') {
                return createNotification(actionState.user.uid, adminUser.profile.orgId, {
                    notificationType: 'userApproved',
                    userName: actionState.user.name,
                    orgName: adminUser.profile.orgId,
                });
            }
        });

    toast.promise(promise, {
        loading: 'Updating user status...',
        success: `${actionState.user.name} has been ${actionState.action === 'approve' ? 'approved' : 'rejected'}.`,
        error: "Could not update the user. Please try again.",
    }).finally(() => {
        setIsSubmitting(false);
        setActionState(null);
    });
  };
  
  const openDialog = (user: UserProfile, action: 'approve' | 'reject') => {
    setActionState({ user, action });
  };
  
  const isLoading = adminLoading || loadingUsers || loadingTickets || loadingDepts;

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
            <h1 className="text-3xl font-bold tracking-tight font-headline">Admin Dashboard</h1>
            <p className="text-muted-foreground">Oversee and manage the entire system.</p>
        </div>
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
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalUsers}</div>
                    <p className="text-xs text-muted-foreground">in your organization</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Open Tickets</CardTitle>
                    <ShieldAlert className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.openTickets}</div>
                    <p className="text-xs text-muted-foreground">across all departments</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Departments</CardTitle>
                    <FolderKanban className="h-5 w-5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{stats.totalDepartments}</div>
                    <p className="text-xs text-muted-foreground">currently active</p>
                  </CardContent>
                </Card>
            </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="col-span-2 lg:col-span-1">
            <CardHeader>
                <CardTitle>Ticket Volume</CardTitle>
                <CardDescription>Monthly ticket creation trends for the last 6 months.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center h-[250px]">
                        <Skeleton className="h-full w-full" />
                    </div>
                ) : (
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                    <BarChart data={chartData} accessibilityLayer>
                        <CartesianGrid vertical={false} />
                        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis allowDecimals={false} />
                        <Tooltip cursor={false} content={<ChartTooltipContent />} />
                        <Bar dataKey="tickets" fill="var(--color-tickets)" radius={8} />
                    </BarChart>
                </ChartContainer>
                )}
            </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Pending User Approvals</CardTitle>
            <CardDescription>Review and approve new employee registrations.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                </div>
            ) : (
                <div className="space-y-4">
                  {pendingUsers.length > 0 ? pendingUsers.map(user => (
                      <div key={user.uid} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                          <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" className="text-green-600 hover:bg-green-100 hover:text-green-700" onClick={() => openDialog(user, 'approve')}>
                                  <CheckCircle className="h-5 w-5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600 hover:bg-red-100 hover:text-red-700" onClick={() => openDialog(user, 'reject')}>
                                  <XCircle className="h-5 w-5" />
                              </Button>
                          </div>
                      </div>
                  )) : (
                  <div className="h-24 text-center flex flex-col justify-center items-center">
                    <p className="text-muted-foreground">No pending approvals.</p>
                  </div>
                  )}
                </div>
            )}
          </CardContent>
          <CardFooter>
            <Button variant="outline" size="sm" asChild className="w-full">
                <Link href="/dashboard/admin/users">View All Users</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
      <AlertDialog open={!!actionState} onOpenChange={(open) => !open && setActionState(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirm Action</AlertDialogTitle>
                <AlertDialogDescription>
                    Are you sure you want to {actionState?.action} the user "{actionState?.user.name}"?
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                    onClick={handleActionConfirm}
                    disabled={isSubmitting}
                    className={actionState?.action === 'reject' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
                >
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirm
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

    