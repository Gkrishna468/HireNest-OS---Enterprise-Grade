import { adminDb } from "../../lib/firebase-admin.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  if (!adminDb) return res.status(503).json({ success: false, error: "Firebase Service Account configuration is missing. Cannot perform requirement refresh in client fallback mode." });

  try {
    const { orgId, role, reqId } = req.body;
    
    // We fetch requirements. If reqId is provided, we fetch only that one.
    let requirements = [];
    if (reqId) {
      const docRef = await adminDb.collection("requirements_public").doc(reqId).get();
      if (docRef.exists) {
        requirements = [{ id: docRef.id, ...docRef.data() }];
        
        // Delete old matches for this requirement since we are refreshing
        const oldMatches = await adminDb.collectionGroup('ai_matches').get();
        for (const doc of oldMatches.docs) {
            if (doc.id === reqId || doc.data().requirementId === reqId) {
                await doc.ref.delete();
            }
        }
      } else {
        return res.status(404).json({ error: "Requirement not found" });
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
    const activeCandidates = await adminDb.collection("candidatePool").get();
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
      const isDeleted = cand.status === 'deleted' || cand.isDeleted;
      const isBlacklisted = cand.status === 'blacklisted' || cand.isBlacklisted;
      
      if (isArchived || isDeleted || isBlacklisted) {
        continue;
      }

      const candidateSummary = `Name: ${cand.fullName || cand.name}
Role: ${cand.role || 'Undefined'}
Skills: ${(cand.skills || []).join(", ")}
Experience: ${cand.experience || "N/A"}
Resume: ${cand.resumeText ? cand.resumeText.slice(0, 1500) : "N/A"}`;

      for (const reqObj of requirements) {
        // Skip if already in client submission for this requirement
        // "Never rematch rejected candidates" or already submitted candidates
        const candSubmissions = submissions.filter(
          (sub: any) =>
            (sub.requirementId === reqObj.id || sub.reqId === reqObj.id) && 
            (sub.candidateId === (cand.candidateId || cand.id))
        );

        let shouldSkip = false;
        if (candSubmissions.length > 0) {
            for (const s of candSubmissions) {
                const status = (s.status || "").toLowerCase();
                // Skip if it was submitted or rejected.
                if (status === 'submitted' || status.includes('rejected') || status === 'match_rejected') {
                   shouldSkip = true;
                   break;
                }
            }
            // Actually, based on previous logic, if they have ANY submission, we skip to avoid duplicate evaluations.
            shouldSkip = true;
        }

        if (shouldSkip) {
          continue; 
        }

        // Use Google API to rescan match
        const jdSummary = `Title: ${reqObj.title}
Skills: ${(reqObj.skills || []).join(", ")}
Experience: ${reqObj.experience || reqObj.yearsOfExperience || "N/A"}`;

        const prompt = `You are a recruitment AI.
Score the match between this Candidate and this Job Description out of 100.
Also provide a 1-sentence summary of the fit.

Job Description:
${jdSummary}

Candidate:
${candidateSummary}

Return JSON strictly in this format:
{"matchScore": 85, "summary": "Strong fit based on React and Node.js experience."}`;

        try {
          const response = await ai.models.generateContent({
             model: "gemini-1.5-flash",
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
                matchScore: mScore,
                summary: resultJson.summary || "AI Rescan Completed",
                lastScanned: new Date().toISOString()
             };
             
             // Save to a subcollection "ai_matches" under the candidate
             await adminDb.collection("candidatePool").doc(cand.id).collection("ai_matches").doc(reqObj.id).set(matchResult);
             matchUpdatesCount++;
          }
        } catch (genErr) {
          console.error("AI Gen Error for candidate:", cand.id, genErr);
        }
      }
    }

    return res.status(200).json({ success: true, matchUpdatesCount });
  } catch (e: any) {
    console.error("Rescan Error:", e);
    return res.status(500).json({ error: e.message });
  }
}
