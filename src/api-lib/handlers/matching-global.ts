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

        const docsToEvaluate = [];

        if (isAdmin) {
          // Admin HQ: Global Graph Visibility
          const poolSnapshot = await adminDb.collection("candidatePool").get();
          poolSnapshot.docs.forEach((d: any) =>
            docsToEvaluate.push({ id: d.id, ...d.data() }),
          );
        } else if (role?.includes("client")) {
          // Client Workspace: ONLY see candidates linked to their requirements (via submissions OR mappedJobId)
          const subsSnapshot = await adminDb
            .collection("submissions")
            .where("requirementId", "==", targetReqId)
            // Note: In adminDb we don't need clientId filter if requirementId is secure, but let's be thorough
            .get();

          const candIds = new Set(subsSnapshot.docs.map(
            (doc) => doc.data().candidateId,
          ));
          
          const mappedCandsSnapshot = await adminDb
            .collection("candidatePool")
            .where("mappedJobId", "==", targetReqId)
            .get();
          
          mappedCandsSnapshot.docs.forEach((doc) => candIds.add(doc.id));

          if (candIds.size > 0) {
            const refs = Array.from(candIds).map((id) =>
              adminDb.collection("candidatePool").doc(id as string).get(),
            );
            const cands = await Promise.all(refs);
            cands.forEach((c) => {
              if (c.exists) docsToEvaluate.push({ id: c.id, ...c.data() });
            });
          }
        } else {
          // Vendor Workspace: 1. Their own candidates OR 2. Candidates mapped to them
          // Strict query isolation BEFORE ranking
          const vendorCandsSnapshot = await adminDb
            .collection("candidatePool")
            .where("vendorId", "==", orgId)
            .get();

          vendorCandsSnapshot.docs.forEach((d: any) =>
            docsToEvaluate.push({ id: d.id, ...d.data() }),
          );

          // Note: Submissions logic is implicitly covered for vendors if they submitted their own candidates,
          // but if they share candidates, we fetch their submissions too.
          const vendorSubs = await adminDb
            .collection("submissions")
            .where("vendorId", "==", orgId)
            .where("requirementId", "==", targetReqId)
            .get();
          const subCandIds = vendorSubs.docs.map(
            (doc: any) => doc.data().candidateId,
          );
          for (const cId of subCandIds) {
            if (
              !docsToEvaluate.find(
                (c: any) => c.id === cId || c.candidateId === cId,
              )
            ) {
              const candGet = await adminDb
                .collection("candidatePool")
                .doc(cId)
                .get();
              if (candGet.exists)
                docsToEvaluate.push({ id: candGet.id, ...candGet.data() });
            }
          }
        }

        for (const cand of docsToEvaluate) {
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
            id: cand.id || cand.candidateId || "unknown",
            candidateId: cand.candidateId || cand.id || "unknown",
            name: cand.fullName || cand.name || "Unknown Candidate",
            email: cand.primaryEmail || cand.email || "No Email Provided",
            phone: cand.phoneHash || cand.phone || "No Phone Provided",
            linkedin: cand.linkedin || "",
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
