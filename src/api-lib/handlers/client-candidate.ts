import { adminDb } from "../../lib/firebase-admin.js";

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { candidateId, clientId } = req.query;
  if (!candidateId || !clientId) {
    return res.status(400).json({ error: "candidateId and clientId are required" });
  }

  try {
    if (!adminDb) return res.status(503).json({ error: "No DB" });

    // Ensure the client has access to this candidate (either via a submission or ai_match on their requirement)
    let hasAccess = false;

    // 1. Check submissions
    const subSnap = await adminDb.collection("submissions")
       .where("candidateId", "==", candidateId)
       .where("clientId", "==", clientId)
       .get();
       
    if (!subSnap.empty) {
        hasAccess = true;
    } else {
        // 2. Check ai_matches on client's requirements
        const reqSnap = await adminDb.collection("requirements_public")
           .where("clientId", "==", clientId)
           .get();
        const reqIds = reqSnap.docs.map(d => d.id);
        
        if (reqIds.length > 0) {
            // Because we can't query group easily with IN, just get the candidate's ai_matches and see if any match reqIds
            const candMatches = await adminDb.collection("candidatePool")
               .doc(candidateId)
               .collection("ai_matches")
               .get();
               
            for (const doc of candMatches.docs) {
                const matchData = doc.data();
                const matchReqId = matchData.canonicalRequirementId || matchData.requirementId || matchData.reqId || doc.id;
                if (reqIds.includes(matchReqId)) {
                    hasAccess = true;
                    break;
                }
            }
        }
    }

    if (!hasAccess) {
        return res.status(403).json({ error: "Forbidden: No submission or match found." });
    }

    // Now fetch candidatePool and aiAnalysis
    const candSnap = await adminDb.collection("candidatePool").doc(candidateId).get();
    if (!candSnap.exists) {
        return res.status(404).json({ error: "Candidate not found" });
    }

    const candData = candSnap.data();

    // Fetch the best aiAnalysis logic
    const candMatches = await adminDb.collection("candidatePool")
       .doc(candidateId)
       .collection("ai_matches")
       .get();

    let aiAnalysis = null;
    const matches = candMatches.docs.map(d => ({ id: d.id, ...d.data() }));
    if (matches.length > 0) {
        matches.sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
        aiAnalysis = matches[0];
    }

    // fallback to resume_parses if resumeText is missing
    if (!candData?.resumeText && !candData?.parsedResumeText && !candData?.extractedText) {
        const parseDoc = await adminDb.collection("resume_parses").doc(candidateId).get();
        if (parseDoc.exists && parseDoc.data()?.text) {
             if (candData) {
                 candData.parsedResumeText = parseDoc.data()?.text || "";
             }
        }
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.status(200).json({ candidate: candData, aiAnalysis });

  } catch (error: any) {
    console.error("Error fetching client candidate full data:", error);
    return res.status(500).json({ error: error.message });
  }
}
