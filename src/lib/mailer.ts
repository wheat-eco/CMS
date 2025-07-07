'use server';

import nodemailer from 'nodemailer';
import { getOrganizationById } from './firebase/organizations';
import { logEmail } from './firebase/emailLogs';

export async function sendEmail(to: string, subject: string, htmlBody: string, orgId: string) {
    const organization = await getOrganizationById(orgId);

    if (!organization?.smtp?.host || !organization.smtp.user || !organization.smtp.pass) {
        const warningMessage = `SMTP settings not configured for organization ${orgId}. Skipping email to ${to}.`;
        console.warn(`[Mailer] ${warningMessage}`);
        console.log(`[Mailer] Intended email: Subject: "${subject}"`);
        // Log the failure to send due to configuration issues
        await logEmail(orgId, { to, subject, status: 'failure', error: 'SMTP settings not configured' });
        return;
    }

    const { host, port, user, pass } = organization.smtp;

    const transporter = nodemailer.createTransport({
        host: host,
        port: Number(port) || 587,
        secure: (Number(port) || 587) === 465, // true for 465, false for other ports
        auth: {
            user: user,
            pass: pass,
        },
    });

    try {
        const info = await transporter.sendMail({
            from: `"${organization.name}" <${user}>`, // sender address
            to: to, // list of receivers
            subject: subject, // Subject line
            html: htmlBody, // html body
        });

        console.log(`[Mailer] Message sent: ${info.messageId} to ${to}`);
        await logEmail(orgId, { to, subject, status: 'success' });

    } catch (error: any) {
        console.error(`[Mailer] Failed to send email to ${to} for org ${orgId}:`, error);
        await logEmail(orgId, { to, subject, status: 'failure', error: error.message || 'Unknown error' });
        // Re-throw a more user-friendly error to be caught by the calling flow
        throw new Error("Failed to send email. Please check your SMTP credentials and try again.");
    }
}
