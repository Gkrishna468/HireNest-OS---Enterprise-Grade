import { adminDb } from "../../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  const { orgId, role, scan } = req.query;

  try {
    if (!adminDb) {
      return res.status(200).json({ success: true, candidates: [] });
    }

    const isAdmin = role === 'admin' || role === 'super_admin' || role === 'ops_admin' || role === 'hq_admin' || orgId === 'ORG-GLOBAL-HQ' || orgId === 'ADMIN' || scan === 'true';

    let snapshot;
    if (isAdmin) {
      snapshot = await adminDb.collection("candidatePool")
        .limit(100)
        .get();
    } else {
      snapshot = await adminDb.collection("candidatePool")
        .where("vendorId", "==", orgId || "GLOBAL")
        .limit(100)
        .get();
    }

    const candidates = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({ success: true, candidates });
  } catch (error: any) {
    console.error("[CANDIDATES_API_ERR] Error fetching candidates:", error);
    res.status(200).json({ success: true, candidates: [] });
  }
}
