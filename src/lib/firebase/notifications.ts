import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  orderBy,
  getDocs,
  writeBatch,
  getDoc,
  doc,
} from "firebase/firestore";
import { db } from "./config";
import type { Notification, NotificationInput, UserProfile } from "../types";
import { generateNotificationEmail } from "@/ai/flows/generate-notification-email-flow";
import { getOrganizationById } from "./organizations";
import { sendEmail } from "../mailer";

// Create a notification document in Firestore
export async function createNotification(userId: string, orgId: string, input: NotificationInput) {
    const notificationsCollection = collection(db, "users", userId, "notifications");
    
    // Fetch user and org details for the email content
    const userDoc = await getDoc(doc(db, "users", userId));
    const userProfile = userDoc.data() as UserProfile;
    const org = await getOrganizationById(orgId);

    if (!userProfile || !org) {
        console.error("Could not find user or org for notification");
        return;
    }

    // Attempt to generate AI email content but allow graceful failure
    try {
        const shouldSendEmail = userProfile.notificationPreferences?.[
            input.notificationType === 'newUserPending' ? 'userApprovals' :
            input.notificationType === 'ticketComment' ? 'newComments' :
            'ticketUpdates' // Default for ticket created, resolved, etc.
        ] ?? false;

        if (shouldSendEmail && process.env.GEMINI_API_KEY) {
             const emailContent = await generateNotificationEmail({
                ...input,
                userName: userProfile.name,
                orgName: org.name,
            });
            
            // Send the email using the new mailer utility
            await sendEmail(userProfile.email, emailContent.subject, emailContent.body, orgId);
        }
       
    } catch(e) {
        console.error("AI email generation failed. This might be due to a missing or invalid Gemini API key. Proceeding with in-app notification only.", e);
    }

    // Always create the in-app notification
    try {
        let title = '';
        let description = '';
        let link = '/dashboard/notifications'; // default link
        let icon: Notification['iconName'] = 'bell';

        switch (input.notificationType) {
            case 'ticketCreated':
                title = `New Ticket: "${input.ticketTitle}"`;
                description = `A new ticket has been created in your department.`;
                link = `/dashboard/tickets/${input.ticketId}`;
                icon = 'shieldAlert';
                break;
            case 'ticketComment':
                title = `New Comment on "${input.ticketTitle}"`;
                description = `${input.commenterName} added a new comment.`;
                link = `/dashboard/tickets/${input.ticketId}`;
                icon = 'messageSquare';
                break;
            case 'ticketResolved':
                title = `Ticket Resolved: "${input.ticketTitle}"`;
                description = `Your ticket has been marked as resolved.`;
                link = `/dashboard/tickets/${input.ticketId}`;
                icon = 'checkCircle';
                break;
            case 'userApproved':
                title = 'Account Approved';
                description = 'Your account has been approved. Welcome aboard!';
                link = '/dashboard';
                icon = 'userPlus';
                break;
            case 'newUserPending':
                title = 'New User Pending Approval';
                description = `${input.newUserName} has registered and is awaiting approval.`;
                link = '/dashboard/admin/users';
                icon = 'userCheck';
                break;
            case 'ticketAssigned':
                title = `Ticket Assigned: "${input.ticketTitle}"`;
                description = `A ticket has been assigned to your department.`;
                link = `/dashboard/tickets/${input.ticketId}`;
                icon = 'shieldAlert';
                break;
            case 'userProfileUpdated':
                title = 'Your Profile Was Updated';
                description = 'An administrator has updated your role or department.';
                link = '/dashboard/settings';
                icon = 'userCheck';
                break;
        }

        await addDoc(notificationsCollection, {
            userId,
            title,
            description,
            link,
            iconName: icon,
            read: false,
            createdAt: serverTimestamp(),
        });
    } catch(e) {
        console.error("Failed to create in-app notification document", e);
    }
}


// Subscribe to real-time updates for notifications
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void
) {
  const notificationsCollection = collection(db, "users", userId, "notifications");
  const q = query(notificationsCollection, orderBy("createdAt", "desc"));

  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const notifications = querySnapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
        } as Notification)
    );
    callback(notifications);
  });

  return unsubscribe;
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string) {
    const notificationsCollection = collection(db, "users", userId, "notifications");
    const q = query(notificationsCollection, where("read", "==", false));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) return;

    const batch = writeBatch(db);
    querySnapshot.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });

    await batch.commit();
}
