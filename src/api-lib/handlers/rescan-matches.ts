import { adminDb } from "../../lib/firebase-admin.js";
import { GoogleGenAI } from "@google/genai";
import { getScopedCandidateUniverse } from "../utils/governance.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export async function runMatchIntelligenceEngine(reqId?: string, orgId?: string, role?: string) {
    if (!adminDb) return 0;
    
    // We fetch requirements. If reqId is provided, we fetch only that one.
    let requirements: any[] = [];
    if (reqId) {
      const docRef = await adminDb.collection("requirements_public").doc(reqId).get();
      if (docRef.exists) {
        requirements = [{ id: docRef.id, ...docRef.data() }];
        
        // Delete old matches for this requirement since we are refreshing
        const oldMatches = await adminDb.collection('candidate_matches').where('requirementId', '==', reqId).get();
        for (const doc of oldMatches.docs) {
            await doc.ref.delete();
        }
      } else {
        throw new Error("Requirement not found");
      }
    } else {
       // Global rescan (currently discouraged but supported)
       const reqsSnapshot = await adminDb.collection("requirements_public").get();
       requirements = reqsSnapshot.docs.map((d: any) => ({
         id: d.id,
         ...d.data(),
       }));
    }

    // Fetch all candidates
    const activeCandidates = await getScopedCandidateUniverse(adminDb, "candidatePool", role, orgId).get();
    
    const candidates = activeCandidates.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

    // Fetch all submissions to know who is already submitted
    const subsSnapshot = await adminDb.collection("submissions").get();
    const submissions = subsSnapshot.docs.map((d: any) => d.data());

    let matchUpdatesCount = 0;

    for (const cand of candidates) {
      // 3. Auto-remove/exclude archived, deleted, or blacklisted candidates
      const isArchived = cand.status === 'archived' || cand.isArchived;
      const isDeleted = cand.status === 'deleted' || cand.status === "DELETED" || cand.isDeleted || cand.isActive === false || cand.active === false;
      const isBlacklisted = cand.status === 'blacklisted' || cand.isBlacklisted;
      
      if (isArchived || isDeleted || isBlacklisted) {
         continue; 
      }

      for (const reqObj of requirements) {
        // Exclude if already submitted
        const alreadySubmitted = submissions.find(
          (s: any) => s.requirementId === reqObj.id && s.candidateId === cand.id
        );
        if (alreadySubmitted) continue;

        // Create Summaries for AI
        const jdSummary = `Title: ${reqObj.title}
Role: ${reqObj.role || "N/A"}
Org: ${reqObj.clientId || reqObj.orgId || "N/A"}
Must Have Skills: ${(reqObj.mustHaveSkills || []).join(", ")}
Good To Have Skills: ${(reqObj.goodToHaveSkills || []).join(", ")}
Description: ${reqObj.description || "N/A"}
Experience: ${reqObj.experience || reqObj.yearsOfExperience || "N/A"}`;

        const candidateSummary = `Name: ${cand.name || "N/A"}
Title: ${cand.title || cand.role || "N/A"}
Vendor: ${cand.vendorId || cand.orgId || "N/A"}
Skills: ${(cand.skills || []).join(", ")}
Experience: ${reqObj.experience || reqObj.yearsOfExperience || "N/A"}`;

        const prompt = `You are a recruitment AI.
Score the match between this Candidate and this Job Description out of 100.
Also provide a 1-sentence summary of the fit.

Job Description:
${jdSummary}

Candidate:
${candidateSummary}

Return JSON strictly in this format:
{"matchScore": 85, "summary": "Strong fit based on React and Node.js experience.", "strengths": ["skill 1"], "missingSkills": ["skill 2"], "breakdown": {"skillsScore": 90, "experienceScore": 80, "domainScore": 80, "locationScore": 100}}`;

        try {
          const response = await ai.models.generateContent({
             model: "gemini-3.5-flash",
             contents: prompt,
             config: { responseMimeType: "application/json" }
          });
          const resultText = response.text;
          const resultJson = JSON.parse(resultText || "{}");
          const mScore = resultJson.matchScore || 0;
          
          if (mScore > 0) {
             const matchResult = {
                canonicalRequirementId: reqObj.id,
                requirementId: reqObj.id,
                tenantId: reqObj.tenantId || cand.tenantId || "TENANT-HQ",
                matchScore: mScore,
                summary: resultJson.summary || "AI Rescan Completed",
                strengths: resultJson.strengths || [],
                missingSkills: resultJson.missingSkills || [],
                breakdown: resultJson.breakdown || { skillsScore: mScore, experienceScore: mScore, domainScore: mScore, locationScore: mScore },
             };
             
             const matchId = `${cand.id}_${reqObj.id}`;
             const vendorId = cand.vendorId || cand.orgId || "UNKNOWN";
             // Save to core collection "candidate_matches"
             await adminDb.collection("candidate_matches").doc(matchId).set({
                 ...matchResult,
                 candidateId: cand.id,
                 vendorId: vendorId,
                 source: "MATCH_ENGINE_V1",
                 generatedAt: new Date().toISOString()
             });

             // Create match opportunity
             const vendorPerformanceScore = 85;
             let reqAgeDays = 2;
             if (reqObj.createdAt) {
                 const created = new Date(reqObj.createdAt);
                 reqAgeDays = Math.max(1, Math.floor((new Date().getTime() - created.getTime()) / (1000 * 3600 * 24)));
             }
             const prob = Math.round((mScore * 0.5) + (vendorPerformanceScore * 0.3) - (reqAgeDays * 0.5));
             const placementProbability = Math.max(5, Math.min(95, prob));
             
             let forecastRevenue = 0;
             if (reqObj.financials && reqObj.financials.clientBilling && reqObj.financials.commissionPercent) {
                 forecastRevenue = (reqObj.financials.clientBilling * (reqObj.financials.commissionPercent / 100));
             }
             const expectedRevenue = Math.round(forecastRevenue * (placementProbability / 100));
             
             const oppId = `MO-${matchId}`;
             await adminDb.collection("match_opportunities").doc(oppId).set({
                 opportunityId: oppId,
                 candidateId: cand.id,
                 requirementId: reqObj.id,
                 vendorId: vendorId,
                 tenantId: reqObj.tenantId || cand.tenantId || "TENANT-HQ",
                 matchScore: mScore,
                 status: "DISCOVERED",
                 forecastRevenue,
                 placementProbability,
                 expectedRevenue,
                 createdAt: new Date().toISOString()
             });

             matchUpdatesCount++;
          }
        } catch (genErr) {
          console.error("AI Gen Error for candidate:", cand.id, genErr);
        }
      }
    }

    // 4. Generate requirement_match_index
    for (const reqObj of requirements) {
        const matchesSnap = await adminDb.collection("candidate_matches").where("requirementId", "==", reqObj.id).get();
        let topScore = 0;
        let totalMatches = matchesSnap.size;
        matchesSnap.docs.forEach((doc: any) => {
             const data = doc.data();
             if (data.matchScore > topScore) topScore = data.matchScore;
        });

        await adminDb.collection("requirement_match_index").doc(reqObj.id).set({
             requirementId: reqObj.id,
             totalMatches: totalMatches,
             topMatchScore: topScore,
             lastCalculated: new Date().toISOString()
        });
    }

    return matchUpdatesCount;
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  if (!adminDb) return res.status(503).json({ success: false, error: "Firebase Service Account configuration is missing. Cannot perform requirement refresh in client fallback mode." });

  try {
    const { orgId, role, reqId } = req.body;
    const matchUpdatesCount = await runMatchIntelligenceEngine(reqId, orgId, role);
    return res.status(200).json({ success: true, matchUpdatesCount });
  } catch (e: any) {
    console.error("Rescan Error:", e);
    return res.status(500).json({ error: e.message });
  }
}
