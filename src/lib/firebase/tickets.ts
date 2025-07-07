
import {
  addDoc,
  collection,
  doc,
  getDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
  updateDoc,
  Timestamp,
  onSnapshot,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./config";
import type { Ticket, Comment, Attachment } from "../types";
import { uploadFile } from "./storage";
import { createNotification } from "./notifications";

const ticketsCollection = collection(db, "tickets");

type CreateTicketData = Omit<Ticket, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'attachments'> & {
    attachments?: File[];
};

export async function createTicket(ticketData: CreateTicketData): Promise<string> {
  if (!ticketData.orgId || !ticketData.department) {
      throw new Error("User organization or department is not defined.");
  }
  
  const newTicketRef = doc(ticketsCollection);
  
  let attachmentUrls: Attachment[] = [];

  // Handle file uploads first
  if (ticketData.attachments && ticketData.attachments.length > 0) {
    try {
        const uploadPromises = ticketData.attachments.map(file => {
            const path = `tickets/${newTicketRef.id}/${file.name}`;
            return uploadFile(file, path);
        });
        attachmentUrls = await Promise.all(uploadPromises);
    } catch (error) {
        console.error("Failed to upload attachments:", error);
        // Throw a user-friendly error
        throw new Error("One or more file uploads failed. Please check file types and sizes and try again.");
    }
  }

  // Once uploads are successful (or if there are no attachments), create the ticket document
  const newTicket: Omit<Ticket, 'id'> = {
    title: ticketData.title,
    description: ticketData.description,
    priority: ticketData.priority,
    status: 'Open' as const,
    isPublic: ticketData.isPublic,
    attachments: attachmentUrls, // Save the array of URLs and names
    orgId: ticketData.orgId,
    department: ticketData.department,
    category: ticketData.category,
    reportedById: ticketData.reportedById,
    reportedByName: ticketData.reportedByName,
    createdAt: serverTimestamp() as Timestamp, // Use serverTimestamp for creation
    updatedAt: serverTimestamp() as Timestamp, // and update
  };

  await setDoc(newTicketRef, newTicket);

  // After ticket is created, notify the supervisor(s) of the department
  try {
    const deptRef = collection(db, "organizations", ticketData.orgId, "departments");
    const q = query(deptRef, where("name", "==", ticketData.department));
    const deptSnapshot = await getDocs(q);

    if (!deptSnapshot.empty) {
        const dept = deptSnapshot.docs[0].data();
        if (dept.supervisorId) {
            await createNotification(dept.supervisorId, ticketData.orgId, {
                notificationType: 'ticketCreated',
                ticketId: newTicketRef.id,
                ticketTitle: newTicket.title,
                userName: dept.supervisorName || 'Supervisor',
                orgName: ticketData.orgId,
            });
        }
    }
  } catch (error) {
      console.error("Failed to create supervisor notification for new ticket:", error);
      // Don't block ticket creation if notification fails
  }

  return newTicketRef.id;
}


export async function getUserTickets(userId: string): Promise<Ticket[]> {
    const q = query(
        ticketsCollection, 
        where("reportedById", "==", userId), 
        orderBy("createdAt", "desc"), 
        limit(10)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
}

export async function getDepartmentPublicTickets(orgId: string, department: string): Promise<Ticket[]> {
    const q = query(
        ticketsCollection,
        where("orgId", "==", orgId),
        where("department", "==", department),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(10)
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
    const ticketRef = doc(db, "tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);
    if (ticketSnap.exists()) {
        const data = ticketSnap.data();
        // Ensure timestamps are correctly handled
        return { 
            id: ticketSnap.id, 
            ...data,
            createdAt: data.createdAt as Timestamp,
            updatedAt: data.updatedAt as Timestamp,
        } as Ticket;
    }
    return null;
}

export function subscribeToOrganizationTickets(orgId: string, callback: (tickets: Ticket[]) => void) {
     const q = query(
        ticketsCollection, 
        where("orgId", "==", orgId),
        orderBy("createdAt", "desc")
     );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const tickets = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt as Timestamp,
                updatedAt: data.updatedAt as Timestamp,
            } as Ticket;
        });
        callback(tickets);
    });

    return unsubscribe;
}

