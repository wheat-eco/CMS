'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreditCard, LogOut, Settings, User, Loader2 } from "lucide-react";
import Link from "next/link";
import { signOutUser } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { useAuthListener } from "@/hooks/use-auth-listener";

export function UserNav() {
  const { user, loading } = useAuthListener();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOutUser();
    router.push('/login');
  };

  if (loading) {
      return <Loader2 className="h-6 w-6 animate-spin" />;
  }
  
  if (!user || !user.profile) {
      return null;
  }
  
  const fallback = user.profile.name ? user.profile.name.substring(0, 2).toUpperCase() : 'U';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.photoURL || `https://avatar.vercel.sh/${user.uid}.png`} alt={user.profile.name} />
            <AvatarFallback>{fallback}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.profile.name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/dashboard/settings">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          {user.profile.role === 'admin' &&
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/billing">
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Billing</span>
              </Link>
            </DropdownMenuItem>
          }
          <DropdownMenuItem asChild>
             <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
