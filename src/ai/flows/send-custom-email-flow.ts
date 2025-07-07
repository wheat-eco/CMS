'use server';
/**
 * @fileOverview A flow for sending a custom email to selected users.
 * 
 * - sendCustomEmail - A function that sends a custom email.
 * - SendCustomEmailInput - The input type for the sendCustomEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from '@/lib/mailer';
import { getUserProfile } from '@/lib/firebase/firestore';

const SendCustomEmailInputSchema = z.object({
    recipientUids: z.array(z.string()).describe("An array of user UIDs to send the email to."),
    subject: z.string().describe("The subject line of the email."),
    body: z.string().describe("The HTML body content of the email."),
    orgId: z.string().describe("The ID of the organization whose SMTP settings should be used."),
});
export type SendCustomEmailInput = z.infer<typeof SendCustomEmailInputSchema>;

export async function sendCustomEmail(input: SendCustomEmailInput): Promise<void> {
  return sendCustomEmailFlow(input);
}

const sendCustomEmailFlow = ai.defineFlow(
  {
    name: 'sendCustomEmailFlow',
    inputSchema: SendCustomEmailInputSchema,
    outputSchema: z.void(),
  },
  async ({ recipientUids, subject, body, orgId }) => {
    if (!orgId) {
        throw new Error("Organization ID is required to send an email.");
    }
    if (recipientUids.length === 0) {
        throw new Error("At least one recipient must be selected.");
    }

    const emailPromises = recipientUids.map(async (uid) => {
        const userProfile = await getUserProfile(uid);
        if (userProfile?.email) {
            // A simple enhancement: wrap plain text in <p> tags if it doesn't look like HTML.
            // Also replaces newlines with <br> for better formatting.
            const emailBody = body.trim().startsWith('<') ? body : `<p>${body.replace(/\n/g, '<br>')}</p>`;
            await sendEmail(userProfile.email, subject, emailBody, orgId);
        } else {
            console.warn(`Could not find email for user UID: ${uid}. Skipping.`);
        }
    });

    await Promise.all(emailPromises);
  }
);
