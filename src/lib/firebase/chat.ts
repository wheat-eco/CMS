
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  orderBy,
  onSnapshot,
  writeBatch,
  setDoc,
  getDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore';
import { db } from './config';
import type { ChatRoom, ChatMessage, UserProfile, Attachment } from '../types';
import { getUserProfile } from './firestore';
import { uploadFile } from './storage';

// Gets a reference to the chatRooms collection
const chatRoomsCollection = collection(db, 'chatRooms');

/**
 * Creates or retrieves a chat room between two users.
 * @param uid1 - The UID of the first user.
 * @param uid2 - The UID of the second user.
 * @returns The ID of the chat room.
 */
export async function createOrGetChatRoom(uid1: string, uid2: string): Promise<string> {
  const participants = [uid1, uid2].sort();
  const roomId = participants.join('_');
  const roomRef = doc(db, 'chatRooms', roomId);
  
  const roomSnap = await getDoc(roomRef);

  if (!roomSnap.exists()) {
    const user1Profile = await getUserProfile(uid1);
    const user2Profile = await getUserProfile(uid2);

    if (!user1Profile || !user2Profile) {
        throw new Error("One or both user profiles not found.");
    }

    await setDoc(roomRef, {
      participantUids: participants,
      createdAt: serverTimestamp(),
      // We don't store participant profiles here anymore to avoid stale data.
      // We'll fetch them live in the UI.
    });
  }
  
  return roomId;
}

/**
 * Sends a message in a chat room.
 * @param roomId - The ID of the chat room.
 * @param senderId - The UID of the message sender.
 * @param text - The message content.
 * @param attachments - An array of files to attach to the message.
 */
export async function sendMessage(roomId: string, senderId: string, text: string, attachments: File[] = []) {
  const roomRef = doc(db, 'chatRooms', roomId);
  const messagesCollection = collection(roomRef, 'messages');
  const newMessageRef = doc(messagesCollection); // Generate ID upfront
  
  let attachmentUrls: Attachment[] = [];
  if (attachments.length > 0) {
    const uploadPromises = attachments.map(file => {
      const path = `chats/${roomId}/${newMessageRef.id}/${file.name}`;
      return uploadFile(file, path);
    });
    attachmentUrls = await Promise.all(uploadPromises);
  }

  await setDoc(newMessageRef, { // Use setDoc with the pre-generated ref
    text,
    senderId,
    timestamp: serverTimestamp(),
    attachments: attachmentUrls,
  });

  // Update the lastMessage on the room for sorting and previews
  let lastMessageText = text;
  if (attachmentUrls.length > 0 && !text) {
      lastMessageText = `${attachmentUrls.length} attachment(s)`;
  } else if (attachmentUrls.length > 0 && text) {
      lastMessageText = `${text}`;
  }

  return await updateDoc(roomRef, {
    lastMessage: { 
        text: lastMessageText, 
        senderId, 
        timestamp: serverTimestamp() 
    },
  });
}


/**
 * Subscribes to the chat rooms for a specific user.
 * @param userId - The UID of the user.
 * @param callback - The function to call with the updated list of chat rooms.
 * @returns Unsubscribe function.
 */
export function subscribeToUserChatRooms(userId: string, callback: (chatRooms: ChatRoom[]) => void) {
  const q = query(
    chatRoomsCollection,
    where('participantUids', 'array-contains', userId),
    orderBy('lastMessage.timestamp', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const rooms = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ChatRoom));
    callback(rooms);
  });
}

/**
 * Subscribes to messages within a specific chat room.
 * @param roomId - The ID of the chat room.
 * @param callback - The function to call with the updated list of messages.
 * @returns Unsubscribe function.
 */
export function subscribeToMessages(roomId: string, callback: (messages: ChatMessage[]) => void) {
  const messagesCollection = collection(db, 'chatRooms', roomId, 'messages');
  const q = query(messagesCollection, orderBy('timestamp', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    } as ChatMessage));
    callback(messages);
  });
}
