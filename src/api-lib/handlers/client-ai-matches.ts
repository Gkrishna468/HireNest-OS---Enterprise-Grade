import { adminDb } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let { orgId } = req.query;
  
  const userId = req.user?.uid;
  let role = req.user?.role;
  let userOrg = req.user?.organizationId;

  if (userId) {
     try {
       const userDoc = await adminDb.collection("users").doc(userId).get();
       if (userDoc.exists) {
          role = userDoc.data()?.role || role;
          userOrg = userDoc.data()?.organizationId || userOrg;
       }
     } catch (e) {
       console.error("[AUTH] Error", e);
     }
  }

  const isAdmin = role === "admin" || role === "super_admin" || role === "hq_admin" || userOrg === "ORG-GLOBAL-HQ";

  if (!isAdmin) {
     if (orgId && orgId !== userOrg) {
         return res.status(403).json({ error: "Access Denied: Organization Mismatch" });
     }
     orgId = userOrg;
  }

  if (!orgId) {
    return res.status(400).json({ error: "orgId is required" });
  }

  try {
    console.log("ORG:", orgId);
    if (!adminDb) return res.status(503).json({ matches: [] });

    const reqSnapshot = await adminDb.collection("requirements_public").where("clientId", "==", orgId).get();
    const reqIds = new Set(reqSnapshot.docs.map(d => d.id));
    const reqDataMap = new Map(reqSnapshot.docs.map(d => [d.id, d.data()]));
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

         if (cand.active === false || cand.isActive === false || cand.status === "DELETED" || cand.archived === true || cand.deleted === true || cand.blacklisted === true) {
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
             const data = s.data();
             if (data.status === "DELETED" || data.isActive === false) return;
             subExists = true;
             status = data.status || "SUBMITTED";
         });
         
         const subSnap2 = await adminDb.collection("submissions")
               .where("candidateId", "==", candId)
               .where("reqId", "==", matchReqId)
               .get();
         
         subSnap2.docs.forEach((s) => {
             const data = s.data();
             if (data.status === "DELETED" || data.isActive === false) return;
             subExists = true;
             status = data.status || "SUBMITTED";
         });

         // The PM mandated a Client Candidate Workspace that shows matched candidates pre-submission.
         // We do not skip if subExists is false.
         if (subExists) {
             submissionFiltered++;
         }

         const reqData = reqDataMap.get(matchReqId) as any;

         matches.push({
             ...cand,
             id: doc.id,
             candidateId: candId,
             candidateName: cand.fullName || "Anonymous Candidate",
             requirementId: matchReqId,
             reqId: matchReqId,
             reqTitle: reqData?.title || reqData?.jobTitle || "Requirement Match",
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
