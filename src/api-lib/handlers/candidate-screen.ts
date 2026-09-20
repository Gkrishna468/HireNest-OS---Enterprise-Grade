import { adminDb } from "../../lib/firebase-admin.js";
import { ResumeScreeningService } from "../services/ResumeScreeningService.js";
import { CandidateEvidenceEngine } from "../services/CandidateEvidenceEngine.js";
import { AIInterviewService } from "../services/AIInterviewService.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!adminDb) {
    return res.status(503).json({ error: "Firebase Admin Database not initialized." });
  }

  try {
    const { action, candidateId, requirementId, forceRefresh, sessionId, answer, voiceChoice, resumeText } = req.body || {};

    // 1. Action: verify-evidence
    if (action === "verify-evidence") {
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required for evidence verification." });
      }
      const record = await CandidateEvidenceEngine.triggerScreening(candidateId, requirementId, forceRefresh === true);
      return res.status(200).json({
        success: true,
        record
      });
    }

    // 2. Action: start-interview
    if (action === "start-interview") {
      if (!candidateId || !requirementId) {
        return res.status(400).json({ error: "candidateId and requirementId are required to start an AI Interview." });
      }
      const session = await AIInterviewService.startSession(candidateId, requirementId, voiceChoice);
      return res.status(200).json({
        success: true,
        session
      });
    }

    // 3. Action: submit-answer
    if (action === "submit-answer") {
      if (!sessionId || typeof answer !== "string") {
        return res.status(400).json({ error: "sessionId and answer are required." });
      }
      const outcome = await AIInterviewService.submitAnswer(sessionId, answer);
      return res.status(200).json({
        success: true,
        session: outcome.session,
        nextQuestion: outcome.nextQuestion,
        report: outcome.report
      });
    }

    // Default: Fallback to standard parsed resume screening
    if (!candidateId || !resumeText) {
      return res.status(400).json({ error: "candidateId and resumeText are required." });
    }

    const screeningResult = await ResumeScreeningService.screenAndEnrichCandidate(
      candidateId,
      resumeText
    );

    return res.status(200).json({
      success: true,
      candidateId,
      aiIntelligence: screeningResult
    });
  } catch (err: any) {
    console.error("[CandidateScreenAPI] Error handling candidate screen/verify action:", err);
    return res.status(500).json({ error: err.message || "Failed to process request" });
  }
}
