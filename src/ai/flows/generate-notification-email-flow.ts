'use server';
/**
 * @fileOverview Generates email notifications for various system events.
 *
 * - generateNotificationEmail - A function that generates email subject and body.
 * - NotificationInput - The input type for the generateNotificationEmail function.
 * - NotificationOutput - The return type for the generateNotificationEmail function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NotificationInputSchema = z.object({
  notificationType: z.enum([
    'newUserPending', 
    'ticketCreated', 
    'ticketComment', 
    'ticketResolved', 
    'userApproved',
    'ticketAssigned',
    'userProfileUpdated'
  ]).describe("The type of notification to generate."),
  userName: z.string().describe("The name of the person receiving the email."),
  orgName: z.string().describe("The name of the organization."),
  ticketId: z.string().optional().describe("The ID of the relevant ticket."),
  ticketTitle: z.string().optional().describe("The title of the relevant ticket."),
  commenterName: z.string().optional().describe("The name of the person who commented."),
  newUserName: z.string().optional().describe("The name of the new user who needs approval or was approved."),
});
export type NotificationInput = z.infer<typeof NotificationInputSchema>;

const NotificationOutputSchema = z.object({
  subject: z.string().describe("The subject line for the email."),
  body: z.string().describe("The full HTML body content for the email."),
});
export type NotificationOutput = z.infer<typeof NotificationOutputSchema>;


export async function generateNotificationEmail(input: NotificationInput): Promise<NotificationOutput> {
  return generateEmailFlow(input);
}


const prompt = ai.definePrompt({
  name: 'generateEmailPrompt',
  input: {schema: NotificationInputSchema},
  output: {schema: NotificationOutputSchema},
  prompt: `You are an expert in creating professional, responsive, and spam-compliant HTML emails for a Complaint Management System.

Your task is to generate an email with a subject line and a full HTML body.

**IMPORTANT RULES FOR THE HTML BODY:**
1.  **Use Inline CSS:** All styles must be inline on the HTML elements (e.g., \`<p style="color: #333;">\`). Do not use \`<style>\` blocks. This is critical for email client compatibility.
2.  **Structure:** Use a main container for the layout. The email should have a clear header, body, and footer section.
3.  **Branding:** The organization's name (\`{{{orgName}}}\`) should be prominently displayed in the header.
4.  **Clarity:** Use clear headings and well-spaced paragraphs for readability.
5.  **Professionalism:** The tone should be professional and helpful. The footer should contain a notice that this is an automated email.

**Data Provided:**
- Recipient Name: {{{userName}}}
- Organization Name: {{{orgName}}}
- Notification Type: {{{notificationType}}}
- Ticket ID: {{{ticketId}}}
- Ticket Title: {{{ticketTitle}}}
- Commenter: {{{commenterName}}}
- New User: {{{newUserName}}}

**Task:**
Based on the \`notificationType\`, generate the appropriate \`subject\` and \`body\` for the email.

**Example structure for the body:**
\`\`\`html
<div style="font-family: Arial, 'Helvetica Neue', Helvetica, sans-serif; line-height: 1.6; background-color: #f9fafb; padding: 20px;">
  <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;">
    <div style="background-color: #4f46e5; color: #ffffff; padding: 20px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">{{{orgName}}}</h1>
    </div>
    <div style="padding: 30px;">
      <h2 style="font-size: 20px; color: #1f2937; margin-top: 0;">Hi {{{userName}}},</h2>
      <!-- AI-generated content based on notificationType goes here -->
      <p style="color: #374151;">This is a notification regarding your account.</p>
    </div>
    <div style="text-align: center; padding: 20px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
      <p>This is an automated notification from the Complaint Management System. Please do not reply to this email.</p>
    </div>
  </div>
</div>
\`\`\`

---

**Generate the email for the following notification type:** \`{{{notificationType}}}\`

{{#if (eq notificationType "newUserPending")}}
The purpose is to inform an admin that a new user (\`{{{newUserName}}}\`) is pending approval.
{{/if}}

{{#if (eq notificationType "ticketCreated")}}
The purpose is to inform a supervisor/admin that a new ticket (\`{{{ticketId}}}: {{{ticketTitle}}}\`) has been created.
{{/if}}

{{#if (eq notificationType "ticketComment")}}
The purpose is to inform the ticket owner that \`{{{commenterName}}}\` has added a new comment to ticket \`{{{ticketId}}}: {{{ticketTitle}}}\`.
{{/if}}

{{#if (eq notificationType "ticketResolved")}}
The purpose is to inform the ticket creator that their ticket \`{{{ticketId}}}: {{{ticketTitle}}}\` has been resolved.
{{/if}}

{{#if (eq notificationType "userApproved")}}
The purpose is to inform a user that their account for \`{{{orgName}}}\` has been approved.
{{/if}}

{{#if (eq notificationType "ticketAssigned")}}
The purpose is to inform a supervisor that ticket \`{{{ticketId}}}: {{{ticketTitle}}}\` has been assigned to their department.
{{/if}}

{{#if (eq notificationType "userProfileUpdated")}}
The purpose is to inform a user that their profile (role or department) has been updated by an administrator.
{{/if}}
`,
});

const generateEmailFlow = ai.defineFlow(
  {
    name: 'generateEmailFlow',
    inputSchema: NotificationInputSchema,
    outputSchema: NotificationOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
