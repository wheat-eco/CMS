
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, MessageSquare, UserPlus, ShieldAlert, UserCheck } from "lucide-react";
import Link from "next/link";
import React, { useEffect } from "react";
import { Badge } from "./ui/badge";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { subscribeToNotifications, markAllNotificationsAsRead } from "@/lib/firebase/notifications";
import type { Notification } from "@/lib/types";
import { formatDistanceToNow } from 'date-fns';
import { cn } from "@/lib/utils";


const iconMap: Record<Notification['iconName'], React.ReactNode> = {
    messageSquare: <MessageSquare className="h-4 w-4 text-blue-500" />,
    checkCircle: <CheckCircle className="h-4 w-4 text-green-500" />,
    userPlus: <UserPlus className="h-4 w-4 text-purple-500" />,
    shieldAlert: <ShieldAlert className="h-4 w-4 text-orange-500" />,
    userCheck: <UserCheck className="h-4 w-4 text-indigo-500" />,
    bell: <Bell className="h-4 w-4 text-gray-500" />,
};

export function NotificationNav() {
    const { user } = useAuthListener();
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    
    useEffect(() => {
        if (user) {
            const unsubscribe = subscribeToNotifications(user.uid, setNotifications);
            return () => unsubscribe();
        }
    }, [user]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleOpenChange = async (open: boolean) => {
        if (open && unreadCount > 0 && user) {
            // Use a timeout to avoid marking as read instantly, giving user a chance to see the badge
            setTimeout(() => {
                if (user) {
                    markAllNotificationsAsRead(user.uid);
                }
            }, 2000);
        }
    }

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
          )}
          <span className="sr-only">Toggle notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96" align="end">
        <DropdownMenuLabel className="flex items-center justify-between">
            <p className="font-semibold">Notifications</p>
            {unreadCount > 0 && <Badge variant="secondary">{unreadCount} New</Badge>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-80 overflow-y-auto">
        {notifications.length > 0 ? notifications.map((notification) => (
            <DropdownMenuItem key={notification.id} asChild className="cursor-pointer">
                <Link href={notification.link}>
                    <div className={cn("flex items-start gap-3 py-2", !notification.read && "bg-primary/5")}>
                        <div className="flex-shrink-0 pt-0.5">{iconMap[notification.iconName]}</div>
                        <div className="flex-grow">
                            <p className={cn("font-medium text-sm leading-tight", !notification.read && "font-bold")}>{notification.title}</p>
                            <p className="text-xs text-muted-foreground">{notification.description}</p>
                            {notification.createdAt &&
                                <p className="text-xs text-muted-foreground/80 mt-1">{formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}</p>
                            }
                        </div>
                    </div>
                </Link>
            </DropdownMenuItem>
        )) : (
            <div className="text-center text-sm text-muted-foreground p-4">
                You have no new notifications.
            </div>
        )}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="justify-center text-sm text-primary hover:!bg-accent">
            <Link href="/dashboard/notifications">View all notifications</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
