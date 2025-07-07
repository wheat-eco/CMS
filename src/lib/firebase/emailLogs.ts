import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import type { EmailLog } from "../types";

const getEmailLogCollection = (orgId: string) => {
  return collection(db, "organizations", orgId, "email_logs");
};

/**
 * Creates a log entry for an email that was sent or attempted.
 * @param orgId The organization ID.
 * @param logData The data for the email log.
 */
export async function logEmail(orgId: string, logData: Omit<EmailLog, 'id' | 'sentAt'>) {
    try {
        const emailLogCollection = getEmailLogCollection(orgId);
        await addDoc(emailLogCollection, {
            ...logData,
            sentAt: serverTimestamp(),
        });
    } catch (error) {
        console.error(`[EmailLogger] Failed to log email for org ${orgId}:`, error);
        // Do not re-throw, as logging failure should not break the parent process.
    }
}
