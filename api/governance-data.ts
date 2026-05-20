import { adminDb } from "../src/lib/firebase-admin";
import { getAuth } from "firebase-admin/auth";

export default async function handler(req: any, res: any) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token);
    
    // Check if admin
    const userSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userSnap.data();
    
    if (userData?.role !== 'admin' && userData?.role !== 'super_admin' && userData?.role !== 'ops_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const [candidates, orgs, rooms, reqs, subs, onboarding] = await Promise.all([
      adminDb.collection("candidates").limit(50).get(),
      adminDb.collection("organizations").limit(50).get(),
      adminDb.collection("deal_rooms").limit(50).get(),
      adminDb.collection("requirements").limit(50).get(),
      adminDb.collection("submissions").limit(50).get(),
      adminDb.collection("onboarding_requests").limit(50).get()
    ]);

    res.status(200).json({
      candidates: candidates.docs.map(d => ({ id: d.id, ...d.data() })),
      organizations: orgs.docs.map(d => ({ id: d.id, ...d.data() })),
      dealRooms: rooms.docs.map(d => ({ id: d.id, ...d.data() })),
      requirements: reqs.docs.map(d => ({ id: d.id, ...d.data() })),
      submissions: subs.docs.map(d => ({ id: d.id, ...d.data() })),
      onboarding_requests: onboarding.docs.map(d => ({ id: d.id, ...d.data() })),
      mode: "LIVE",
      nodeId: process.env.GOOGLE_CLOUD_PROJECT || "hirenest-os"
    });
  } catch (err: any) {
    console.error("Governance Data API Error:", err);
    res.status(500).json({ error: err.message });
  }
}
