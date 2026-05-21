import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  const { orgId } = req.query;

  try {
    if (!adminDb) {
      return res.status(200).json([]);
    }
    const snapshot = await adminDb.collection("candidatePool")
      .where("vendorId", "==", orgId || "GLOBAL")
      .limit(100)
      .get();

    const candidates = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(candidates);
  } catch (error: any) {
    res.status(200).json([]);
  }
}
