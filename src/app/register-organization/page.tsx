"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { signUpAndCreateProfile } from "@/lib/firebase/auth";
import toast from "react-hot-toast";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/25 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-primary">
            <Shield className="w-9 h-9" />
            <span className="font-headline text-3xl">CMS</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function RegisterOrganizationPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const orgName = formData.get('orgName') as string;
        const adminName = formData.get('adminName') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;
        
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        try {
            await signUpAndCreateProfile(orgName, adminName, email, password);
            toast.success("Organization created successfully!");
            router.push('/dashboard');
        } catch (error: any) {
            console.error("Registration failed:", error);
            toast.error(error.message || "An unexpected error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

  return (
    <AuthLayout>
      <Card className="shadow-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create your Organization</CardTitle>
          <CardDescription>Set up your organization and super admin account to get started.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="relative">
              <Input id="orgName" name="orgName" placeholder=" " required disabled={isLoading} className="peer h-12 pt-4" />
              <Label htmlFor="orgName" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Organization Name</Label>
            </div>
            <div className="relative">
              <Input id="adminName" name="adminName" placeholder=" " required disabled={isLoading} className="peer h-12 pt-4" />
              <Label htmlFor="adminName" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Your Full Name</Label>
            </div>
            <div className="relative">
              <Input id="email" name="email" type="email" placeholder=" " required disabled={isLoading} className="peer h-12 pt-4" />
              <Label htmlFor="email" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Admin Email</Label>
            </div>
            <div className="relative">
                <Input id="password" name="password" type={showPassword ? 'text' : 'password'} placeholder=" " required disabled={isLoading} className="peer h-12 pt-4 pr-12" />
                <Label htmlFor="password" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Password</Label>
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                    {showPassword ? <EyeOff /> : <Eye />}
                    <span className="sr-only">Toggle password visibility</span>
                </Button>
            </div>
            <div className="relative">
                <Input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder=" " required disabled={isLoading} className="peer h-12 pt-4 pr-12" />
                <Label htmlFor="confirmPassword" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Confirm Password</Label>
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-1/2 h-7 w-7 -translate-y-1/2 text-muted-foreground" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                    {showConfirmPassword ? <EyeOff /> : <Eye />}
                    <span className="sr-only">Toggle confirm password visibility</span>
                </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
            </Button>
             <div className="text-sm text-center text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign In
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </AuthLayout>
  );
}
