"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Shield, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState, useEffect } from "react";
import { registerEmployee } from "@/lib/firebase/auth";
import { getOrganizations } from "@/lib/firebase/organizations";
import { getDepartmentsForOrganization } from "@/lib/firebase/departments";
import toast from "react-hot-toast";
import type { Organization, Department } from "@/lib/types";

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

export default function RegisterPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [loadingOrgs, setLoadingOrgs] = useState(true);
    const [loadingDepts, setLoadingDepts] = useState(false);

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const orgs = await getOrganizations();
                setOrganizations(orgs);
            } catch (error) {
                console.error("Failed to fetch organizations:", error);
                toast.error('Could not load organizations.');
            } finally {
                setLoadingOrgs(false);
            }
        };
        fetchOrgs();
    }, []);

    useEffect(() => {
        if (!selectedOrg) {
            setDepartments([]);
            return;
        };

        const fetchDepts = async () => {
            setLoadingDepts(true);
            try {
                const depts = await getDepartmentsForOrganization(selectedOrg);
                setDepartments(depts);
            } catch (error) {
                console.error("Failed to fetch departments:", error);
                toast.error('Could not load departments for the selected organization.');
            } finally {
                setLoadingDepts(false);
            }
        };
        fetchDepts();

    }, [selectedOrg]);


    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const fullName = formData.get('fullName') as string;
        const email = formData.get('email') as string;
        const password = formData.get('password') as string;
        const confirmPassword = formData.get('confirmPassword') as string;
        const orgId = formData.get('organization') as string;
        const department = formData.get('department') as string;
        const phone = formData.get('phone') as string;
        
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        if (!orgId || !department) {
            toast.error("Please select an organization and department.");
            setIsLoading(false);
            return;
        }

        try {
            await registerEmployee(fullName, email, password, orgId, department, phone);
            toast.success("Registration submitted! Please wait for admin approval.");
            router.push('/pending-approval');
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
          <CardTitle className="font-headline text-2xl">Employee Registration</CardTitle>
          <CardDescription>Create your employee account to start submitting tickets.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="relative">
              <Input id="fullName" name="fullName" placeholder=" " required disabled={isLoading} className="peer h-12 pt-4" />
              <Label htmlFor="fullName" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Full Name</Label>
            </div>
            <div className="relative">
              <Input id="email" name="email" type="email" placeholder=" " required disabled={isLoading} className="peer h-12 pt-4" />
              <Label htmlFor="email" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Email</Label>
            </div>
            <div className="relative">
              <Input id="phone" name="phone" type="tel" placeholder=" " disabled={isLoading} className="peer h-12 pt-4" />
              <Label htmlFor="phone" className="absolute left-3 top-3 text-muted-foreground transition-all duration-300 pointer-events-none peer-placeholder-shown:top-3 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-primary peer-valid:-top-2.5 peer-valid:text-sm peer-valid:text-primary">Phone Number (Optional)</Label>
            </div>
            <div className="space-y-2">
              <Label>Organization</Label>
              <Select name="organization" required disabled={isLoading || loadingOrgs} onValueChange={setSelectedOrg}>
                <SelectTrigger id="organization" className="h-12">
                  <SelectValue placeholder={loadingOrgs ? "Loading..." : "Select your organization"} />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map(org => (
                     <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="space-y-2">
              <Label>Department</Label>
              <Select name="department" required disabled={isLoading || loadingDepts || !selectedOrg}>
                <SelectTrigger id="department" className="h-12">
                  <SelectValue placeholder={loadingDepts ? "Loading..." : "Select your department"} />
                </SelectTrigger>
                <SelectContent>
                  {departments.map(dep => (
                    <SelectItem key={dep.id} value={dep.name}>{dep.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Register
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
