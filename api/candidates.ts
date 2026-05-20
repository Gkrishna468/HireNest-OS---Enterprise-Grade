import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  const { orgId } = req.query;

  try {
    // Check if it's looking for "user-candidates" or "candidates"
    // In both cases, we often filter by vendorId/orgId
    const snapshot = await adminDb.collection("candidatePool")
      .where("vendorId", "==", orgId || "GLOBAL")
      .limit(100)
      .get();

    const candidates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(candidates.length > 0 ? candidates : { success: true, candidates: [] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
