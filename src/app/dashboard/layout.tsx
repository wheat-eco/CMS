
'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel
} from "@/components/ui/sidebar";
import { UserNav } from "@/components/user-nav";
import { Home, Users, FolderKanban, Settings, ShieldAlert, BarChart3, LifeBuoy, Loader2, ListCollapse, Mail } from "lucide-react";
import Link from "next/link";
import { useAuthListener } from '@/hooks/use-auth-listener';
import { NotificationNav } from '@/components/notification-nav';
import { signOutUser } from '@/lib/firebase/auth';
import { ChatProvider } from '@/hooks/use-chat';
import { ChatWidget } from '@/components/chat-widget';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuthListener();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; 

    if (!user) {
        if (pathname !== '/login') {
            router.push('/login');
        }
        return;
    }

    if (user.profile?.status === 'pending') {
        router.push('/pending-approval');
        return;
    } else if (user.profile?.status === 'inactive') {
        signOutUser().finally(() => {
            router.push('/login');
        });
        return;
    }

    // Redirect users to their primary dashboard on first load or on navigating to the base dashboard URL.
    if (pathname === '/dashboard') {
      if (user.profile?.role === 'admin') {
        router.replace('/dashboard/admin');
      } else if (user.profile?.role === 'supervisor') {
        router.replace('/dashboard/supervisor');
      }
    }
  }, [user, loading, router, pathname]);

  const userRole = user?.profile?.role;

  const getDashboardLink = () => {
    if (userRole === 'admin') return '/dashboard/admin';
    if (userRole === 'supervisor') return '/dashboard/supervisor';
    return '/dashboard';
  };

  const allNavs = [
      {
          label: 'My Space',
          roles: ['employee', 'supervisor', 'admin'],
          items: [
            { href: getDashboardLink(), label: "Dashboard", icon: Home },
            { href: "/dashboard/tickets/new", label: "New Ticket", icon: ShieldAlert },
          ]
      },
      {
          label: 'Supervisor',
          roles: ['supervisor'],
          items: [
            { href: "/dashboard/supervisor", label: "Overview", icon: BarChart3 },
            { href: "/dashboard/supervisor/team", label: "Team Members", icon: Users },
            { href: "/dashboard/tickets", label: "All Tickets", icon: FolderKanban },
          ]
      },
      {
          label: 'Admin',
          roles: ['admin'],
          items: [
            { href: "/dashboard/admin", label: "Overview", icon: BarChart3 },
            { href: "/dashboard/admin/users", label: "Manage Users", icon: Users },
            { href: "/dashboard/admin/departments", label: "Manage Departments", icon: FolderKanban },
            { href: "/dashboard/admin/categories", label: "Manage Categories", icon: ListCollapse },
            { href: "/dashboard/admin/mailer", label: "Mailer", icon: Mail },
            { href: "/dashboard/tickets", label: "All Tickets", icon: FolderKanban },
          ]
      }
  ]

  if (loading || !user || user.profile?.status !== 'active') {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarHeader>
             <Link href={getDashboardLink()} className="flex items-center gap-2 font-bold text-xl text-primary-foreground/90">
                <ShieldAlert className="w-8 h-8 text-primary-foreground/80" />
                <span className="font-headline text-2xl">CMS</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <SidebarMenu>
                {allNavs.map(group => (
                    userRole && group.roles.includes(userRole) && (
                        <SidebarGroup key={group.label}>
                            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                            {group.items.map(item => (
                                 <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton asChild tooltip={item.label} isActive={pathname === item.href}>
                                        <Link href={item.href}>
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarGroup>
                    )
                ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <SidebarSeparator />
             <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname.startsWith('/dashboard/settings')}>
                        <Link href="/dashboard/settings"><Settings /><span>Settings</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                 <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={pathname === '/dashboard/help'}>
                        <Link href="/dashboard/help"><LifeBuoy /><span>Help & Support</span></Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
             </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <ChatProvider>
              <header className="flex h-14 items-center gap-4 border-b bg-background/95 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30">
                <SidebarTrigger className="md:hidden" />
                <div className="flex-1">
                  {/* Breadcrumbs could go here */}
                </div>
                <div className="flex items-center gap-2">
                    <NotificationNav />
                    <UserNav />
                </div>
              </header>
              <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-muted/50">
                {children}
              </main>
              <ChatWidget />
          </ChatProvider>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
