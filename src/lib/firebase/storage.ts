
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';
import type { Attachment } from '../types';

/**
 * Uploads a single file to a specified path in Firebase Storage.
 * @param file The file to upload.
 * @param path The full path in storage where the file should be saved (e.g., `tickets/ticketId/filename.jpg`).
 * @returns A promise that resolves with an Attachment object containing the file name and its public URL.
 */
export async function uploadFile(file: File, path: string): Promise<Attachment> {
    const storageRef = ref(storage, path);
    
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
        name: file.name,
        url: downloadURL,
    };
}
