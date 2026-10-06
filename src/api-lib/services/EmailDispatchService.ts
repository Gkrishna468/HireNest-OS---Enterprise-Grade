import nodemailer, { Transporter } from 'nodemailer';
import { db as adminDb } from '../../lib/firebase-admin.js';
import { FieldValue } from 'firebase-admin/firestore';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 10000,
  });

  return transporter;
}

function maskEmail(email: string): string {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0] || ''}***@${domain}`;
  }
  return `${name.slice(0, 2)}***${name.slice(-1)}@${domain}`;
}

function maskName(name: string): string {
  if (!name) return '';
  const parts = name.split(' ');
  return parts.map(p => p.length > 1 ? `${p[0]}***` : '*').join(' ');
}

export class EmailDispatchService {
  /**
   * Main entry point to process a lead's notification email and applicant confirmation.
   * Uses a transaction-like observable workflow:
   * LEAD_RECEIVED -> FIRESTORE_SAVED -> EMAIL_NOTIFICATION_QUEUED -> EMAIL_SENT -> CONFIRMATION_SENT
   */
  static async sendLeadNotificationAndConfirmation(leadId: string, leadData: {
    fullName: string;
    company: string;
    email: string;
    phone: string;
    plan: string;
    requestId: string;
  }): Promise<{ success: boolean; emailStatus: string; error?: string }> {
    
    const { fullName, company, email, phone, plan, requestId } = leadData;
    const maskedEmail = maskEmail(email);
    const maskedName = maskName(fullName);

    console.log(`[EmailDispatchService] Initializing notification pipeline for [RequestId: ${requestId}]`);

    if (!adminDb) {
      console.error(`[EmailDispatchService] Firebase Admin DB not initialized. Cannot track transactional state.`);
      throw new Error("Admin database not initialized");
    }

    const leadRef = adminDb.collection('landing_page_leads_v1').doc(leadId);

    // Helper to log audit trail
    const appendLog = async (status: string, details?: string) => {
      try {
        await leadRef.set({
          emailStatus: status,
          emailLogs: FieldValue.arrayUnion({
            status,
            timestamp: new Date().toISOString(),
            details: details || ''
          })
        }, { merge: true });
      } catch (err: any) {
        console.error(`[EmailDispatchService] Failed to append log to Firestore:`, err.message);
      }
    };

    // Stage 1: Update to Queued
    await appendLog('EMAIL_NOTIFICATION_QUEUED', 'Lead captured and notification processing started');

    const mailTransporter = getTransporter();
    const isProduction = process.env.NODE_ENV === 'production';

    // Dev fallback if not configured
    if (!mailTransporter) {
      if (isProduction) {
        const errorMsg = 'SMTP configuration is missing in production environment';
        console.error(`[EmailDispatchService] [FATAL] ${errorMsg}`);
        await appendLog('EMAIL_FAILED', errorMsg);
        return { success: false, emailStatus: 'EMAIL_FAILED', error: errorMsg };
      } else {
        // Safe local simulation fallback
        console.warn(`[EmailDispatchService] [DEV_ONLY] SMTP environment variables are absent. Simulating transactional pipeline.`);
        console.log(`[ALERT_EMAIL_SIMULATED] Subject: New HireNestOS Early Access Request - [RequestId: ${requestId}]`);
        console.log(`[CONFIRMATION_EMAIL_SIMULATED] Subject: Request Received: HireNestOS Early Access - Sent to masked: ${maskedEmail}`);
        
        await appendLog('EMAIL_SENT', 'Simulated internal notification email successfully sent (local dev mode)');
        await appendLog('CONFIRMATION_SENT', 'Simulated applicant confirmation email successfully sent (local dev mode)');
        return { success: true, emailStatus: 'CONFIRMATION_SENT' };
      }
    }

    // Step 2: Idempotency Check
    try {
      const existingDoc = await leadRef.get();
      if (existingDoc.exists) {
        const currentStatus = existingDoc.data()?.emailStatus;
        if (currentStatus === 'CONFIRMATION_SENT') {
          console.log(`[EmailDispatchService] Lead [RequestId: ${requestId}] has already completed email pipeline. Preventing duplicate notifications.`);
          return { success: true, emailStatus: 'CONFIRMATION_SENT' };
        }
      }
    } catch (dbErr: any) {
      console.warn(`[EmailDispatchService] Idempotency check failed to query lead doc, proceeding safely:`, dbErr.message);
    }

    const fromAddress = process.env.SMTP_FROM || `"HireNestOS" <info@hirenestworkforce.com>`;
    const targetInternalEmail = 'info@hirenestworkforce.com';

    // Step 3: Send Internal Notification Email
    try {
      const internalSubject = `New HireNestOS Early Access Request - ${requestId}`;
      const internalBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
          <h2 style="color: #0d6efd; margin-top: 0; border-bottom: 2px solid #0d6efd; padding-bottom: 10px;">New Early Access Request</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Request ID:</td>
              <td style="padding: 8px 0;">${requestId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Name:</td>
              <td style="padding: 8px 0;">${fullName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Company:</td>
              <td style="padding: 8px 0;">${company}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Phone:</td>
              <td style="padding: 8px 0;">${phone}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Selected Plan:</td>
              <td style="padding: 8px 0; font-weight: bold; color: #212529;">${plan}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Captured At:</td>
              <td style="padding: 8px 0;">${new Date().toISOString()}</td>
            </tr>
          </table>
          <div style="margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 15px; font-size: 12px; color: #777;">
            Sent by HireNestOS Transactional Notification Pipeline.
          </div>
        </div>
      `;

      console.log(`[EmailDispatchService] Dispatching internal notification to ${targetInternalEmail} [RequestId: ${requestId}]`);
      
      await mailTransporter.sendMail({
        from: fromAddress,
        to: targetInternalEmail,
        subject: internalSubject,
        html: internalBody,
        text: `New HireNestOS Early Access Request\nRequest ID: ${requestId}\nName: ${fullName}\nCompany: ${company}\nEmail: ${email}\nPhone: ${phone}\nPlan: ${plan}`
      });

      console.log(`[EmailDispatchService] Internal notification email successfully sent for [RequestId: ${requestId}]`);
      await appendLog('EMAIL_SENT', `Internal notification successfully dispatched to ${targetInternalEmail}`);

    } catch (mailErr: any) {
      console.error(`[EmailDispatchService] Internal notification email failed for [RequestId: ${requestId}]:`, mailErr.message);
      await appendLog('EMAIL_FAILED', `Internal notification failed: ${mailErr.message}`);
      return { success: false, emailStatus: 'EMAIL_FAILED', error: mailErr.message };
    }

    // Step 4: Send Confirmation Email to Applicant
    try {
      const applicantSubject = `Request Received: HireNestOS Early Access`;
      const applicantBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto; border: 1px solid #e0e0e0; padding: 30px; border-radius: 8px; background-color: #fcfcfc;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #0d6efd; margin: 0;">HireNestOS</h1>
            <p style="font-size: 14px; color: #6c757d; margin-top: 5px;">Enterprise Recruitment Intelligence OS</p>
          </div>
          <p>Dear ${fullName},</p>
          <p>Thank you for requesting early access to <strong>HireNestOS</strong>. We are thrilled to welcome you and learn more about your hiring goals.</p>
          <div style="background-color: #f1f3f5; border-left: 4px solid #0d6efd; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-weight: bold; color: #495057;">What happens next?</p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Our success team is already reviewing your request. We will reach out to schedule a live walkthrough and activate your workspace within <strong>24 hours</strong> at this email address.</p>
          </div>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px; background-color: #fff; border: 1px solid #dee2e6; border-radius: 4px;">
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #dee2e6; width: 150px;">Request ID:</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${requestId}</td>
            </tr>
            <tr>
              <td style="padding: 10px; font-weight: bold; border-bottom: 1px solid #dee2e6;">Selected Plan:</td>
              <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${plan}</td>
            </tr>
          </table>
          <p style="margin-top: 30px;">If you have any immediate questions, feel free to reply directly to this email or reach us at <a href="mailto:info@hirenestworkforce.com" style="color: #0d6efd; text-decoration: none;">info@hirenestworkforce.com</a>.</p>
          <p style="margin-top: 20px; font-size: 14px;">Best regards,<br><strong>The HireNest Team</strong></p>
          <div style="margin-top: 40px; border-top: 1px solid #dee2e6; padding-top: 15px; font-size: 11px; color: #adb5bd; text-align: center;">
            &copy; ${new Date().getFullYear()} HireNest Workforce. All rights reserved.
          </div>
        </div>
      `;

      console.log(`[EmailDispatchService] Dispatching confirmation email to applicant: [RequestId: ${requestId}]`);

      await mailTransporter.sendMail({
        from: fromAddress,
        to: email,
        subject: applicantSubject,
        html: applicantBody,
        text: `Dear ${fullName},\n\nThank you for requesting early access to HireNestOS. Our success team will contact you within 24 hours at this email address.\n\nRequest ID: ${requestId}\nSelected Plan: ${plan}\n\nBest regards,\nThe HireNest Team`
      });

      console.log(`[EmailDispatchService] Confirmation email successfully dispatched to applicant: [RequestId: ${requestId}]`);
      await appendLog('CONFIRMATION_SENT', `Confirmation email successfully dispatched to applicant`);

      return { success: true, emailStatus: 'CONFIRMATION_SENT' };

    } catch (mailErr: any) {
      console.error(`[EmailDispatchService] Confirmation email failed for applicant [RequestId: ${requestId}]:`, mailErr.message);
      await appendLog('EMAIL_FAILED', `Confirmation email failed: ${mailErr.message}`);
      return { success: false, emailStatus: 'EMAIL_FAILED', error: mailErr.message };
    }
  }
}
