import { adminDb } from "../../lib/firebase-admin.js";
import { getScopedCandidateUniverse } from "../utils/governance.js";

export default async function handler(req: any, res: any) {
  const { orgId, role, scan } = req.query;

  try {
    if (!adminDb) {
      return res.status(200).json({ success: true, candidates: [] });
    }

    const snapshot = await getScopedCandidateUniverse(adminDb, "candidatePool", role, orgId).limit(100).get();
    let candidates = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

    return res.status(200).json({ success: true, candidates });
  } catch (error: any) {
    if (error.code === 16 || error.message?.includes('UNAUTHENTICATED')) {
      console.warn("[CANDIDATES_API_WARN] adminDb unauthenticated, falling back to client-side query.");
    } else {
      console.error("[CANDIDATES_API_ERR] Error fetching candidates:", error.message);
    }
    return res.status(200).json({ success: true, candidates: [] });
  }
}
