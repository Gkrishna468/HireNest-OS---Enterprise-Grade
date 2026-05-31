import { adminDb } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { orgId } = req.query;
  if (!orgId) {
    return res.status(400).json({ error: "orgId is required" });
  }

  try {
    console.log("ORG:", orgId);
    if (!adminDb) return res.status(503).json({ matches: [] });

    const reqSnapshot = await adminDb.collection("requirements_public").where("clientId", "==", orgId).get();
    const reqIds = new Set(reqSnapshot.docs.map(d => d.id));
    console.log("Requirements found:", reqIds.size);

    if (reqIds.size === 0) return res.status(200).json({ matches: [] });

    const allMatchesSnapshot = await adminDb.collectionGroup('ai_matches').get();
    const matches: any[] = [];

    for (const doc of allMatchesSnapshot.docs) {
      const matchData = doc.data();
      const matchReqId = matchData.requirementId || doc.id; 

      if (reqIds.has(matchReqId)) {
         const candId = matchData.candidateId;
         if (!candId) continue;
         
         const candRef = await adminDb.collection("candidatePool").doc(candId).get();
         if (!candRef.exists) continue;
         const cand = candRef.data();

         if (cand.active === false || cand.archived === true || cand.deleted === true || cand.blacklisted === true) {
             continue;
         }

         const subSnap = await adminDb.collection("submissions")
               .where("candidateId", "==", candId)
               .where("requirementId", "==", matchReqId)
               .get();
               
         let subExists = false;
         let isRejected = false;
         
         subSnap.docs.forEach((s) => {
             subExists = true;
             const sData = s.data();
             if (sData.status === "REJECTED" || sData.status === "MATCH_REJECTED" || sData.status === "REJECTED_BY_CLIENT") {
                 isRejected = true;
             }
         });
         
         const subSnap2 = await adminDb.collection("submissions")
               .where("candidateId", "==", candId)
               .where("reqId", "==", matchReqId)
               .get();
         
         subSnap2.docs.forEach((s) => {
             subExists = true;
             const sData = s.data();
             if (sData.status === "REJECTED" || sData.status === "MATCH_REJECTED" || sData.status === "REJECTED_BY_CLIENT") {
                 isRejected = true;
             }
         });

         if (isRejected || subExists) {
             continue;
         }

         matches.push({
             id: doc.id,
             candidateId: candId,
             candidateName: cand.fullName || cand.name || matchData.candidateName || "Unknown",
             requirementId: matchReqId,
             reqId: matchReqId,
             matchScore: matchData.matchScore || 0,
             status: "AI MATCH",
             vendorName: cand.vendorName || cand.vendorId || ""
         });
      }
    }

    matches.sort((a,b) => b.matchScore - a.matchScore);
    console.log("Matches found:", matches.length);

    return res.status(200).json({ matches });
  } catch (error: any) {
    console.error("Error fetching client AI matches:", error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
