
import type { Timestamp } from "firebase/firestore";
import type { NotificationInput as GenkitNotificationInput } from "@/ai/flows/generate-notification-email-flow";

export type NotificationInput = GenkitNotificationInput;


export interface UserProfile {
    uid: string;
    email: string;
    name: string;
    phone?: string;
    role: 'admin' | 'supervisor' | 'employee';
    orgId: string;
    status: 'active' | 'pending' | 'inactive';
    department?: string;
    createdAt: Timestamp;
    lastSeen?: Timestamp;
    notificationPreferences?: {
        ticketUpdates?: boolean;
        newComments?: boolean;
        userApprovals?: boolean;
    };
}

export interface Organization {
    id: string;
    name: string;
    theme?: string;
    smtp?: {
        host: string;
        port: string;
        user: string;
        pass: string;
    }
}

export interface Department {
    id: string;
    name: string;
    supervisorId?: string;
    supervisorName?: string;
}

export interface Category {
    id: string;
    name: string;
    description: string;
}

export interface Attachment {
    name: string;
    url: string;
}

export interface Ticket {
    id:string;
    title: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Open' | 'In Progress' | 'Resolved';
    isPublic: boolean;
    attachments: Attachment[];
    
    orgId: string;
    department: string;
    category: string;
    
    reportedById: string;
    reportedByName: string;

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface Comment {
    id: string;
    text: string;
    authorId: string;
    authorName:string;
    createdAt: Timestamp;
    attachments?: Attachment[];
}

export interface Notification {
    id: string;
    userId: string;
    iconName: 'messageSquare' | 'checkCircle' | 'userPlus' | 'shieldAlert' | 'userCheck' | 'bell';
    title: string;
    description: string;
    link: string;
    createdAt: Timestamp;
    read: boolean;
}

export interface EmailLog {
    id: string;
    to: string;
    subject: string;
    status: 'success' | 'failure';
    error?: string;
    sentAt: Timestamp;
}

export interface ChatRoom {
    id: string;
    participantUids: string[];
    lastMessage: {
        text: string;
        senderId: string;
        timestamp: Timestamp;
    } | null;
}

export interface ChatMessage {
    id: string;
    text: string;
    senderId: string;
    timestamp: Timestamp;
    attachments?: Attachment[];
}
