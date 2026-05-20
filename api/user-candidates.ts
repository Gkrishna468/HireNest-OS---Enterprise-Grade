import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  try {
    const { orgId } = req.query;
    let query = adminDb.collection("candidates");
    
    if (orgId) {
      // Logic for org filtering if needed
    }

    const snap = await query.limit(100).get();
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.status(200).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
