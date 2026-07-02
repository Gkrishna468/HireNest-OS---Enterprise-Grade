import { adminDb } from "../../src/lib/firebase-admin.js";

export default async function submitLeadHandler(req: any, res: any) {
  console.log("=== PUBLIC SUBMIT LEAD HANDLER EXECUTED ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  console.log("Headers:", JSON.stringify(req.headers));

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
