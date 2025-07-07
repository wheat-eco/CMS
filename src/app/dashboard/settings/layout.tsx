
'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePathname } from "next/navigation";
import Link from "next/link";
import React, { useMemo } from "react";
import { useAuthListener } from "@/hooks/use-auth-listener";

const baseTabs = [
    { name: "Profile", href: "/dashboard/settings", roles: ['admin', 'supervisor', 'employee'] },
    { name: "Account", href: "/dashboard/settings/account", roles: ['admin', 'supervisor', 'employee'] },
    { name: "Organization", href: "/dashboard/settings/organization", roles: ['admin'] },
    { name: "Billing", href: "/dashboard/settings/billing", roles: ['admin'] },
    { name: "Email Server", href: "/dashboard/settings/email", roles: ['admin'] },
    { name: "Notifications", href: "/dashboard/settings/notifications", roles: ['admin', 'supervisor', 'employee'] },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuthListener();
  
  const visibleTabs = useMemo(() => {
    if (!user?.profile?.role) return [];
    return baseTabs.filter(tab => tab.roles.includes(user.profile!.role));
  }, [user]);

  // To handle the case where a non-admin might try to access an admin-only URL
  const currentPathIsValid = visibleTabs.some(tab => tab.href === pathname);
  const value = currentPathIsValid ? pathname : '/dashboard/settings';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and organization settings.</p>
      </div>
      <Tabs value={value} className="w-full">
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 sm:max-w-3xl">
            {visibleTabs.map((tab) => (
                <TabsTrigger value={tab.href} key={tab.href} asChild>
                    <Link href={tab.href}>{tab.name}</Link>
                </TabsTrigger>
            ))}
        </TabsList>
      </Tabs>
      <div className="mt-6">
        {children}
      </div>
    </div>
  );
}