export async function updateTicket(ticketId: string, data: Partial<Omit<Ticket, 'id'>>) {
    const ticketRef = doc(db, "tickets", ticketId);
    const ticketSnap = await getDoc(ticketRef);
    if (!ticketSnap.exists()) {
        throw new Error("Ticket not found");
    }
    const originalTicket = ticketSnap.data() as Ticket;

    // Notify new supervisor if department changes
    if (data.department && data.department !== originalTicket.department) {
        try {
            const deptRef = collection(db, "organizations", originalTicket.orgId, "departments");
            const q = query(deptRef, where("name", "==", data.department));
            const deptSnapshot = await getDocs(q);

            if (!deptSnapshot.empty) {
                const dept = deptSnapshot.docs[0].data();
                if (dept.supervisorId && dept.supervisorId !== originalTicket.reportedById) {
                    await createNotification(dept.supervisorId, originalTicket.orgId, {
                        notificationType: 'ticketAssigned',
                        ticketId: ticketId,
                        ticketTitle: originalTicket.title,
                        userName: dept.supervisorName || 'Supervisor',
                        orgName: originalTicket.orgId,
                    });
                }
            }
        } catch (error) {
            console.error("Failed to create supervisor notification for reassigned ticket:", error);
        }
    }

    // Update the document
    await updateDoc(ticketRef, { ...data, updatedAt: serverTimestamp() });
    
    // Notify user if ticket is resolved
    if (data.status === 'Resolved' && originalTicket.status !== 'Resolved') {
        await createNotification(originalTicket.reportedById, originalTicket.orgId, {
            notificationType: 'ticketResolved',
            ticketId: ticketId,
            ticketTitle: originalTicket.title,
            userName: originalTicket.reportedByName,
            orgName: originalTicket.orgId,
        });
    }
}

export async function addCommentToTicket(
    ticketId: string, 
    authorId: string, 
    authorName: string, 
    text: string,
    attachments: File[] = []
) {
    const commentsCollection = collection(db, "tickets", ticketId, "comments");
    const newCommentRef = doc(commentsCollection);

    let attachmentUrls: Attachment[] = [];
    if (attachments.length > 0) {
        try {
            const uploadPromises = attachments.map(file => {
                const path = `comments/${ticketId}/${newCommentRef.id}/${file.name}`;
                return uploadFile(file, path);
            });
            attachmentUrls = await Promise.all(uploadPromises);
        } catch (error) {
            console.error("Failed to upload comment attachments:", error);
            throw new Error("Could not upload comment attachments. Please try again.");
        }
    }
    
    await setDoc(newCommentRef, {
        authorId,
        authorName,
        text,
        attachments: attachmentUrls,
        createdAt: serverTimestamp(),
    });
    
    // Notify the ticket owner that a new comment has been added, if they are not the author
    const ticket = await getTicketById(ticketId);
    if (ticket && ticket.reportedById !== authorId) {
        await createNotification(ticket.reportedById, ticket.orgId, {
            notificationType: 'ticketComment',
            ticketId: ticket.id,
            ticketTitle: ticket.title,
            commenterName: authorName,
            userName: ticket.reportedByName,
            orgName: ticket.orgId,
        });
    }
}

export async function deleteComment(ticketId: string, commentId: string) {
    const commentRef = doc(db, "tickets", ticketId, "comments", commentId);
    await deleteDoc(commentRef);
}

// This function will return an unsubscribe function for real-time listening
export function subscribeToTicketComments(ticketId: string, callback: (comments: Comment[]) => void) {
    const commentsCollection = collection(db, "tickets", ticketId, "comments");
    const q = query(commentsCollection, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const comments = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt as Timestamp
        } as Comment));
        callback(comments);
    });

    return unsubscribe;
}

    