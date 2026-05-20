import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const payload = req.body;
    
    // Add default status
    const requestData = {
      ...payload,
      verificationStatus: 'PENDING',
      createdAt: new Date().toISOString()
    };

    const docRef = await adminDb.collection("onboarding_requests").add(requestData);

    res.status(200).json({ ok: true, requestId: docRef.id });
  } catch (err: any) {
    console.error("Onboarding Request Error:", err);
    res.status(500).json({ error: err.message });
  }
}
