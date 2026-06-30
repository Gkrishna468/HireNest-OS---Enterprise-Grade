import { adminDb } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    if (!adminDb) {
      return res.status(500).json({ error: "adminDb not initialized" });
    }
    const candidatesRef = adminDb.collection("candidatePool");
    const qSnap = await candidatesRef.get();

    let repaired = 0;

    for (const doc of qSnap.docs) {
      const data = doc.data();
      if (
        data.name === "Local Mock Generated" ||
        data.email === "mock@example.com" ||
        data.email === "pending@hirenest.os" ||
        data.name === "Pending Distillation" ||
        data.name === "Parsing Pending" ||
        data.name === "Sarah Jenkins" ||
        data.name === "Unnamed Candidate" ||
        data.name === "Unknown Candidate"
      ) {
        await doc.ref.delete();
        repaired++;
      }
    }

    res.status(200).json({ message: "Repairs executing...", repaired });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
}
