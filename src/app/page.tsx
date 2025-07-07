'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, CheckCircle, Shield } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';

function LandingHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm">
      <Link href="/" className="flex items-center gap-2 font-bold text-xl">
        <Shield className="w-8 h-8 text-primary" />
        <span className="font-headline text-2xl">CMS</span>
      </Link>
      <div className="flex items-center gap-2">
        <Button variant="ghost" asChild>
          <Link href="/login">Sign In</Link>
        </Button>
        <Button asChild>
          <Link href="/register-organization">Get Started</Link>
        </Button>
      </div>
    </header>
  );
}

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <LandingHeader />
      <main className="flex-grow">
        <section className="container mx-auto px-4 pt-32 pb-16 text-center">
          <motion.div 
            className="max-w-4xl mx-auto"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <motion.h1 variants={itemVariants} className="text-4xl md:text-6xl font-headline font-bold tracking-tighter mb-4">
              Streamline Your<span className="text-primary"> Complaint </span>Management
            </motion.h1>
            <motion.p variants={itemVariants} className="text-lg md:text-xl text-muted-foreground mb-8">
              A modern, robust, and scalable solution for handling customer and employee complaints efficiently. Track, manage, and resolve issues with ease.
            </motion.p>
            <motion.div variants={itemVariants} className="flex justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="/register-organization">
                  Get Started for Free <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </motion.div>
          </motion.div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6 }}>
              <Image
                src="/shot.jpg"
                alt="Dashboard screenshot"
                width={600}
                height={400}
                className="rounded-lg shadow-2xl"
                data-ai-hint="dashboard analytics"
              />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6 }}>
              <h2 className="text-3xl font-headline font-bold mb-4">Powerful Features for Modern Teams</h2>
              <p className="text-muted-foreground mb-6">
                Our Complaint Management System is packed with features designed to improve your workflow and enhance collaboration.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold">Multi-tenant Architecture</h3>
                    <p className="text-muted-foreground text-sm">Securely manage multiple organizations from a single, centralized platform.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold">Role-Based Access Control</h3>
                    <p className="text-muted-foreground text-sm">Assign specific roles like Admin, Supervisor, and Employee with granular permissions.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-primary mr-3 mt-1 shrink-0" />
                  <div>
                    <h3 className="font-semibold">Interactive Ticket System</h3>
                    <p className="text-muted-foreground text-sm">Create, comment on, and resolve tickets with file attachments and real-time updates.</p>
                  </div>
                </li>
              </ul>
            </motion.div>
          </div>
        </section>

        <section className="bg-muted py-20">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-headline font-bold mb-4">Ready to take control?</h2>
                <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
                    Start managing complaints effectively and improve your organizational workflow today.
                </p>
                <Button size="lg" asChild>
                    <Link href="/register-organization">
                        Create Your Organization <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
            </div>
        </section>
      </main>

      <footer className="bg-background py-8 border-t">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Complaint Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
