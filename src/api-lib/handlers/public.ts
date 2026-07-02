import { adminDb } from "../../lib/firebase-admin.js";

export default async function publicHandler(req: any, res: any) {
  const { path } = req.query;
  const action = req.query.action || req.body?.action;
  
  if (path === 'public/submit-lead' || action === 'submit-lead') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
      const data = req.body;
      
      console.log("==========================================");
      console.log("NEW LEAD CAPTURED - NOTIFICATION");
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Name: ${data.fullName || data.name}`);
      console.log(`Plan: ${data.plan}`);
      console.log(`Emails: ${data.email}, ${data.companyEmail}`);
      console.log(`Company: ${data.companyName || data.company}`);
      console.log(`Phone: ${data.phone || 'N/A'}`);
      console.log("==========================================");

      if (!adminDb) {
        console.warn('[PublicAPI] Admin DB not available, but lead logged to console.');
        return res.json({ success: true, message: 'Lead logged' });
      }
      
      await adminDb.collection('landing_page_leads_v1').add({
        fullName: data.fullName || data.name || '',
        company: data.companyName || data.company || '',
        email: data.email || data.companyEmail || '',
        phone: data.phone || '',
        plan: data.plan || '',
        status: "NEW",
        source: 'landing_page_v1',
        createdAt: new Date().toISOString()
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("[SubmitLead Error]:", err);
      return res.status(500).json({ error: "Failed to submit lead" });
    }
  }

  return res.status(404).json({ error: "Public route not found" });
}
