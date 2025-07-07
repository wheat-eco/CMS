
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Clock, File as FileIcon, Send, Shield, User, Loader2, ListCollapse, Paperclip, XCircle, Sparkles, MoreVertical } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { getTicketById, subscribeToTicketComments, addCommentToTicket, updateTicket, deleteComment } from "@/lib/firebase/tickets";
import { getDepartmentsForOrganization } from "@/lib/firebase/departments";
import type { Ticket, Comment, Department } from "@/lib/types";
import { format, formatDistanceToNow } from 'date-fns';
import { useAuthListener } from "@/hooks/use-auth-listener";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { analyzeTicket, type AnalyzeTicketOutput } from "@/ai/flows/analyze-ticket-flow";


function AttachmentsList({ attachments }: { attachments: { name: string, url: string }[] }) {
    if (!attachments || attachments.length === 0) return null;
    return (
        <div className="mt-2 space-y-2">
            {attachments.map((file, index) => (
                <Button key={index} variant="outline" asChild size="sm" className="w-full justify-start h-auto py-1">
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <FileIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate text-left">{file.name}</span>
                    </a>
                </Button>
            ))}
        </div>
    );
}

export default function TicketDetailPage() {
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Dialog states
  const [isResolveDialogOpen, setIsResolveDialogOpen] = useState(false);
  const [isAiAssistOpen, setIsAiAssistOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<Comment | null>(null);


  // AI Assist states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AnalyzeTicketOutput | null>(null);

  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentAttachments, setCommentAttachments] = useState<File[]>([]);
  
  const { user, loading: userLoading } = useAuthListener();
  
  useEffect(() => {
    if (!ticketId) return;
    getTicketById(ticketId)
      .then(t => {
        setTicket(t);
        if (t?.orgId) {
            getDepartmentsForOrganization(t.orgId).then(setAllDepartments);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    const unsubscribe = subscribeToTicketComments(ticketId, setComments);
    return () => unsubscribe();
  }, [ticketId]);

  const canManage = user?.profile?.role === 'admin' || user?.profile?.role === 'supervisor';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      if (commentAttachments.length + e.target.files.length > 5) {
        toast.error('You can upload a maximum of 5 files per comment.');
        return;
      }
      setCommentAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setCommentAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !user?.profile || !ticket) return;

    setIsSending(true);
    const promise = addCommentToTicket(ticketId, user.uid, user.profile.name, newComment, commentAttachments)
        .then(() => {
            if (canManage && ticket.status === 'Open') {
                return updateTicket(ticketId, { status: 'In Progress' }).then(() => {
                     setTicket(prev => prev ? { ...prev, status: 'In Progress' } : null);
                });
            }
        });

    toast.promise(promise, {
        loading: 'Posting comment...',
        success: () => {
            setNewComment('');
            setCommentAttachments([]);
            return 'Comment posted!';
        },
        error: (err) => err.message || 'Could not post comment.'
    }).finally(() => {
        setIsSending(false);
    });
  }

  const handleUpdateTicketField = async (field: 'department', value: string) => {
    if (!ticket) return;
    
    setIsUpdating(true);
    toast.promise(updateTicket(ticketId, { [field]: value }), {
        loading: 'Updating ticket...',
        success: () => {
            setTicket(prev => prev ? { ...prev, [field]: value } : null);
            return `Ticket ${field} has been set to ${value}.`;
        },
        error: `Could not update ticket ${field}.`
    }).finally(() => {
        setIsUpdating(false);
    });
  }

  const handleResolveTicket = async (resolutionComment: string, resolutionAttachments: File[]) => {
    if (!ticket || !user?.profile) return;
    setIsUpdating(true);

    const promise = addCommentToTicket(ticketId, user.uid, user.profile.name, resolutionComment, resolutionAttachments)
        .then(() => updateTicket(ticketId, { status: 'Resolved' }));
    
    toast.promise(promise, {
        loading: "Resolving ticket...",
        success: () => {
            setTicket(prev => prev ? { ...prev, status: 'Resolved' } : null);
            setIsResolveDialogOpen(false);
            return 'Ticket successfully resolved.';
        },
        error: (err) => err.message || "Could not resolve the ticket."
    }).finally(() => {
        setIsUpdating(false);
    });
  }

    const handleDeleteComment = async () => {
        if (!commentToDelete || !ticket) return;
        setIsUpdating(true);
        toast.promise(deleteComment(ticket.id, commentToDelete.id), {
            loading: 'Deleting comment...',
            success: () => {
                setCommentToDelete(null);
                return 'Comment deleted.';
            },
            error: 'Could not delete comment.',
        }).finally(() => {
            setIsUpdating(false);
        });
    }

  const handleAiAssist = async () => {
    if (!ticket) return;
    setAiAnalysis(null);
    setIsAiAssistOpen(true);
    setIsAiLoading(true);

    try {
        const analysis = await analyzeTicket({
            title: ticket.title,
            description: ticket.description,
            comments: comments.map(c => ({ authorName: c.authorName, text: c.text })),
        });
        setAiAnalysis(analysis);
    } catch(err) {
        console.error("AI Assist failed:", err);
        toast.error("AI Assistant could not analyze the ticket.");
        setIsAiAssistOpen(false);
    } finally {
        setIsAiLoading(false);
    }
  }
  
  const userRole = user?.profile?.role;
  const isOwner = user?.uid === ticket?.reportedById;
  const canComment = ticket && (canManage || isOwner || (ticket.isPublic && user?.profile?.department === ticket.department));

  const backLink = userRole === 'employee' ? '/dashboard' : '/dashboard/tickets';
  const backLinkText = userRole === 'employee' ? 'Back to Dashboard' : 'Back to All Tickets';

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!ticket) {
    return (
       <div className="text-center">
         <h2 className="text-2xl font-bold">Ticket Not Found</h2>
         <p className="text-muted-foreground">The ticket you are looking for does not exist.</p>
         <Button variant="outline" size="sm" asChild className="mt-4">
           <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
         </Button>
       </div>
    )
  }
  
  const priorityColor = ticket.priority === 'High' || ticket.priority === 'Urgent' ? 'border-red-500 text-red-500 bg-red-50' : ticket.priority === 'Medium' ? 'border-yellow-500 text-yellow-500 bg-yellow-50' : 'border-gray-400 bg-gray-50';
  const statusConfig = {
    'Open': 'bg-primary/10 text-primary',
    'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'Resolved': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  const isTicketResolved = ticket.status === 'Resolved';
  const formDisabled = isSending || isUpdating || isTicketResolved;

  return (
    <div className="space-y-6">
        <div>
            <Button variant="outline" size="sm" asChild>
                <Link href={backLink}><ArrowLeft className="mr-2 h-4 w-4" /> {backLinkText}</Link>
            </Button>
        </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`w-fit mb-2 ${priorityColor}`}>{ticket.priority} Priority</Badge>
                <Badge className={statusConfig[ticket.status]}>{ticket.status}</Badge>
              </div>
              <CardTitle className="text-2xl font-headline pt-2">{ticket.title}</CardTitle>
              <CardDescription>Ticket ID: {ticket.id.toUpperCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/90 whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {comments.length > 0 ? (
                  comments.map((comment) => {
                    const isCurrentUser = comment.authorId === user?.uid;
                    const supervisedDepts = allDepartments.filter(d => d.supervisorId === user?.uid).map(d => d.name);
                    const canDelete = 
                        user?.profile?.role === 'admin' || 
                        isCurrentUser ||
                        (user?.profile?.role === 'supervisor' && ticket && supervisedDepts.includes(ticket.department));

                    return (
                        <div key={comment.id} className={cn("flex items-start gap-3 group/comment animate-chat-message-in", isCurrentUser && "flex-row-reverse")}>
                            <Avatar className="h-10 w-10 border">
                                <AvatarImage src={`https://avatar.vercel.sh/${comment.authorId}.png`} alt={comment.authorName} />
                                <AvatarFallback>{comment.authorName.substring(0, 2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div className={cn("w-full max-w-xl p-3 rounded-lg relative", isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                <div className={cn("flex items-center justify-between", isCurrentUser && "flex-row-reverse")}>
                                    <p className="font-semibold">{comment.authorName}</p>
                                    <p className={cn("text-xs", isCurrentUser ? "text-primary-foreground/80" : "text-muted-foreground")}>
                                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : ''}
                                    </p>
                                </div>
                                <p className={cn("text-sm mt-1 whitespace-pre-wrap", isCurrentUser ? "text-primary-foreground/90" : "text-foreground/90")}>{comment.text}</p>
                                <AttachmentsList attachments={comment.attachments || []} />

                                {canDelete && !isTicketResolved && (
                                     <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover/comment:opacity-100 data-[state=open]:opacity-100">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent>
                                            <DropdownMenuItem onClick={() => setCommentToDelete(comment)} className="text-destructive">Delete Comment</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        </div>
                    )
                  })
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No comments on this ticket yet.
                  </div>
                )}
            </CardContent>
            {canComment && !isTicketResolved && (
              <CardFooter className="flex-col items-start gap-2">
                  <div className="w-full relative">
                      <Textarea 
                        placeholder="Type your comment here..." 
                        className="pr-12 min-h-24" 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={formDisabled} />
                      <Button 
                        size="icon" 
                        className="absolute right-2.5 bottom-2.5 h-8 w-8" 
                        onClick={handleSendComment} 
                        disabled={formDisabled || !newComment.trim()}
                        >
                          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4"/>}
                          <span className="sr-only">Send Comment</span>
                      </Button>
                  </div>
                   <div className="w-full space-y-2">
                        <Label htmlFor="comment-attachments" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer w-fit">
                            <Paperclip className="h-4 w-4"/> Add Attachment(s)
                        </Label>
                        <Input id="comment-attachments" type="file" className="hidden" onChange={handleFileChange} multiple disabled={formDisabled} />
                        
                        {commentAttachments.length > 0 && (
                            <div className="space-y-1">
                                {commentAttachments.map((file, index) => (
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
                        )}
                    </div>
              </CardFooter>
            )}
          </Card>
        </div>
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Ticket Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><User className="w-4 h-4" /> Reported by</span>
                        <span className="font-medium">{ticket.reportedByName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><Shield className="w-4 h-4" /> Department</span>
                        <span className="font-medium">{ticket.department}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><ListCollapse className="w-4 h-4" /> Category</span>
                        <span className="font-medium">{ticket.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground flex items-center gap-2"><Clock className="w-4 h-4" /> Created</span>
                        <span className="font-medium">{ticket.createdAt ? format(ticket.createdAt.toDate(), 'PPP') : 'N/A'}</span>
                    </div>
                </CardContent>
                {canManage && (
                  <>
                    <Separator />
                    <CardFooter className="pt-4 flex flex-col gap-2">
                         <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => setIsResolveDialogOpen(true)} disabled={formDisabled || isTicketResolved}>
                            {isTicketResolved ? 'Ticket Resolved' : 'Mark as Resolved...'}
                        </Button>
                         <Button variant="outline" className="w-full" onClick={handleAiAssist} disabled={formDisabled}>
                            <Sparkles className="mr-2 h-4 w-4" /> AI Assist
                        </Button>
                    </CardFooter>
                  </>
                )}
            </Card>
            {canManage && !isTicketResolved && (
                 <Card>
                    <CardHeader>
                        <CardTitle>Manage Ticket</CardTitle>
                        <CardDescription>Re-assign the ticket to a different department if it's miscategorized.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Label htmlFor="reassign-dept">Change Department</Label>
                        <Select
                            value={ticket.department}
                            onValueChange={(value) => handleUpdateTicketField('department', value)}
                            disabled={formDisabled || isUpdating}
                        >
                            <SelectTrigger id="reassign-dept" className="mt-2">
                                <SelectValue placeholder="Select a department" />
                            </SelectTrigger>
                            <SelectContent>
                                {allDepartments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.name}>{dept.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                 </Card>
            )}
             <Card>
                <CardHeader>
                    <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                    <AttachmentsList attachments={ticket.attachments || []} />
                    {(!ticket.attachments || ticket.attachments.length === 0) && (
                         <div className="text-sm text-muted-foreground text-center py-4">No attachments for this ticket.</div>
                    )}
                </CardContent>
            </Card>
        </div>
      </div>

       <ResolveTicketDialog 
            open={isResolveDialogOpen} 
            onOpenChange={setIsResolveDialogOpen}
            isSubmitting={isUpdating}
            onSubmit={handleResolveTicket}
        />
        <AiAssistDialog
            open={isAiAssistOpen}
            onOpenChange={setIsAiAssistOpen}
            isLoading={isAiLoading}
            analysis={aiAnalysis}
            onUseReply={(reply) => {
                setNewComment(reply);
                setIsAiAssistOpen(false);
            }}
        />
        <AlertDialog open={!!commentToDelete} onOpenChange={() => setCommentToDelete(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this comment.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteComment} disabled={isUpdating} className="bg-destructive hover:bg-destructive/90">
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Delete
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}


interface ResolveTicketDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isSubmitting: boolean;
    onSubmit: (comment: string, attachments: File[]) => void;
}

function ResolveTicketDialog({ open, onOpenChange, isSubmitting, onSubmit }: ResolveTicketDialogProps) {
    const [comment, setComment] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    
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

    const handleSubmit = () => {
        if (!comment) {
            toast.error("Please provide a resolution comment.");
            return;
        }
        onSubmit(comment, attachments);
    }
    
    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setComment('');
            setAttachments([]);
        }
    }, [open]);
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Resolve Ticket</DialogTitle>
                    <DialogDescription>
                        Add a final comment and attach any relevant files to confirm the resolution. The user will be notified.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="resolution-comment">Resolution Comment</Label>
                        <Textarea 
                            id="resolution-comment" 
                            placeholder="Describe how the issue was resolved..."
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            disabled={isSubmitting}
                            className="min-h-[120px]"
                        />
                    </div>
                    <div className="space-y-2">
                         <Label htmlFor="resolution-attachments" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary cursor-pointer w-fit">
                            <Paperclip className="h-4 w-4"/> Add Resolution File(s)
                        </Label>
                        <Input id="resolution-attachments" type="file" className="hidden" onChange={handleFileChange} multiple disabled={isSubmitting} />
                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                                {attachments.map((file, index) => (
                                    <Badge key={index} variant="secondary" className="pl-2">
                                        <FileIcon className="h-3 w-3 mr-1" />
                                        {file.name}
                                        <button type="button" onClick={() => removeAttachment(index)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5" disabled={isSubmitting}>
                                            <XCircle className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="ghost" disabled={isSubmitting}>Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleSubmit} disabled={isSubmitting || !comment} className="bg-green-600 hover:bg-green-700">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Resolution
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface AiAssistDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    isLoading: boolean;
    analysis: AnalyzeTicketOutput | null;
    onUseReply: (reply: string) => void;
}

function AiAssistDialog({ open, onOpenChange, isLoading, analysis, onUseReply }: AiAssistDialogProps) {

    const handleCopyAndUse = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard!");
        onUseReply(text);
    }

    return (
         <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        AI Ticket Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Here's an AI-powered analysis of the ticket. Use this information to help resolve the issue faster.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[60vh] overflow-y-auto pr-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-muted-foreground">Analyzing ticket, please wait...</p>
                        </div>
                    ) : analysis ? (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-lg mb-2">Summary</h3>
                                <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">{analysis.summary}</p>
                            </div>
                             <div>
                                <h3 className="font-semibold text-lg mb-2">Analysis</h3>
                                <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">{analysis.analysis}</p>
                            </div>
                             <div>
                                <h3 className="font-semibold text-lg mb-2">Suggested Reply</h3>
                                <div className="relative">
                                    <Textarea
                                        readOnly
                                        value={analysis.suggestedReply}
                                        className="min-h-[150px] bg-secondary text-sm text-muted-foreground pr-12"
                                    />
                                    <Button size="sm" variant="ghost" className="absolute top-2 right-2" onClick={() => handleCopyAndUse(analysis.suggestedReply)}>
                                        Copy & Use
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
