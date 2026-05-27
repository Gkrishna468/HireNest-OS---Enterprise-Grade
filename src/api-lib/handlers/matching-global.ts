import { adminDb } from "../../lib/firebase-admin.js";
import { dispatchWorkflowEvent } from "../../../api/lib/workflowQueue.js";
import { runComprehensiveMatch } from "../ai/matchingEngine.js";

function normalizeSkills(skills: string[]): string[] {
  const mappings: Record<string, string> = {
    "react.js": "react",
    reactjs: "react",
    "node.js": "node",
    nodejs: "node",
    "vue.js": "vue",
    vuejs: "vue",
    "next.js": "nextjs",
    aws: "amazon web services",
    gcp: "google cloud",
    typescript: "ts",
    javascript: "js",
  };
  return skills.map((s) => mappings[s] || s);
}

export default async function matchingGlobalHandler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { requirementId, orgId, role, skills } = req.query;
  const targetReqId = requirementId || "";

  if (!targetReqId) {
    return res
      .status(400)
      .json({ error: "requirementId is required for contextual matching" });
  }

  // Parse skills array
  let reqSkills: string[] = [];
  if (skills) {
    reqSkills = String(skills)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s, i, arr) => s.length > 0 && arr.indexOf(s) === i);
    reqSkills = normalizeSkills(reqSkills);
  }

  try {
    const matchedCandidates: any[] = [];
    const fallbackCandidates: any[] = [];
    const jdObject = { skills: reqSkills };

    if (adminDb) {
      try {
        const isAdmin =
          role === "admin" ||
          role === "super_admin" ||
          role === "ops_admin" ||
          orgId === "ORG-GLOBAL-HQ" ||
          orgId === "ADMIN";

        // FEDERATED CANDIDATE AGGREGATOR
        // We aggregate from multiple simulated/actual pools by querying the unified `candidatePool` index.
        const snapshot = await adminDb.collection("candidatePool").get();

        for (const doc of snapshot.docs) {
          const cand = doc.data();

          // VISIBILITY & GOVERNANCE FILTER
          let canAccess = false;
          if (isAdmin) {
            canAccess = true;
          } else if (role?.includes("client")) {
            if (
              cand.visibility === "private" ||
              cand.visibility === "vendor-only"
            ) {
              if (cand.clientId !== orgId) continue;
            }
            canAccess = true;
          } else {
            if (cand.vendorId === orgId || cand.recruiterId === orgId) {
              canAccess = true;
            } else if (
              cand.visibility === "federated" ||
              (!cand.visibility && cand.vendorId !== orgId)
            ) {
              canAccess = true;
            }
          }

          if (!canAccess) continue;

          // PIPELINE ISOLATION: 
          // If a candidate is explicitly mapped to a specific job requirement pipeline, 
          // they belong uniquely to that pipeline and must not leak into global sweeping algorithms 
          // for other un-related JDs.
          if (cand.mappedJobId && cand.mappedJobId !== targetReqId) {
            continue;
          }

          // Normalize candidate skills
          if (cand.skills && Array.isArray(cand.skills)) {
            cand.skills = normalizeSkills(
              cand.skills.map((s: string) => s.toLowerCase()),
            );
          }

          // Execute contextual semantic mapping
          const matchResult = await runComprehensiveMatch(jdObject, cand);

          // AI RERANKING Factors (Boosts)
          let enhancedScore = matchResult.overallScore;

          if (cand.experience && parseInt(cand.experience) > 5)
            enhancedScore += 5;
          if (cand.noticePeriod && parseInt(cand.noticePeriod) <= 30)
            enhancedScore += 3;
          if (cand.vendorTrustScore && cand.vendorTrustScore > 80)
            enhancedScore += 2;

          if (cand.aiMatchScore) {
              enhancedScore = cand.aiMatchScore;
          } else {
              enhancedScore = Math.min(Math.round(enhancedScore), 100);
          }

          const resultObj = {
            id: doc.id,
            candidateId: cand.candidateId || doc.id,
            name: cand.name || "Verified Talent",
            email: cand.email || "talent@vendor-network.net",
            phone: cand.phone || "+91 91000 23144",
            linkedin: cand.linkedin || "https://linkedin.com",
            skills: cand.skills || [],
            experience: cand.experience || "Not Specified",
            vendorId: cand.vendorId || "ORG-EXTERNAL-VENDOR",
            pipelineStage: cand.pipelineStage || "Match Identified",
            matchScore: enhancedScore,
            originalScore: matchResult.overallScore,
            visibilityStatus: cand.visibility || "federated",
            isGlobalMatch: true,
            breakdown: matchResult.breakdown,
            strengths: matchResult.explanation?.recruiterView?.strengths || [],
            gaps: matchResult.explanation?.recruiterView?.gaps || [],
            suitabilitySummary:
              "Match evaluated contextually against federated talent pool.",
          };

          // Requirements Filtering (Fallback)
          if (enhancedScore >= 70) {
            matchedCandidates.push(resultObj);
          } else if (enhancedScore >= 45) {
            fallbackCandidates.push(resultObj);
          }
        }
      } catch (dbErr) {
        console.warn(
          "[MATCHING_REQUIREMENT_DB_WARN] Failed to query mapped candidates:",
          dbErr,
        );
      }
    }

    const sortedMatches = matchedCandidates.sort(
      (a, b) => (b.matchScore || 0) - (a.matchScore || 0),
    );

    const sortedFallback = fallbackCandidates
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
      .slice(0, 15);

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
      fallbackMatches: sortedFallback,
      count: sortedMatches.length,
      fallbackCount: sortedFallback.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("[SCOPED_MATCHING_ERR] Core execution failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
