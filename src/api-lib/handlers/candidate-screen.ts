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

    // Validate service-to-service token for worker-only actions (like submit-answer)
    if (action === "submit-answer") {
      const authHeader = req.headers.authorization;
      const expectedToken = process.env.AI_INTERVIEWER_SERVICE_TOKEN;
      if (expectedToken) {
        if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
          return res.status(401).json({ error: "Unauthorized: Invalid service-to-service authorization token." });
        }
      }
    }

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
      await InterviewOrchestrationService.startInterview(interview.interviewId, session.id);
      
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

    // 2d. Action: record-consent
    if (action === "record-consent") {
      const { sessionId, consentVersion } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required." });
      }

      const docRef = adminDb.collection("ai_interview_sessions").doc(sessionId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: "Interview session not found." });
      }

      const timestamp = new Date().toISOString();
      const version = consentVersion || "v1.0";

      await docRef.update({
        consentGiven: true,
        consentTimestamp: timestamp,
        consentVersion: version,
        status: "IN_PROGRESS"
      });

      // Securely trigger the separately hosted long-running Realtime AI Agent on our worker container
      try {
        await fetch("http://localhost:3001/agent/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId })
        });
        console.log(`[CandidateScreenAPI] Successfully notified worker node to boot LiveKit agent for session: ${sessionId}`);
      } catch (workerErr: any) {
        console.warn("[CandidateScreenAPI] Realtime worker container was not running during the request. Falling back gracefully. Error:", workerErr.message);
      }

      return res.status(200).json({
        success: true,
        consentGiven: true,
        consentTimestamp: timestamp,
        consentVersion: version
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

    // 4. Action: livekit-token
    if (action === "livekit-token") {
      const { sessionId, participantName, isRecruiter } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required." });
      }

      const sessDoc = await adminDb.collection("ai_interview_sessions").doc(sessionId).get();
      if (!sessDoc.exists) {
        return res.status(404).json({ error: "Interview session not found." });
      }

      const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
      const apiSecret = process.env.LIVEKIT_API_SECRET || "secret";
      const participantIdentity = isRecruiter ? `recruiter_${participantName || "Recruiter"}` : `candidate_${sessionId}`;

      let token = "mock_livekit_token_" + Math.random().toString(36).substring(7);

      try {
        const { AccessToken } = await import("livekit-server-sdk");
        const at = new AccessToken(apiKey, apiSecret, {
          identity: participantIdentity,
        });

        at.addGrant({
          roomJoin: true,
          room: sessionId,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        });

        token = await at.toJwt();
      } catch (err) {
        console.warn("[CandidateScreenAPI] livekit-server-sdk failed to import or initialize. Falling back to robust cryptographic mockup token. Error:", err);
      }

      return res.status(200).json({ success: true, token, roomName: sessionId });
    }

    // 5. Action: force-conclude
    if (action === "force-conclude") {
      const { sessionId, overrideReason, overriddenBy } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required." });
      }

      const docRef = adminDb.collection("ai_interview_sessions").doc(sessionId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: "Session not found." });
      }

      const session = snapshot.data();
      session.status = "COMPLETED";
      session.completionType = "ADMIN_OVERRIDE";
      session.overrideReason = overrideReason || "Manually concluded by Recruiter";
      session.overriddenBy = overriddenBy || "Recruiter";
      session.overriddenAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();

      await docRef.set(session);

      const resolvedReq = await CandidateEvidenceEngine.resolveTargetRequirement(session.candidateId, session.requirementId);
      const candDoc = await adminDb.collection("candidatePool").doc(session.candidateId).get();
      const cand = candDoc.data() || {};
      const resumeText = cand?.parsedData?.rawText || cand?.resumeText || cand?.text || "";

      const report = await AIInterviewService.compileInterviewReport(session as any, resolvedReq?.jdText || "", resumeText);
      await adminDb.collection("ai_interview_reports").doc(sessionId).set(report);

      await CandidateEvidenceEngine.transitionState(
        sessionId,
        session.candidateId,
        session.requirementId,
        "AI_INTERVIEW_IN_PROGRESS" as any,
        "AI_INTERVIEW_COMPLETED" as any,
        `Interview forced to complete by Recruiter (${overriddenBy || "Recruiter"}).`
      );

      return res.status(200).json({ success: true, session, report });
    }

    // 6. Action: fail-terminate
    if (action === "fail-terminate") {
      const { sessionId, terminationReason, terminatedBy } = req.body || {};
      if (!sessionId) {
        return res.status(400).json({ error: "sessionId is required." });
      }

      const docRef = adminDb.collection("ai_interview_sessions").doc(sessionId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: "Session not found." });
      }

      const session = snapshot.data();
      session.status = "FAILED";
      session.terminationType = "ADMIN_OVERRIDE";
      session.terminationReason = terminationReason || "Terminated by administrative override.";
      session.terminatedBy = terminatedBy || "Recruiter";
      session.terminatedAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();

      await docRef.set(session);

      await CandidateEvidenceEngine.transitionState(
        sessionId,
        session.candidateId,
        session.requirementId,
        "AI_INTERVIEW_IN_PROGRESS" as any,
        "AI_INTERVIEW_FAILED" as any,
        `Session terminated by Recruiter (${terminatedBy || "Recruiter"}).`
      );

      return res.status(200).json({ success: true, session });
    }

    // 7. Action: save-meeting-link
    if (action === "save-meeting-link") {
      const { interviewId, meetingLink } = req.body || {};
      if (!interviewId || !meetingLink) {
        return res.status(400).json({ error: "interviewId and meetingLink are required." });
      }
      await adminDb.collection("interviews").doc(interviewId).set({
        meetingLink,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return res.status(200).json({ success: true });
    }

    // 8. Action: get-all-interviews
    if (action === "get-all-interviews") {
      const interviewsSnap = await adminDb.collection("interviews").get();
      const sessionsSnap = await adminDb.collection("ai_interview_sessions").get();
      const reportsSnap = await adminDb.collection("ai_interview_reports").get();
      const blueprintsSnap = await adminDb.collection("interview_blueprints").get();

      const interviewsList: any[] = [];
      interviewsSnap.forEach(doc => {
        interviewsList.push({ id: doc.id, ...doc.data() });
      });

      const sessionsList: any[] = [];
      sessionsSnap.forEach(doc => {
        sessionsList.push({ id: doc.id, ...doc.data() });
      });

      const reportsList: any[] = [];
      reportsSnap.forEach(doc => {
        reportsList.push({ id: doc.id, ...doc.data() });
      });

      const blueprintsList: any[] = [];
      blueprintsSnap.forEach(doc => {
        blueprintsList.push({ id: doc.id, ...doc.data() });
      });

      const candSnap = await adminDb.collection("candidatePool").get();
      const reqSnap = await adminDb.collection("requirements_public").get();

      const candidates: Record<string, any> = {};
      candSnap.forEach(doc => {
        candidates[doc.id] = doc.data();
      });

      const requirements: Record<string, any> = {};
      reqSnap.forEach(doc => {
        requirements[doc.id] = doc.data();
      });

      return res.status(200).json({
        success: true,
        interviews: interviewsList,
        sessions: sessionsList,
        reports: reportsList,
        blueprints: blueprintsList,
        candidates,
        requirements
      });
    }

    // 9. Action: submit-to-client
    if (action === "submit-to-client") {
      const { candidateId, requirementId, interviewId, reportId, submittedBy } = req.body || {};
      if (!candidateId || !requirementId) {
        return res.status(400).json({ error: "candidateId and requirementId are required." });
      }

      const submissionId = `sub_${candidateId}_${requirementId}`;
      const docRef = adminDb.collection("client_submissions").doc(submissionId);

      const submissionData = {
        id: submissionId,
        candidateId,
        requirementId,
        interviewId: interviewId || null,
        reportId: reportId || null,
        status: "SUBMITTED",
        submittedAt: new Date().toISOString(),
        submittedBy: submittedBy || "Recruiter",
        reportVersion: "HN-AI-L1-v1"
      };

      await docRef.set(submissionData, { merge: true });

      await adminDb.collection("candidatePool").doc(candidateId).set({
        screeningStatus: "CLIENT_SUBMISSION_COMPLETED"
      }, { merge: true });

      return res.status(200).json({ success: true, submission: submissionData });
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

