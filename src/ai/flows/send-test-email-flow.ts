'use server';
/**
 * @fileOverview A flow for sending a test email to verify SMTP configuration.
 * 
 * - sendTestEmail - A function that sends a test email.
 * - SendTestEmailInput - The input type for the sendTestEmail function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { sendEmail } from '@/lib/mailer';

const SendTestEmailInputSchema = z.object({
    recipientEmail: z.string().email().describe("The email address to send the test email to."),
    orgId: z.string().describe("The ID of the organization whose SMTP settings should be used."),
});
export type SendTestEmailInput = z.infer<typeof SendTestEmailInputSchema>;


export async function sendTestEmail(input: SendTestEmailInput): Promise<void> {
  return sendTestEmailFlow(input);
}


const sendTestEmailFlow = ai.defineFlow(
  {
    name: 'sendTestEmailFlow',
    inputSchema: SendTestEmailInputSchema,
    outputSchema: z.void(),
  },
  async ({ recipientEmail, orgId }) => {
    if (!orgId) {
        throw new Error("Organization ID is required to send a test email.");
    }
    
    const subject = "Test Email from Complaint Management System";
    const body = `<p>This is a test email to confirm your SMTP settings are configured correctly.</p><p>If you received this, everything is working!</p>`;
    
    await sendEmail(recipientEmail, subject, body, orgId);
  }
);
