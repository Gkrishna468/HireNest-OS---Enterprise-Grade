import { adminDb } from "../src/lib/firebase-admin.js";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  try {
    const { orgId, role } = req.body;
    // We fetch all requirements
    const reqsSnapshot = await adminDb.collection("requirements_public").get();
    const requirements = reqsSnapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data(),
    }));

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
      const candidateSummary = `Name: ${cand.fullName || cand.name}
Role: ${cand.role || 'Undefined'}
Skills: ${(cand.skills || []).join(", ")}
Experience: ${cand.experience || "N/A"}
Resume: ${cand.resumeText ? cand.resumeText.slice(0, 1500) : "N/A"}`;

      for (const reqObj of requirements) {
        // Skip if already in client submission for this requirement
        // "if they are in client submission dont do anything"
        const hasSubmission = submissions.some(
          (sub: any) =>
            sub.requirementId === reqObj.id && sub.candidateId === (cand.candidateId || cand.id)
        );

        if (hasSubmission) {
          continue; // Do not touch submitted candidates
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
