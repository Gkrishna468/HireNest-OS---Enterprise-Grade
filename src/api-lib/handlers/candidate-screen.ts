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
      console.log(`[AI_SCREENING_API] action=verify-evidence candidateId=${candidateId}`);
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required for evidence verification." });
      }
      const record = await CandidateEvidenceEngine.triggerScreening(candidateId, requirementId, forceRefresh === true);
      return res.status(200).json({
        success: true,
        record
      });
    }

    // 2. Action: start-interview (called by recruiter to generate link)
    if (action === "start-interview") {
      console.log(`[AI_INTERVIEW_API] action=start-interview candidateId=${candidateId} requirementId=${requirementId}`);
      if (!candidateId || !requirementId) {
        return res.status(400).json({ error: "candidateId and requirementId are required to start an AI Interview." });
      }
      const session = await AIInterviewService.startSession(candidateId, requirementId, voiceChoice);
      return res.status(200).json({
        success: true,
        session
      });
    }

    // 2a. Action: get-session (secure stub lookup by raw token, does not leak candidate details)
    if (action === "get-session") {
      const { rawToken } = req.body || {};
      if (!rawToken) {
        return res.status(400).json({ error: "rawToken is required to lookup session." });
      }
      const sessionStub = await AIInterviewService.getSessionByToken(rawToken);
      return res.status(200).json({
        success: true,
        session: sessionStub
      });
    }

    // 2b. Action: verify-email (verifies email against linked candidate, transitions status to VERIFIED, returns full session details securely)
    if (action === "verify-email") {
      const { rawToken, email } = req.body || {};
      if (!rawToken || !email) {
        return res.status(400).json({ error: "rawToken and email are required for verification." });
      }
      const session = await AIInterviewService.verifyCandidateEmail(rawToken, email);
      return res.status(200).json({
        success: true,
        session
      });
    }

    // 2c. Action: join-interview (called by candidate to transition status to IN_PROGRESS and start interview rounds)
    if (action === "join-interview") {
      console.log(`[AI_INTERVIEW_API] action=join-interview sessionId=${sessionId}`);
      const { sessionId, voiceChoice } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required." });
      }
      const session = await AIInterviewService.joinSession(sessionId, voiceChoice || "Standard Male");
      return res.status(200).json({
        success: true,
        session
      });
    }

    // 3. Action: submit-answer
    if (action === "submit-answer") {
      console.log(`[AI_INTERVIEW_API] action=submit-answer sessionId=${sessionId}`);
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
    
    if (action) {
        return res.status(400).json({ error: `Unsupported action: ${action}` });
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
