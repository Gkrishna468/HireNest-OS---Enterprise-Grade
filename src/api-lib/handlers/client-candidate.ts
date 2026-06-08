import { adminDb } from "../../lib/firebase-admin";

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

    let isAuthorized = !subSnap.empty;

    // 2. Fallback: Does this client have an AI match for this candidate?
    if (!isAuthorized) {
       const aiMatchSnap = await adminDb.collection("candidatePool")
          .doc(candidateId as string)
          .collection("ai_matches")
          .where("clientId", "==", clientId)
          .limit(1)
          .get();
       isAuthorized = !aiMatchSnap.empty;
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied. Candidate not submitted or matched to your organization." });
    }

    // 3. Fetch full candidate data
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
    const subRecord = !subSnap.empty ? subSnap.docs[0].data() : null;
    let aiAnalysis = null;
    
    // get from ai_matches if it exists
    if (subRecord && subRecord.requirementId) {
       const matchDoc = await adminDb.collection("candidatePool").doc(candidateId as string)
           .collection("ai_matches").doc(subRecord.requirementId).get();
       if (matchDoc.exists) {
           aiAnalysis = matchDoc.data();
       }
    } else {
       // fallback generic match for the client
       const aiMatchSnap = await adminDb.collection("candidatePool")
          .doc(candidateId as string)
          .collection("ai_matches")
          .where("clientId", "==", clientId)
          .limit(1)
          .get();
       if (!aiMatchSnap.empty) {
          aiAnalysis = aiMatchSnap.docs[0].data();
       }
    }

    // 4. Fetch interviews for this client
    const interviewsSnap = await adminDb.collection("interviews")
      .where("candidateId", "==", candidateId)
      .where("clientId", "==", clientId)
      .get();
    
    let interviews = interviewsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return res.status(200).json({
      candidate: candidateData,
      aiAnalysis: aiAnalysis,
      interviews: interviews
    });

  } catch (err: any) {
    console.error("CLIENT_CANDIDATE_ERROR", err);
    return res.status(500).json({ 
       success: false,
       error: String(err)
    });
  }
}
