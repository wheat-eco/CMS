
'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useChat } from '@/hooks/use-chat';
import { useAuthListener } from '@/hooks/use-auth-listener';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, X, ArrowLeft, Loader2, Search, Paperclip, File as FileIcon, XCircle, Sparkles } from 'lucide-react';
import { subscribeToUserChatRooms, createOrGetChatRoom, subscribeToMessages, sendMessage } from '@/lib/firebase/chat';
import { subscribeToOrganizationUsers } from '@/lib/firebase/firestore';
import type { ChatRoom, ChatMessage, UserProfile, Attachment } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNowStrict, isToday, isYesterday } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import toast from 'react-hot-toast';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import type { Timestamp } from 'firebase/firestore';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { motion } from 'framer-motion';


function formatPreciseTimestamp(ts: Timestamp | undefined): string {
    if (!ts) return '';
    const date = ts.toDate();
    if (isToday(date)) {
        return format(date, 'p'); // "4:30 PM"
    }
    if (isYesterday(date)) {
        return `Yesterday at ${format(date, 'p')}`;
    }
    return format(date, 'MMM d, p'); // "Mar 15, 4:30 PM"
}

function getUserStatus(lastSeen?: Timestamp): { status: 'Online' | string, color: 'text-green-500' | 'text-muted-foreground' } {
    if (!lastSeen) {
        return { status: 'Offline', color: 'text-muted-foreground' };
    }
    const now = new Date();
    const lastSeenDate = lastSeen.toDate();
    const diffInMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);

    if (diffInMinutes < 3) {
        return { status: 'Online', color: 'text-green-500' };
    }
    
    return { status: `Last seen ${formatDistanceToNowStrict(lastSeenDate, { addSuffix: true })}`, color: 'text-muted-foreground' };
}


export function ChatWidget() {
    const { isChatOpen, toggleChat } = useChat();

    return (
        <>
            <Button
                variant="default"
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg z-40 flex items-center justify-center"
                onClick={toggleChat}
                aria-label="Toggle Chat"
            >
                {isChatOpen ? <X className="h-8 w-8" /> : <MessageSquare className="h-8 w-8" />}
            </Button>
            <Sheet open={isChatOpen} onOpenChange={toggleChat}>
                <SheetContent className="w-full sm:max-w-md p-0 flex flex-col" side="right">
                    <ChatContainer />
                </SheetContent>
            </Sheet>
        </>
    );
}

function ChatContainer() {
    const { activeChatRoomId } = useChat();

    return (
        <>
            <SheetHeader className="p-4 border-b">
                <SheetTitle>Messenger</SheetTitle>
                <SheetDescription>Chat with members of your organization.</SheetDescription>
            </SheetHeader>
            <div className="flex-1 min-h-0">
                {activeChatRoomId ? <ChatMessageView /> : <ChatListView />}
            </div>
        </>
    );
}

