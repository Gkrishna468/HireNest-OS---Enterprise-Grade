import { adminDb } from "../../lib/firebase-admin.js";
import { ResumeScreeningService } from "../services/ResumeScreeningService.js";
import { CandidateEvidenceEngine } from "../services/CandidateEvidenceEngine.js";
import { AIInterviewService } from "../services/AIInterviewService.js";
import { InterviewOrchestrationService } from "../services/InterviewOrchestrationService.js";
import { EventBus } from "../services/EventBus.js";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (!adminDb) {
    return res.status(503).json({ error: "Firebase Admin Database not initialized." });
  }

  try {
    const { action, candidateId, requirementId, forceRefresh, sessionId, answer, voiceChoice, resumeText, orgId } = req.body || {};

    // 1. Action: verify-evidence
    if (action === "verify-evidence") {
      if (!candidateId) {
        return res.status(400).json({ error: "candidateId is required." });
      }
      const record = await CandidateEvidenceEngine.triggerScreening(candidateId, requirementId, forceRefresh === true);
      return res.status(200).json({ success: true, record });
    }

    // 2. Action: start-interview
    if (action === "start-interview") {
      if (!candidateId || !requirementId) {
        return res.status(400).json({ error: "candidateId and requirementId are required." });
      }
      
      // Create Interview via Orchestration
      const interview = await InterviewOrchestrationService.createAIInterview({
          type: "AI_SCREENING",
          candidateId,
          submissionId: req.body.submissionId || "manual",
          requirementId,
          organizationId: orgId || "GLOBAL",
          createdBy: "SYSTEM",
          createdByRole: "ADMIN"
      });

      const session = await AIInterviewService.startSession(candidateId, requirementId, voiceChoice);
      await InterviewOrchestrationService.startInterview(interview.interviewId, session.sessionId);
      
      return res.status(200).json({ success: true, interview, session });
    }

    // 2a. Action: get-session
    if (action === "get-session") {
      const { rawToken } = req.body || {};
      if (!rawToken) {
        return res.status(400).json({ error: "rawToken is required to lookup session." });
      }
      const sessionStub = await AIInterviewService.getSessionByToken(rawToken);
      return res.status(200).json({ success: true, session: sessionStub });
    }

    // 2b. Action: verify-email
    if (action === "verify-email") {
      const { rawToken, email } = req.body || {};
      if (!rawToken || !email) {
        return res.status(400).json({ error: "rawToken and email are required for verification." });
      }
      const session = await AIInterviewService.verifyCandidateEmail(rawToken, email);
      return res.status(200).json({ success: true, session });
    }

    // 2c. Action: join-interview
    if (action === "join-interview") {
      const { sessionId, voiceChoice } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required." });
      }
      const session = await AIInterviewService.joinSession(sessionId, voiceChoice || "Standard Male");
      return res.status(200).json({ success: true, session });
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

    if (action) {
      return res.status(400).json({ error: `Unsupported action: ${action}` });
    }
    
    // Default: Screening Flow
    if (!candidateId || !resumeText) {
      return res.status(400).json({ error: "candidateId and resumeText are required." });
    }

    await EventBus.publish("AI_SCREENING_STARTED", { candidateId, requirementId }, "candidate-screen-handler", orgId);
    
    const screeningResult = await ResumeScreeningService.screenAndEnrichCandidate(
      candidateId,
      resumeText
    );
    
    await EventBus.publish("AI_SCREENING_COMPLETED", { candidateId, requirementId, screeningResult }, "candidate-screen-handler", orgId);

    return res.status(200).json({
      success: true,
      candidateId,
      aiIntelligence: screeningResult
    });
  } catch (err: any) {
    console.error("[CandidateScreenAPI] Error:", err);
    await EventBus.publish("AI_SCREENING_FAILED", { error: err.message }, "candidate-screen-handler");
    return res.status(500).json({ error: err.message || "Failed to process request" });
  }
}

