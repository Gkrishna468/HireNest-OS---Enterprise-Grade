import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { candidateId, clientId } = req.query;

  if (!candidateId || !clientId) {
    return res.status(400).json({ error: "Missing candidateId or clientId" });
  }

  try {
    // 1. Verify access: Does this client have a submission for this candidate?
    const subSnap = await adminDb.collection("submissions")
      .where("clientId", "==", clientId)
      .where("candidateId", "==", candidateId)
      .limit(1)
      .get();

    if (subSnap.empty) {
      // Allow if the client is essentially HQ or something, but typically reject
      // Let's also check if it's a generic dealRoom access
      return res.status(403).json({ error: "Access denied. Candidate not submitted to your organization." });
    }

    // 2. Fetch full candidate data
    const candDoc = await adminDb.collection("candidatePool").doc(candidateId as string).get();
    let candidateData = candDoc.exists ? candDoc.data() : null;

    if (!candidateData) {
       return res.status(404).json({ error: "Candidate not found in pool." });
    }

    // fallback for resume text just in case
    if (!candidateData.resumeText && !candidateData.parsedResumeText) {
       const parseDoc = await adminDb.collection("resume_parses").doc(candidateId as string).get();
       if (parseDoc.exists) {
         candidateData.parsedResumeText = parseDoc.data()?.text || parseDoc.data()?.extractedText || "";
       }
    }

    // 3. Fetch AI match data context (the one related to this submission)
    const subRecord = subSnap.docs[0].data();
    let aiAnalysis = null;
    
    // get from ai_matches if it exists
    if (subRecord.requirementId) {
       const matchDoc = await adminDb.collection("candidatePool").doc(candidateId as string)
           .collection("ai_matches").doc(subRecord.requirementId).get();
       if (matchDoc.exists) {
           aiAnalysis = matchDoc.data();
       }
    }

    return res.status(200).json({
      candidate: candidateData,
      aiAnalysis: aiAnalysis
    });

  } catch (error) {
    console.error("Error fetching client candidate:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