function ChatListView() {
    const { user } = useAuthListener();
    const { setActiveChatRoomId } = useChat();
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreatingChat, setIsCreatingChat] = useState(false);
    const [view, setView] = useState<'chats' | 'new'>('chats');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user?.profile) return;
        setLoading(true);
        const unsubRooms = subscribeToUserChatRooms(user.uid, (rooms) => {
            setChatRooms(rooms);
            setLoading(false);
        });
        
        const unsubUsers = subscribeToOrganizationUsers(user.profile.orgId, (users) => {
            setAllUsers(users.filter(u => u.uid !== user.uid)); // Exclude self
        });

        return () => {
            unsubRooms();
            unsubUsers();
        };
    }, [user]);

    const handleStartChat = async (otherUserId: string) => {
        if (!user) return;
        setIsCreatingChat(true);
        try {
            const roomId = await createOrGetChatRoom(user.uid, otherUserId);
            setActiveChatRoomId(roomId);
        } catch (error) {
            console.error("Error creating chat room:", error);
            toast.error("Could not start chat.");
        } finally {
            setIsCreatingChat(false);
            setView('chats');
        }
    };
    
    const filteredUsers = useMemo(() => {
        return allUsers.filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [allUsers, searchTerm]);
    
    if (loading) {
        return (
            <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }
    
    if (view === 'new') {
        return (
            <div className="flex flex-col h-full">
                <div className="p-2 border-b flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setView('chats')}><ArrowLeft/></Button>
                    <div className="relative w-full">
                       <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                       <Input placeholder="Search for a person..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    {isCreatingChat && <div className="p-4 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                    {filteredUsers.map(u => {
                         const { status } = getUserStatus(u.lastSeen);
                         const isOnline = status === 'Online';
                         
                         let displayName = u.name;
                         if (user?.profile?.role === 'employee' && (u.role === 'admin' || u.role === 'supervisor')) {
                            displayName = u.role.charAt(0).toUpperCase() + u.role.slice(1);
                         }

                         return (
                            <div key={u.uid} className="flex items-center gap-3 p-3 hover:bg-accent cursor-pointer" onClick={() => handleStartChat(u.uid)}>
                                <div className="relative">
                                    <Avatar>
                                        <AvatarImage src={`https://avatar.vercel.sh/${u.uid}.png`} />
                                        <AvatarFallback>{u.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    {isOnline && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>}
                                </div>
                                <span className="font-medium">{displayName}</span>
                            </div>
                        )
                    })}
                </ScrollArea>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="p-4">
                <Button className="w-full" onClick={() => setView('new')}>Start New Chat</Button>
            </div>
            <ScrollArea className="flex-1">
                {chatRooms.length > 0 ? chatRooms.map(room => {
                    const otherParticipantUid = room.participantUids.find(uid => uid !== user?.uid) || '';
                    const otherParticipantProfile = allUsers.find(u => u.uid === otherParticipantUid);

                    let displayName = otherParticipantProfile?.name || '...';
                    if (user?.profile?.role === 'employee' && otherParticipantProfile && (otherParticipantProfile.role === 'admin' || otherParticipantProfile.role === 'supervisor')) {
                        displayName = otherParticipantProfile.role.charAt(0).toUpperCase() + otherParticipantProfile.role.slice(1);
                    }

                    return (
                        <div key={room.id} className="flex items-center gap-4 p-3 hover:bg-accent cursor-pointer" onClick={() => setActiveChatRoomId(room.id)}>
                             <div className="relative">
                                <Avatar>
                                    <AvatarImage src={`https://avatar.vercel.sh/${otherParticipantUid}.png`} />
                                    <AvatarFallback>{otherParticipantProfile?.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                {getUserStatus(otherParticipantProfile?.lastSeen).status === 'Online' && (
                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                                )}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex justify-between items-baseline">
                                    <p className="font-semibold truncate">{displayName}</p>
                                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                                        {formatPreciseTimestamp(room.lastMessage?.timestamp)}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{room.lastMessage?.text}</p>
                            </div>
                        </div>
                    )
                }) : <p className="p-4 text-center text-muted-foreground">No conversations yet.</p>}
            </ScrollArea>
        </div>
    );
}


function ChatMessageView() {
    const { user } = useAuthListener();
    const { activeChatRoomId, setActiveChatRoomId } = useChat();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [otherParticipant, setOtherParticipant] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [newMessage, setNewMessage] = useState('');
    const [attachments, setAttachments] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        if (!activeChatRoomId) return;

        setLoading(true);

        const unsubMessages = subscribeToMessages(activeChatRoomId, setMessages);

        const fetchOtherUserInfo = async () => {
            try {
                const roomDoc = await getDoc(doc(db, 'chatRooms', activeChatRoomId));
                if (roomDoc.exists()) {
                    const roomData = roomDoc.data() as ChatRoom;
                    const otherUid = roomData.participantUids.find(uid => uid !== user?.uid);
                    if (otherUid) {
                        const unsubUser = onSnapshot(doc(db, 'users', otherUid), (userDoc) => {
                             if (userDoc.exists()) {
                                setOtherParticipant({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
                            }
                        });
                        setLoading(false);
                        return unsubUser;
                    }
                }
            } catch (error) {
                console.error("Failed to fetch other user's info", error);
                setLoading(false);
            }
            return () => {};
        };
        
        let unsubUser: () => void;
        fetchOtherUserInfo().then(unsub => { unsubUser = unsub });

        return () => {
            unsubMessages();
            if (unsubUser) unsubUser();
        };

    }, [activeChatRoomId, user?.uid]);


    useEffect(() => {
        if (scrollViewportRef.current) {
            scrollViewportRef.current.scrollTo({ top: scrollViewportRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
          if (attachments.length + e.target.files.length > 5) {
            toast.error('You can upload a maximum of 5 files per message.');
            return;
          }
          setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };
    
    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendMessage = async () => {
        if ((!newMessage.trim() && attachments.length === 0) || !user || !activeChatRoomId) return;
        setIsSending(true);
        try {
            await sendMessage(activeChatRoomId, user.uid, newMessage, attachments);
            setNewMessage('');
            setAttachments([]);
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Could not send message.");
        } finally {
            setIsSending(false);
        }
    };

    const isSendDisabled = isSending || (!newMessage.trim() && attachments.length === 0);

    const { status: userStatus, color: statusColor } = getUserStatus(otherParticipant?.lastSeen);

    const displayName = React.useMemo(() => {
        if (!user?.profile || !otherParticipant) return otherParticipant?.name || '';
        if (user.profile.role === 'employee' && (otherParticipant.role === 'admin' || otherParticipant.role === 'supervisor')) {
            return otherParticipant.role.charAt(0).toUpperCase() + otherParticipant.role.slice(1);
        }
        return otherParticipant.name;
    }, [user, otherParticipant]);


    return (
        <div className="flex flex-col h-full">
            <div className="p-2 border-b flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setActiveChatRoomId(null)}><ArrowLeft/></Button>
                 {loading ? (
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="space-y-1.5">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ) : otherParticipant && (
                    <div className="flex items-center gap-2">
                         <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://avatar.vercel.sh/${otherParticipant.uid}.png`} />
                            <AvatarFallback>{otherParticipant.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold leading-tight">{displayName}</h3>
                             <p className={cn("text-xs", statusColor)}>{userStatus}</p>
                        </div>
                    </div>
                )}
            </div>
            <ScrollArea className="flex-1 p-4" viewportRef={scrollViewportRef}>
                 <div className="space-y-4">
                    {messages.map(msg => {
                        const isCurrentUser = msg.senderId === user?.uid;
                        return (
                             <motion.div 
                                key={msg.id} 
                                className={cn("flex items-end gap-2", isCurrentUser && "justify-end")}
                                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.3, ease: 'easeOut' }}
                             >
                                {!isCurrentUser && (
                                     <Avatar className="h-8 w-8">
                                        <AvatarImage src={`https://avatar.vercel.sh/${msg.senderId}.png`} />
                                        <AvatarFallback>U</AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-xs rounded-lg px-3 py-2", isCurrentUser ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                                    {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                                    {msg.attachments && msg.attachments.length > 0 && <ChatAttachments attachments={msg.attachments} />}
                                    <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground", !isCurrentUser && msg.text && 'text-right')}>
                                        {formatPreciseTimestamp(msg.timestamp)}
                                    </p>
                                </div>
                             </motion.div>
                        )
                    })}
                 </div>
            </ScrollArea>
            <div className="p-2 border-t bg-background">
                {attachments.length > 0 && (
                     <div className="p-2 space-y-2">
                        {attachments.map((file, index) => (
                            <Badge key={index} variant="secondary" className="pl-2">
                                <FileIcon className="h-3 w-3 mr-1" />
                                <span className='max-w-40 truncate'>{file.name}</span>
                                <button type="button" onClick={() => removeAttachment(index)} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5" disabled={isSending}>
                                    <XCircle className="h-3 w-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                )}
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                    <Input 
                        value={newMessage} 
                        onChange={(e) => setNewMessage(e.target.value)} 
                        placeholder="Type a message..."
                        disabled={isSending}
                    />
                     <Button type="button" size="icon" variant="ghost" asChild>
                         <Label htmlFor="chat-attachment" className="cursor-pointer">
                            <Paperclip className="h-4 w-4" />
                            <span className="sr-only">Add attachment</span>
                         </Label>
                    </Button>
                    <Input id="chat-attachment" type="file" className="hidden" onChange={handleFileChange} multiple disabled={isSending} />
                    <Button type="submit" size="icon" disabled={isSendDisabled}>
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}

function ChatAttachments({ attachments }: { attachments: Attachment[] }) {
    return (
        <div className="mt-2 space-y-2">
            {attachments.map((file, index) => (
                <Button key={index} variant="secondary" asChild size="sm" className="w-full justify-start h-auto py-1.5 bg-background/20 hover:bg-background/40">
                    <a href={file.url} target="_blank" rel="noopener noreferrer">
                        <FileIcon className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate text-left">{file.name}</span>
                    </a>
                </Button>
            ))}
        </div>
    );
}


