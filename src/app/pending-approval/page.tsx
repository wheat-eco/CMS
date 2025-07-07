import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import Link from "next/link";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/25 p-4">
      <div className="w-full max-w-md text-center">
        {children}
      </div>
    </div>
  );
}

export default function PendingApprovalPage() {
  return (
    <AuthLayout>
        <Card className="shadow-2xl">
            <CardHeader>
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                    <MailCheck className="w-12 h-12 text-primary" />
                </div>
                <CardTitle className="font-headline text-2xl pt-4">Registration Submitted</CardTitle>
                <CardDescription>Your account is pending approval from an administrator. You will receive an email notification once your account has been approved.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground">Please be patient. This process may take up to 24 hours.</p>
            </CardContent>
            <CardFooter>
                <Button asChild className="w-full">
                    <Link href="/">Back to Home</Link>
                </Button>
            </CardFooter>
        </Card>
    </AuthLayout>
  );
}
