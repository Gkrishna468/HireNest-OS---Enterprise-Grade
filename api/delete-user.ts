import { adminDb, adminAuth } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { uid, organizationId } = req.body;
    
    if (uid) {
      await adminAuth.deleteUser(uid).catch(() => {});
      await adminDb.collection("users").doc(uid).delete().catch(() => {});
    }

    if (organizationId) {
      await adminDb.collection("organizations").doc(organizationId).delete().catch(() => {});
    }

    res.status(200).json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
