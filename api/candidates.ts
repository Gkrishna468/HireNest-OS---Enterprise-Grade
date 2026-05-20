import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  const { orgId } = req.query;

  try {
    const snapshot = await adminDb.collection("candidatePool")
      .where("vendorId", "==", orgId)
      .limit(50)
      .get();

    const candidates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json({
      success: true,
      candidates
    });
  } catch (error: any) {
    console.error("Candidates Fetch Error:", error);
    res.status(200).json({ 
      success: false, 
      candidates: [],
      error: error.message 
    });
  }
}
