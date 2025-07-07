
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, MessageSquare, UserPlus, BellOff, ShieldAlert, UserCheck, Bell, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuthListener } from "@/hooks/use-auth-listener";
import { subscribeToNotifications, markAllNotificationsAsRead } from "@/lib/firebase/notifications";
import type { Notification } from "@/lib/types";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import { Skeleton } from "@/components/ui/skeleton";


const iconMap: Record<Notification['iconName'], React.ReactNode> = {
    messageSquare: <MessageSquare className="h-5 w-5 text-blue-500" />,
    checkCircle: <CheckCircle className="h-5 w-5 text-green-500" />,
    userPlus: <UserPlus className="h-5 w-5 text-purple-500" />,
    shieldAlert: <ShieldAlert className="h-5 w-5 text-orange-500" />,
    userCheck: <UserCheck className="h-5 w-5 text-indigo-500" />,
    bell: <Bell className="h-5 w-5 text-gray-500" />,
};


export default function NotificationsPage() {
    const { user, loading } = useAuthListener();
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
     const [isSubscribing, setIsSubscribing] = React.useState(true);

    useEffect(() => {
        if (user) {
            setIsSubscribing(true);
            const unsubscribe = subscribeToNotifications(user.uid, (data) => {
                setNotifications(data);
                setIsSubscribing(false);
            });
            return () => unsubscribe();
        } else if (!loading) {
            setIsSubscribing(false);
        }
    }, [user, loading]);

    const handleMarkAllAsRead = async () => {
        if (!user) return;
        toast.promise(markAllNotificationsAsRead(user.uid), {
            loading: 'Updating notifications...',
            success: 'All notifications marked as read.',
            error: 'Could not update notifications.'
        });
    };
    
    const isLoading = loading || isSubscribing;

    const NotificationSkeleton = () => (
        <div className="flex items-start gap-4 p-4">
            <Skeleton className="h-6 w-6 rounded-full" />
            <div className="flex-grow space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/4 mt-1" />
            </div>
            <Skeleton className="w-2 h-2 rounded-full" />
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight font-headline">Notifications</h1>
                    <p className="text-muted-foreground">View and manage all your notifications.</p>
                </div>
                <Button variant="outline" onClick={handleMarkAllAsRead} disabled={notifications.every(n => n.read)}>Mark all as read</Button>
            </div>
            <Card>
                <CardContent className="p-0">
                    <div className="divide-y divide-border">
                        {isLoading ? (
                            <div className="p-2">
                                <NotificationSkeleton />
                                <NotificationSkeleton />
                                <NotificationSkeleton />
                            </div>
                        ) : notifications.length > 0 ? notifications.map(notification => (
                            <Link key={notification.id} href={notification.link}>
                                <div className={cn("flex items-start gap-4 p-4 hover:bg-muted/50 cursor-pointer", !notification.read && 'bg-primary/5')}>
                                    <div className="flex-shrink-0 pt-0.5">{iconMap[notification.iconName]}</div>
                                    <div className="flex-grow">
                                        <p className={cn("font-medium text-sm leading-tight", !notification.read && 'font-semibold')}>{notification.title}</p>
                                        <p className="text-sm text-muted-foreground">{notification.description}</p>
                                        {notification.createdAt && 
                                            <p className="text-xs text-muted-foreground/80 mt-1">
                                                {formatDistanceToNow(notification.createdAt.toDate(), { addSuffix: true })}
                                            </p>
                                        }
                                    </div>
                                    {!notification.read && <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0"></div>}
                                </div>
                            </Link>
                        )) : (
                            <div className="text-center text-muted-foreground py-16">
                                <BellOff className="mx-auto h-12 w-12 text-muted-foreground/50" />
                                <h3 className="mt-4 text-lg font-semibold">No Notifications</h3>
                                <p className="mt-1 text-sm">You're all caught up!</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
