import { adminDb } from "../../lib/firebase-admin.js";
import { dispatchWorkflowEvent } from "../../../api/lib/workflowQueue.js";
import { runComprehensiveMatch } from "../ai/matchingEngine.js";

export default async function matchingGlobalHandler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { requirementId, orgId, role, skills } = req.query;
  const targetReqId = requirementId || "";

  if (!targetReqId) {
    return res.status(400).json({ error: "requirementId is required for contextual matching" });
  }

  // Parse skills array
  let reqSkills: string[] = [];
  if (skills) {
    reqSkills = String(skills)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s, i, arr) => s.length > 0 && arr.indexOf(s) === i);
  }

  try {
    const matchedCandidates: any[] = [];
    const jdObject = { skills: reqSkills };

    if (adminDb) {
      try {
        const isAdmin = role === 'admin' || role === 'super_admin' || role === 'ops_admin' || orgId === 'ORG-GLOBAL-HQ' || orgId === 'ADMIN';
        
        let candidatesQuery: any = adminDb.collection("candidatePool");
        
        // Scope 1: Only check candidates explicitly mapped to this requirement to prevent leakage
        candidatesQuery = candidatesQuery.where("mappedJobId", "==", targetReqId);
        
        // Scope 2: Apply vendor isolation if not purely an admin
        if (!isAdmin && orgId) {
            // Note: Client can see all mapped candidates for this job (since they own the job)
            // But wait, if role is vendor, restrict to their own candidates
            if (role?.includes('vendor') || role === 'recruiter') {
               candidatesQuery = candidatesQuery.where("vendorId", "==", orgId);
            }
        }

        const snapshot = await candidatesQuery.get();
        
        for (const doc of snapshot.docs) {
          const cand = doc.data();

          // Execute contextual semantic mapping
          const matchResult = await runComprehensiveMatch(jdObject, cand);

          // We return requirement-scoped matches, scored contextually against the JD
          matchedCandidates.push({
            id: doc.id,
            candidateId: cand.candidateId || doc.id,
            name: cand.name || "Verified Talent",
            email: cand.email || "talent@vendor-network.net",
            phone: cand.phone || "+91 91000 23144",
            linkedin: cand.linkedin || "https://linkedin.com",
            skills: cand.skills || [],
            experience: cand.experience || "Not Specified",
            vendorId: cand.vendorId || "ORG-EXTERNAL-VENDOR",
            pipelineStage: cand.pipelineStage || "Mapped to Requirement",
            matchScore: matchResult.overallScore,
            isGlobalMatch: false,
            breakdown: matchResult.breakdown,
            strengths: matchResult.explanation.recruiterView.strengths,
            gaps: matchResult.explanation.recruiterView.gaps,
            suitabilitySummary: "Match evaluated contextually for this requirement."
          });
        }
      } catch (dbErr) {
        console.warn("[MATCHING_REQUIREMENT_DB_WARN] Failed to query mapped candidates:", dbErr);
      }
    }

    const sortedMatches = matchedCandidates
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    if (sortedMatches.length > 0) {
      try {
        await dispatchWorkflowEvent(adminDb, {
          eventType: "REQUIREMENT_MATCH_EVALUATED",
          producer: "api/matching-scoped",
          status: "QUEUED",
          payload: {
            jobId: targetReqId,
            count: sortedMatches.length,
            topScore: sortedMatches[0]?.matchScore,
          },
        });
      } catch (evtErr) {}
    }

    return res.status(200).json({
      matches: sortedMatches,
      count: sortedMatches.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SCOPED_MATCHING_ERR] Core execution failed:", error);
    return res.status(500).json({ error: error.message });
  }
}

