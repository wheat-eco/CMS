'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Paperclip, File as FileIcon, XCircle } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useAuthListener } from "@/hooks/use-auth-listener";
import { createTicket } from "@/lib/firebase/tickets";
import { getCategoriesForOrganization } from "@/lib/firebase/categories";
import type { Ticket, Category } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

export default function NewTicketPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Ticket['priority'] | ''>('');
  const [category, setCategory] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const router = useRouter();
  const { user, loading: userLoading } = useAuthListener();

  useEffect(() => {
    if (user?.profile?.orgId) {
        setLoadingCategories(true);
        getCategoriesForOrganization(user.profile.orgId)
            .then(setCategories)
            .catch(err => {
                console.error("Failed to load categories", err);
                toast.error('Could not load ticket categories.');
            })
            .finally(() => setLoadingCategories(false));
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (attachments.length + e.target.files.length > 5) {
        toast.error('You can upload a maximum of 5 files.');
        return;
      }
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.profile?.orgId || !user.profile.department) {
        toast.error("You must be logged in and have a department assigned to create a ticket.");
        return;
    }
    if (!title || !description || !priority || !category) {
         toast.error("Please fill out all required fields.");
        return;
    }

    setIsSubmitting(true);
    
    const promise = createTicket({
        title,
        description,
        priority,
        category,
        isPublic,
        attachments,
        orgId: user.profile.orgId,
        reportedById: user.uid,
        reportedByName: user.profile.name,
        department: user.profile.department,
    });

    toast.promise(promise, {
        loading: 'Submitting ticket...',
        success: (ticketId) => {
            router.push('/dashboard');
            return 'Ticket submitted successfully!';
        },
        error: (err) => err.message || 'Could not create the ticket. Please try again.',
    }).finally(() => {
        setIsSubmitting(false);
    });
  }
  
  const formDisabled = isSubmitting || userLoading || loadingCategories;

  return (
    <div className="space-y-6">
       <div>
            <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
            </Button>
       </div>
      <form onSubmit={handleSubmit}>
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle className="font-headline text-2xl">Create a New Ticket</CardTitle>
            <CardDescription>
              Please provide as much detail as possible so we can resolve your issue quickly. Your department is automatically set to <span className="font-semibold text-primary">{user?.profile?.department || 'your department'}</span>.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="e.g., Unable to connect to VPN" value={title} onChange={(e) => setTitle(e.target.value)} disabled={formDisabled} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the issue in detail. Include steps to reproduce, error messages, and any other relevant information."
                className="min-h-[150px]"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={formDisabled}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={setCategory} value={category} disabled={formDisabled || categories.length === 0} required>
                  <SelectTrigger id="category">
                    <SelectValue placeholder={loadingCategories ? "Loading..." : "Select a category"} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority Level</Label>
                <Select onValueChange={(value: Ticket['priority']) => setPriority(value)} value={priority} disabled={formDisabled} required>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="attachments">Attachments (Optional)</Label>
                <div className="flex items-center justify-center w-full">
                    <label htmlFor="dropzone-file" className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg ${formDisabled ? 'cursor-not-allowed bg-muted/50' : 'cursor-pointer bg-secondary hover:bg-accent'}`}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center">
                            <Paperclip className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold text-primary">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-muted-foreground">PNG, JPG, PDF (MAX. 5 files)</p>
                        </div>
                        <Input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} multiple disabled={formDisabled} />
                    </label>
                </div>
                {attachments.length > 0 && (
                <div className="space-y-2 pt-2">
                    <p className="text-sm font-medium">Selected files:</p>
                    <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                        <Badge key={index} variant="secondary" className="pl-2">
                        <FileIcon className="h-3 w-3 mr-1" />
                        {file.name}
                        <button type="button" onClick={() => removeAttachment(index)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5" disabled={formDisabled}>
                            <XCircle className="h-3 w-3" />
                            <span className="sr-only">Remove {file.name}</span>
                        </button>
                        </Badge>
                    ))}
                    </div>
                </div>
                )}
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-secondary">
              <Switch id="is-public" checked={isPublic} onCheckedChange={setIsPublic} disabled={formDisabled} />
              <div>
                <Label htmlFor="is-public">Make this ticket public</Label>
                <p className="text-xs text-muted-foreground">Allows others in your department to see and comment on this ticket.</p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={formDisabled || !title || !description || !priority || !category}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Ticket
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
