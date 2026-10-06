import { adminDb } from "../../lib/firebase-admin.js";
import { EmailDispatchService } from "../services/EmailDispatchService.js";

function withTimeout<T = any>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

export default async function publicHandler(req: any, res: any) {
  const { path } = req.query;
  const action = req.query.action || req.body?.action;
  
  if (path === 'public/submit-lead' || action === 'submit-lead') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
      const data = req.body || {};
      
      const email = (data.email || data.companyEmail || '').trim().toLowerCase();
      const fullName = (data.fullName || data.name || 'Anonymous').trim();
      const company = (data.companyName || data.company || 'N/A').trim();
      const phone = (data.phone || 'N/A').trim();
      const plan = (data.plan || 'Professional').trim();

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      // Format Request ID: HN-EA-XXXXX
      const randomId = Math.random().toString(36).substr(2, 5).toUpperCase();
      const requestId = `HN-EA-${randomId}`;
      const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, "$1***$3");

      console.log(`[PublicAPI] Lead received. RequestId: ${requestId}. Status: LEAD_RECEIVED.`);

      if (!adminDb) {
        console.error('[PublicAPI] Firebase Admin DB not available. Cannot process transactional lead.');
        return res.status(503).json({ error: 'Service Unavailable: Database not initialized.' });
      }

      // Check duplicate
      try {
        const existingLeads = await withTimeout(
          adminDb.collection('landing_page_leads_v1')
            .where('email', '==', email)
            .limit(1)
            .get(),
          8000,
          'Duplicate lead lookup'
        );

        if (!existingLeads.empty) {
          console.warn(`[PublicAPI] Lead already exists for email: ${maskedEmail}. Recorded duplicate attempt.`);
          return res.json({ success: true, message: "Lead already exists, recorded duplicate attempt." });
        }
      } catch (dbCheckErr: any) {
        console.warn('[PublicAPI] Failed to check duplicate email in Firestore:', dbCheckErr.message);
      }

      let leadDocRef;
      try {
        const timestamp = new Date().toISOString();
        leadDocRef = await withTimeout(
          adminDb.collection('landing_page_leads_v1').add({
            fullName,
            company,
            email,
            phone,
            plan,
            timestamp,
            status: 'NEW',
            requestId,
            source: 'landing_page_v1_api',
            emailStatus: 'FIRESTORE_SAVED',
            emailLogs: [
              {
                status: 'LEAD_RECEIVED',
                timestamp,
                details: 'Inbound lead received'
              },
              {
                status: 'FIRESTORE_SAVED',
                timestamp,
                details: 'Lead successfully persisted to database'
              }
            ]
          }),
          8000,
          'Lead save'
        );
        console.log(`[PublicAPI] Lead saved to Firestore with ID: ${leadDocRef.id}. Status: FIRESTORE_SAVED.`);
      } catch (saveErr: any) {
        console.error('[PublicAPI] Failed to persist lead to Firestore:', saveErr.message);
        return res.status(500).json({ error: 'Failed to persist lead record.' });
      }

      // Call transactional EmailDispatchService
      const emailResult = await EmailDispatchService.sendLeadNotificationAndConfirmation(
        leadDocRef.id,
        {
          fullName,
          company,
          email,
          phone,
          plan,
          requestId
        }
      );

      if (!emailResult.success) {
        console.error(`[PublicAPI] Email notification pipeline failed for [RequestId: ${requestId}]:`, emailResult.error);
        return res.status(500).json({
          success: false,
          error: 'Lead saved but notification dispatch failed.',
          requestId,
          emailStatus: emailResult.emailStatus
        });
      }

      return res.json({
        success: true,
        requestId,
        emailStatus: emailResult.emailStatus
      });
    } catch (err: any) {
      console.error("[SubmitLead Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to submit lead" });
    }
  }

  return res.status(404).json({ error: "Public route not found" });
}
