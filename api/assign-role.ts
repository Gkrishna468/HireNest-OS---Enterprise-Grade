import { adminAuth } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { uid, role, organizationId } = req.body;
    
    await adminAuth.setCustomUserClaims(uid, {
      role,
      orgId: organizationId
    });

    res.status(200).json({ ok: true, message: "Custom claims updated." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
