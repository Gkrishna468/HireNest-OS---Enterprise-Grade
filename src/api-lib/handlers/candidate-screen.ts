import crypto from "node:crypto";
import { adminDb } from "../../lib/firebase-admin.js";
import { ResumeScreeningService } from "../services/ResumeScreeningService.js";
import { CandidateEvidenceEngine } from "../services/CandidateEvidenceEngine.js";
import { AIInterviewService, hashToken } from "../services/AIInterviewService.js";
import { InterviewOrchestrationService } from "../services/InterviewOrchestrationService.js";
import { EventBus } from "../services/EventBus.js";
import { normalizeLiveKitWebSocketUrl, normalizeLiveKitHttpUrl } from "../../services/livekitConfigurationService.js";

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
      
      const session = await AIInterviewService.startSession(candidateId, requirementId, voiceChoice);

      // Create Interview via Orchestration
      const interview = await InterviewOrchestrationService.createAIInterview({
          type: "AI_SCREENING",
          candidateId,
          submissionId: req.body.submissionId || "manual",
          requirementId,
          organizationId: orgId || "GLOBAL",
          createdBy: "SYSTEM",
          createdByRole: "ADMIN",
          sessionId: session.id,
          scheduledStart: req.body.scheduledStart || new Date().toISOString(),
          meetingProvider: "NONE",
          meetingLink: undefined
      });

      await InterviewOrchestrationService.startInterview(interview.interviewId, session.id);

      // Update interview doc with explicit LiveKit metadata & secure candidate join token
      await adminDb.collection("interviews").doc(interview.interviewId).set({
        transport: "LIVEKIT",
        livekitAgentName: "hirenest-ai-interviewer",
        livekitRoomName: session.id,
        aiSessionId: session.id,
        rawToken: session.rawToken,
        candidateJoinUrl: `/ai-interview/${session.rawToken}`,
        meetingProvider: null,
        meetingLink: null,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      return res.status(200).json({ 
        success: true, 
        interview: {
          ...interview,
          transport: "LIVEKIT",
          livekitRoomName: session.id,
          candidateJoinUrl: `/ai-interview/${session.rawToken}`
        }, 
        session 
      });
    }

    // Action: send-invitation
    if (action === "send-invitation") {
      const { interviewId, candidateId } = req.body || {};
      if (!interviewId) {
        return res.status(400).json({ error: "interviewId is required." });
      }

      let candidateEmail = "";
      if (candidateId && adminDb) {
        const candDoc = await adminDb.collection("candidatePool").doc(candidateId).get();
        if (candDoc.exists) {
          candidateEmail = candDoc.data()?.primaryEmail || candDoc.data()?.email || "";
        }
      }

      if (!candidateEmail) {
        return res.status(400).json({ error: "Candidate email is required to send an AI interview invitation." });
      }

      if (adminDb) {
        const interviewRef = adminDb.collection("interviews").doc(interviewId);
        const interviewDoc = await interviewRef.get();
        const rawToken = interviewDoc.exists ? interviewDoc.data()?.rawToken : null;
        const joinUrl = rawToken ? `https://os.hirenestworkforce.com/ai-interview/${rawToken}` : (interviewDoc.data()?.candidateJoinUrl || `/ai-interview/${interviewId}`);

        await interviewRef.set({
          status: "INVITED",
          invitationSentAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        return res.status(200).json({
          success: true,
          invitationSent: true,
          recipientEmail: candidateEmail,
          joinUrl
        });
      }

      return res.status(200).json({ success: true, invitationSent: true, recipientEmail: candidateEmail });
    }

    // 2a. Action: get-session
    if (action === "get-session") {
      const { rawToken } = req.body || {};
      const cleanRawToken = typeof rawToken === "string" ? rawToken.trim() : "";
      console.log("[CandidateScreenAPI] get-session request:", {
        action: "get-session",
        hasRawToken: Boolean(cleanRawToken),
        rawTokenLength: cleanRawToken.length
      });
      if (!cleanRawToken) {
        return res.status(400).json({
          success: false,
          errorCode: "MISSING_RAW_TOKEN",
          error: "rawToken is required to lookup session."
        });
      }
      try {
        const sessionStub = await AIInterviewService.getSessionByToken(cleanRawToken);
        return res.status(200).json({
          success: true,
          session: sessionStub,
          sessionStatus: sessionStub.status
        });
      } catch (err: any) {
        const errMsg = err.message || "Failed to lookup interview session.";
        if (errMsg.includes("not found")) {
          return res.status(404).json({
            success: false,
            errorCode: "INTERVIEW_NOT_FOUND",
            error: errMsg
          });
        }
        if (errMsg.includes("expired")) {
          return res.status(403).json({
            success: false,
            errorCode: "INTERVIEW_EXPIRED",
            sessionStatus: "EXPIRED",
            error: errMsg
          });
        }
        if (errMsg.includes("revoked")) {
          return res.status(403).json({
            success: false,
            errorCode: "INTERVIEW_REVOKED",
            sessionStatus: "REVOKED",
            error: errMsg
          });
        }
        return res.status(400).json({
          success: false,
          errorCode: "GET_SESSION_FAILED",
          error: errMsg
        });
      }
    }

    // 2b. Action: verify-email
    if (action === "verify-email") {
      const { rawToken, email } = req.body || {};
      const cleanRawToken = typeof rawToken === "string" ? rawToken.trim() : "";
      if (!cleanRawToken || !email) {
        return res.status(400).json({ error: "rawToken and email are required for verification." });
      }
      const session = await AIInterviewService.verifyCandidateEmail(cleanRawToken, email);
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
      const { rawToken, consentVersion } = req.body || {};
      const cleanRawToken = typeof rawToken === "string" ? rawToken.trim() : "";
      console.log("[CandidateScreenAPI] record-consent request:", {
        action: "record-consent",
        hasRawToken: Boolean(cleanRawToken),
        rawTokenLength: cleanRawToken.length,
        sessionIdHashPresent: Boolean(cleanRawToken)
      });
      if (!cleanRawToken) {
        return res.status(400).json({
          success: false,
          errorCode: "MISSING_RAW_TOKEN",
          error: "rawToken is required to record consent."
        });
      }

      const sessionId = hashToken(cleanRawToken);
      const docRef = adminDb.collection("ai_interview_sessions").doc(sessionId);
      const snapshot = await docRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({
          success: false,
          errorCode: "INTERVIEW_NOT_FOUND",
          error: "Interview invitation is invalid or not found."
        });
      }

      const sessionData = snapshot.data() || {};

      // Validate expiration and terminal states
      if (sessionData.expiresAt && new Date() > new Date(sessionData.expiresAt) && sessionData.status !== "COMPLETED") {
        await docRef.update({ status: "EXPIRED", updatedAt: new Date().toISOString() });
        return res.status(403).json({
          success: false,
          errorCode: "INTERVIEW_EXPIRED",
          sessionStatus: "EXPIRED",
          error: "This interview invitation has expired."
        });
      }

      if (sessionData.status === "REVOKED") {
        return res.status(403).json({
          success: false,
          errorCode: "INTERVIEW_REVOKED",
          sessionStatus: "REVOKED",
          error: "This interview invitation has been revoked."
        });
      }

      if (sessionData.status === "COMPLETED") {
        return res.status(409).json({
          success: false,
          errorCode: "INTERVIEW_ALREADY_COMPLETED",
          sessionStatus: "COMPLETED",
          error: "This interview has already been completed."
        });
      }

      const timestamp = new Date().toISOString();
      const version = consentVersion || "v1.0";

      // Idempotency check: if session is ALREADY IN_PROGRESS with consentGiven=true, return success
      if (sessionData.status === "IN_PROGRESS" && sessionData.consentGiven === true) {
        console.log(`[CandidateScreenAPI] record-consent idempotent hit for session: ${sessionId}`);
        return res.status(200).json({
          success: true,
          alreadyConsented: true,
          consentGiven: true,
          sessionStatus: "IN_PROGRESS",
          consentTimestamp: sessionData.consentTimestamp || timestamp,
          consentVersion: sessionData.consentVersion || version
        });
      }

      await docRef.update({
        consentGiven: true,
        consentTimestamp: timestamp,
        consentVersion: version,
        status: "IN_PROGRESS",
        updatedAt: timestamp
      });

      // Dispatch LiveKit Agent via Agent Dispatch API
      const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
      const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
      const rawLkUrl = (process.env.LIVEKIT_URL || "").trim();

      if (apiKey && apiSecret && rawLkUrl) {
        const httpHost = normalizeLiveKitHttpUrl(rawLkUrl);
        try {
          const { AgentDispatchClient } = await import("livekit-server-sdk");
          const dispatchClient = new AgentDispatchClient(httpHost, apiKey, apiSecret);
          await dispatchClient.createDispatch(sessionId, "hirenest-ai-interviewer", {
            metadata: JSON.stringify({ 
              sessionId, 
              interviewId: sessionData?.interviewId || "",
              candidateId: sessionData?.candidateId || "",
              requirementId: sessionData?.requirementId || ""
            })
          });
          console.log(`[CandidateScreenAPI] Successfully dispatched LiveKit Agent 'hirenest-ai-interviewer' to room: ${sessionId}`);
        } catch (dispatchErr: any) {
          console.warn("[CandidateScreenAPI] LiveKit Agent dispatch API warning:", dispatchErr?.message || dispatchErr);
          // Fallback: Generate token & dispatch via Twirp HTTP post if AgentDispatchClient class failed
          try {
            const { AccessToken } = await import("livekit-server-sdk");
            const at = new AccessToken(apiKey, apiSecret, { identity: "admin_dispatcher", ttl: 300 });
            at.addGrant({ roomJoin: true, room: sessionId, canPublish: true, canSubscribe: true });
            const jwt = await at.toJwt();

            const resp = await fetch(`${httpHost}/twirp/livekit.AgentDispatch/CreateDispatch`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${jwt}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                room: sessionId,
                agent_name: "hirenest-ai-interviewer",
                metadata: JSON.stringify({ sessionId, interviewId: sessionData?.interviewId || "" })
              })
            });
            if (resp.ok) {
              console.log(`[CandidateScreenAPI] Twirp Agent Dispatch succeeded for room: ${sessionId}`);
            } else {
              const errBody = await resp.text();
              console.warn("[CandidateScreenAPI] Twirp Agent Dispatch response not ok:", resp.status, errBody);
            }
          } catch (twirpErr: any) {
            console.warn("[CandidateScreenAPI] Twirp Agent Dispatch fallback failed:", twirpErr?.message || twirpErr);
          }
        }
      } else {
        console.warn("[CandidateScreenAPI] LiveKit credentials not configured; agent dispatch skipped.");
      }

      return res.status(200).json({
        success: true,
        consentGiven: true,
        sessionStatus: "IN_PROGRESS",
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
      const { rawToken, participantName, isRecruiter } = req.body || {};
      const cleanRawToken = typeof rawToken === "string" ? rawToken.trim() : "";
      console.log("[CandidateScreenAPI] livekit-token request:", {
        action: "livekit-token",
        hasRawToken: Boolean(cleanRawToken),
        rawTokenLength: cleanRawToken.length
      });
      if (!cleanRawToken) {
        return res.status(400).json({
          success: false,
          errorCode: "MISSING_RAW_TOKEN",
          error: "rawToken is required to issue LiveKit token."
        });
      }

      const sessionId = hashToken(cleanRawToken);
      const sessDoc = await adminDb.collection("ai_interview_sessions").doc(sessionId).get();
      if (!sessDoc.exists) {
        return res.status(404).json({
          success: false,
          errorCode: "INTERVIEW_NOT_FOUND",
          error: "Interview invitation is invalid or not found."
        });
      }

      const sessionData = sessDoc.data() || {};

      if (sessionData.expiresAt && new Date() > new Date(sessionData.expiresAt) && sessionData.status !== "COMPLETED") {
        await adminDb.collection("ai_interview_sessions").doc(sessionId).update({ status: "EXPIRED", updatedAt: new Date().toISOString() });
        return res.status(403).json({
          success: false,
          errorCode: "INTERVIEW_EXPIRED",
          sessionStatus: "EXPIRED",
          error: "This interview invitation has expired."
        });
      }

      if (sessionData.status === "REVOKED") {
        return res.status(403).json({
          success: false,
          errorCode: "INTERVIEW_REVOKED",
          sessionStatus: "REVOKED",
          error: "This interview invitation has been revoked."
        });
      }

      if (sessionData.status === "COMPLETED") {
        return res.status(409).json({
          success: false,
          errorCode: "INTERVIEW_ALREADY_COMPLETED",
          sessionStatus: "COMPLETED",
          error: "This interview has already been completed."
        });
      }

      const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
      const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
      const rawLkUrl = (process.env.LIVEKIT_URL || "").trim();

      if (!apiKey || !apiSecret || !rawLkUrl) {
        return res.status(503).json({ 
          success: false,
          errorCode: "LIVEKIT_NOT_CONFIGURED", 
          error: "Realtime interview service is temporarily unconfigured. Please contact support." 
        });
      }

      const wsUrl = normalizeLiveKitWebSocketUrl(rawLkUrl);
      const httpUrl = normalizeLiveKitHttpUrl(rawLkUrl);
      const participantIdentity = isRecruiter ? `recruiter_${participantName || "Recruiter"}` : `candidate_${sessionId}`;

      try {
        const { AccessToken } = await import("livekit-server-sdk");
        const at = new AccessToken(apiKey, apiSecret, {
          identity: participantIdentity,
          ttl: 1800
        });

        at.addGrant({
          roomJoin: true,
          room: sessionId,
          canPublish: true,
          canSubscribe: true,
          canPublishData: true
        });

        const token = await at.toJwt();

        // Server-side JWT Claims Verification & Fingerprinting
        let tokenFingerprint = "";
        try {
          tokenFingerprint = crypto.createHash("sha256").update(token).digest("hex").slice(0, 12);
          const payloadBase64 = token.split(".")[1];
          const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8"));
          const nowSeconds = Math.floor(Date.now() / 1000);
          const claimsValid = Boolean(
            payload.iss === apiKey &&
            payload.sub === participantIdentity &&
            payload.exp > nowSeconds &&
            payload.video?.roomJoin === true &&
            payload.video?.room === sessionId
          );
          console.log(`[CandidateScreenAPI] Generated LiveKit JWT fingerprint=${tokenFingerprint} length=${token.length} claimsValid=${claimsValid}`);
          if (!claimsValid) {
            console.error("[CandidateScreenAPI] Generated LiveKit token failed internal claims check.");
          }
        } catch (claimsErr: any) {
          console.warn("[CandidateScreenAPI] JWT claim parsing warning:", claimsErr.message);
        }

        // Server-side Preflight Ping against LiveKit validation endpoint /rtc/validate
        try {
          const lkCheckRes = await fetch(`${httpUrl}/rtc/validate?access_token=${token}`);
          if (lkCheckRes.status === 401) {
            console.error(`[CandidateScreenAPI] LiveKit server rejected token (401 Unauthorized) on /rtc/validate. fingerprint=${tokenFingerprint}`);
            return res.status(401).json({
              success: false,
              errorCode: "LIVEKIT_TOKEN_REJECTED",
              error: "LiveKit Cloud rejected access token authorization (401 Unauthorized). Check credentials alignment.",
              diagnostics: {
                status: 401,
                lkHost: httpUrl,
                apiKeyPrefix: apiKey.slice(0, 4),
                apiKeySuffix: apiKey.slice(-4),
                secretLength: apiSecret.length,
                secretSha256: crypto.createHash("sha256").update(apiSecret).digest("hex").slice(0, 12) + "...",
                roomName: sessionId,
                participantIdentity,
                tokenFingerprint,
                tokenLength: token.length
              }
            });
          }
        } catch (lkPingErr: any) {
          console.warn("[CandidateScreenAPI] LiveKit preflight /rtc/validate ping warning:", lkPingErr.message);
        }

        return res.status(200).json({
          success: true,
          token,
          tokenFingerprint,
          tokenLength: token.length,
          roomName: sessionId,
          url: wsUrl,
          sessionStatus: sessionData.status || "IN_PROGRESS"
        });
      } catch (err: any) {
        console.error("[CandidateScreenAPI] livekit-server-sdk token generation failed:", err);
        return res.status(500).json({
          success: false,
          errorCode: "LIVEKIT_TOKEN_GENERATION_FAILED",
          error: "Failed to generate LiveKit access token: " + err.message
        });
      }
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

    // 6. Action: fail-terminate / force-end
    if (action === "fail-terminate" || action === "force-end") {
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
      session.status = "FORCE_ENDED";
      session.terminationType = "ADMIN_FORCE_ENDED";
      session.terminationReason = terminationReason || "ADMIN_FORCE_ENDED";
      session.terminatedBy = terminatedBy || "Recruiter";
      session.terminatedAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();

      await docRef.set(session);

      // Disconnect candidate and AI agent by deleting LiveKit room
      try {
        const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
        const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
        const rawLkUrl = (process.env.LIVEKIT_URL || "").trim();
        if (apiKey && apiSecret && rawLkUrl) {
          const httpUrl = normalizeLiveKitHttpUrl(rawLkUrl);
          const { RoomServiceClient } = await import("livekit-server-sdk");
          const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);
          await roomService.deleteRoom(sessionId);
          console.log(`[CandidateScreenAPI] Successfully deleted LiveKit room ${sessionId} on Force End.`);
        }
      } catch (lkDelErr: any) {
        console.warn(`[CandidateScreenAPI] Notice on deleting LiveKit room ${sessionId}:`, lkDelErr.message);
      }

      await CandidateEvidenceEngine.transitionState(
        sessionId,
        session.candidateId,
        session.requirementId,
        "AI_INTERVIEW_IN_PROGRESS" as any,
        "AI_INTERVIEW_FAILED" as any,
        `Session force-ended by Recruiter (${terminatedBy || "Recruiter"}).`
      );

      EventBus.emit("AI_INTERVIEW_FORCE_ENDED" as any, {
        sessionId,
        candidateId: session.candidateId,
        requirementId: session.requirementId,
        terminatedBy: terminatedBy || "Recruiter",
        terminatedAt: session.terminatedAt
      });

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

    // 8. Action: delete-report (Soft Delete L1 Report)
    if (action === "delete-report") {
      const { sessionId, reportId, deletionReason, deletedBy } = req.body || {};
      const targetId = reportId || sessionId;
      if (!targetId) {
        return res.status(400).json({ error: "reportId or sessionId is required." });
      }

      const reportRef = adminDb.collection("ai_interview_reports").doc(targetId);
      const snapshot = await reportRef.get();
      if (!snapshot.exists) {
        return res.status(404).json({ error: "L1 report not found." });
      }

      const nowIso = new Date().toISOString();
      await reportRef.update({
        isDeleted: true,
        deletedAt: nowIso,
        deletedBy: deletedBy || "Recruiter Admin",
        deletionReason: deletionReason || "Recruiter requested soft deletion of L1 screening report."
      });

      return res.status(200).json({ success: true, message: "L1 screening report soft-deleted successfully.", reportId: targetId });
    }

    // 8b. Action: get-l1-report
    if (action === "get-l1-report") {
      let { sessionId, candidateId, requirementId } = req.body || {};

      let sessionData: any = null;
      let reportData: any = null;

      if (sessionId) {
        const sessDoc = await adminDb.collection("ai_interview_sessions").doc(sessionId).get();
        if (sessDoc.exists) sessionData = { id: sessDoc.id, ...sessDoc.data() };

        const repDoc = await adminDb.collection("ai_interview_reports").doc(sessionId).get();
        if (repDoc.exists) reportData = { id: repDoc.id, ...repDoc.data() };
      }

      if (!reportData && candidateId && requirementId) {
        const sessSnap = await adminDb.collection("ai_interview_sessions")
          .where("candidateId", "==", candidateId)
          .where("requirementId", "==", requirementId)
          .limit(1)
          .get();
        if (!sessSnap.empty) {
          sessionData = { id: sessSnap.docs[0].id, ...sessSnap.docs[0].data() };
          sessionId = sessSnap.docs[0].id;
          const repDoc = await adminDb.collection("ai_interview_reports").doc(sessionId).get();
          if (repDoc.exists) reportData = { id: repDoc.id, ...repDoc.data() };
        }
      }

      const effectiveCandidateId = candidateId || sessionData?.candidateId;
      const effectiveRequirementId = requirementId || sessionData?.requirementId;

      let clientSubmissionStatus = "NOT_SUBMITTED";
      let submissionData: any = null;

      if (effectiveCandidateId && effectiveRequirementId) {
        const subId = `sub_${effectiveCandidateId}_${effectiveRequirementId}`;
        const subDoc = await adminDb.collection("client_submissions").doc(subId).get();
        if (subDoc.exists) {
          submissionData = { id: subDoc.id, ...subDoc.data() };
          if (submissionData?.status === "SUBMITTED") {
            clientSubmissionStatus = "SUBMITTED";
          }
        }
      }

      let candidateName = "Candidate";
      let jobTitle = "Requirement";

      if (effectiveCandidateId) {
        const cDoc = await adminDb.collection("candidatePool").doc(effectiveCandidateId).get();
        if (cDoc.exists) {
          const c = cDoc.data() || {};
          candidateName = c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.name || "Candidate";
        }
      }

      if (effectiveRequirementId) {
        const rDoc = await adminDb.collection("requirements").doc(effectiveRequirementId).get();
        if (rDoc.exists) {
          const r = rDoc.data() || {};
          jobTitle = r.title || r.jobTitle || "Requirement";
        }
      }

      return res.status(200).json({
        success: true,
        sessionId,
        candidateId: effectiveCandidateId,
        requirementId: effectiveRequirementId,
        report: reportData,
        session: sessionData,
        clientSubmissionStatus,
        submissionData,
        candidateName,
        jobTitle
      });
    }
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
        const data = doc.data() || {};
        if (!data.isDeleted) {
          reportsList.push({ id: doc.id, ...data });
        }
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

