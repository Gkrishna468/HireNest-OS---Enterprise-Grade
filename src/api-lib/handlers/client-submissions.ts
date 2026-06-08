import { adminDb } from "../../lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  
  const { clientId } = req.query;
  if (!clientId) return res.status(400).json({ error: "Missing clientId" });

  try {
    const snap = await adminDb.collection("submissions")
      .where("clientId", "==", clientId)
      .get();
      
    const submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    return res.status(200).json({ success: true, submissions });
  } catch (err: any) {
    console.error("CLIENT_SUBMISSIONS_ERROR", err);
    return res.status(500).json({ success: false, error: String(err) });
  }
}
