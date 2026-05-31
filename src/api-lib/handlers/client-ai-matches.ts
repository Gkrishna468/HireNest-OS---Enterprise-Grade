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
    
    console.log("Total ai_matches found = ", allMatchesSnapshot.size);

    let reqFiltered = 0;
    let activeFiltered = 0;
    let submissionFiltered = 0;

    for (const doc of allMatchesSnapshot.docs) {
      const matchData = doc.data();
      const matchReqId = matchData.canonicalRequirementId || matchData.requirementId || matchData.reqId || doc.id; 

      if (reqIds.has(matchReqId)) {
         reqFiltered++;
         let candId = matchData.candidateId;
         if (!candId) {
             const parentDoc = doc.ref.parent.parent;
             if (parentDoc) {
                 candId = parentDoc.id;
             }
         }
         if (!candId) {
             console.log("Skipping, no candId");
             continue;
         }
         
         const candRef = await adminDb.collection("candidatePool").doc(candId).get();
         if (!candRef.exists) continue;
         const cand = candRef.data();

         if (cand.active === false || cand.archived === true || cand.deleted === true || cand.blacklisted === true) {
             continue;
         }
         activeFiltered++;

         // Fetch submissions to figure out pipeline stage, but DO NOT skip them.
         const subSnap = await adminDb.collection("submissions")
               .where("candidateId", "==", candId)
               .where("requirementId", "==", matchReqId)
               .get();
               
         let status = "AI MATCH";
         let subExists = false;
         
         subSnap.docs.forEach((s) => {
             subExists = true;
             status = s.data().status || "SUBMITTED";
         });
         
         const subSnap2 = await adminDb.collection("submissions")
               .where("candidateId", "==", candId)
               .where("reqId", "==", matchReqId)
               .get();
         
         subSnap2.docs.forEach((s) => {
             subExists = true;
             status = s.data().status || "SUBMITTED";
         });

         matches.push({
             id: doc.id,
             candidateId: candId,
             candidateName: cand.fullName || cand.name || matchData.candidateName || "Unknown",
             requirementId: matchReqId,
             reqId: matchReqId,
             matchScore: matchData.matchScore || 0,
             status: status,
             sysSource: subExists ? 'SUBMISSION' : 'AI_MATCH',
             vendorName: cand.vendorName || cand.vendorId || ""
         });
      }
    }

    matches.sort((a,b) => b.matchScore - a.matchScore);
    console.log("Matches found:", matches.length);
    console.log(`Summary: Total ai_matches: ${allMatchesSnapshot.size}, After requirement filter: ${reqFiltered}, After active filter: ${activeFiltered}, After submission filter: ${submissionFiltered}, Final returned: ${matches.length}`);

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).json({ matches });
  } catch (error: any) {
    console.error("Error fetching client AI matches:", error);
    return res.status(500).json({ error: error.message, stack: error.stack });
  }
}
