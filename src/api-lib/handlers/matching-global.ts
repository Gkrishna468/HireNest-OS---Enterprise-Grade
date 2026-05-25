import { adminDb } from "../../lib/firebase-admin";
import { dispatchWorkflowEvent } from "../workflowQueue";
import { runComprehensiveMatch } from "../ai/matchingEngine";

export default async function matchingGlobalHandler(req: any, res: any) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { requirementId, skills } = req.query;
  const targetReqId = requirementId || "";

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

    // Create stripped JD object for skills-only match
    const jdObject = { skills: reqSkills };

    // Core live database candidate scanning
    if (adminDb) {
      try {
        const snapshot = await adminDb.collection("candidatePool").get();
        for (const doc of snapshot.docs) {
          const cand = doc.data();
          const candSkills: string[] = (cand.skills || []).map((s: any) =>
            String(s).trim().toLowerCase(),
          );

          const matchResult = await runComprehensiveMatch(jdObject, cand);

          if (matchResult.overallScore >= 70) {
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
              pipelineStage:
                cand.pipelineStage || "Awaiting Match Verification",
              matchScore: matchResult.overallScore,
              isGlobalMatch: true,
              breakdown: matchResult.breakdown,
              strengths: matchResult.explanation.recruiterView.strengths,
              gaps: matchResult.explanation.recruiterView.gaps,
              suitabilitySummary:
                "Match evaluated via Comprehensive Semantic Engine.",
            });
          }
        }
      } catch (dbErr) {
        console.warn(
          "[MATCHING_GLOBAL_DB_WARN] Primary Firestore connection timed out or is empty:",
          dbErr,
        );
      }
    } else {
      console.warn("[MATCHING_GLOBAL_DB_WARN] adminDb unavailable.");
    }

    // Sort to show highest scores first
    const sortedMatches = matchedCandidates
      .filter((c) => (c.matchScore || 0) >= 70)
      .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

    if (sortedMatches.length > 0) {
      try {
        await dispatchWorkflowEvent(adminDb, {
          eventType: "MATCH_FOUND",
          producer: "api/matching-global",
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
    console.error("[GLOBAL_MATCHING_ERR] Core execution failed:", error);
    return res.status(500).json({ error: error.message });
  }
}
