import { adminDb } from "./firebase.js";

export interface SessionContext {
  sessionId: string;
  interviewId: string;
  candidateId: string;
  candidateName?: string;
  submissionId: string;
  requirementId: string;
  consent: {
    consentGiven: boolean;
    consentTimestamp: string;
    consentVersion: string;
  };
}

export class SessionService {
  /**
   * Load active session details and ensure zero-trust consent checks have been completed
   */
  async loadAndVerifySession(sessionId: string): Promise<SessionContext> {
    const docRef = adminDb.collection("ai_interview_sessions").doc(sessionId);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      throw new Error(`AI_INTERVIEW_SESSION_NOT_FOUND: The requested session ${sessionId} does not exist.`);
    }

    const data = snapshot.data();
    if (!data) {
      throw new Error("AI_INTERVIEW_SESSION_DEGRADED: Session record is unreadable.");
    }

    if (!data.consentGiven) {
      throw new Error("AI_INTERVIEW_CONSENT_REQUIRED: Consent must be recorded in the UI prior to spawning media workers.");
    }

    return {
      sessionId: data.id || sessionId,
      interviewId: data.interviewId || "",
      candidateId: data.candidateId || "",
      submissionId: data.submissionId || "",
      requirementId: data.requirementId || "",
      consent: {
        consentGiven: !!data.consentGiven,
        consentTimestamp: data.consentTimestamp || "",
        consentVersion: data.consentVersion || ""
      }
    };
  }

  /**
   * Update the live connection/conversational state of the server-side agent
   */
  async updateAgentState(sessionId: string, state: "CONNECTING" | "CONNECTED" | "LISTENING" | "THINKING" | "SPEAKING" | "DISCONNECTED" | "ERROR" | "DEGRADED", errorReason?: string): Promise<void> {
    console.log(`[SessionService] Syncing Agent state [${state}] for session: ${sessionId}...`);
    try {
      const docRef = adminDb.collection("ai_interview_sessions").doc(sessionId);
      await docRef.update({
        agentState: state,
        agentLastError: errorReason || null,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error("[SessionService] Failed to write state transition to Firestore:", err.message);
    }
  }

  /**
   * Record a transcribed dialog event back to the single source of truth transcript index
   */
  async logTranscriptEvent(ctx: SessionContext, speaker: "AI" | "CANDIDATE", text: string, round: number, questionId: string, sequenceNumber: number): Promise<void> {
    const transcriptId = `tr_${ctx.sessionId}_${sequenceNumber}`;
    const timestamp = new Date().toISOString();

    const payload = {
      transcriptId,
      sessionId: ctx.sessionId,
      interviewId: ctx.interviewId,
      candidateId: ctx.candidateId,
      speaker,
      timestamp,
      round,
      questionId,
      sequenceNumber,
      text: text.trim()
    };

    console.log(`[SessionService] Writing ${speaker} transcript: "${text.substring(0, 40)}..."`);
    try {
      await adminDb.collection("candidate_interview_transcripts").doc(transcriptId).set(payload);
    } catch (err: any) {
      console.error("[SessionService] Failed to record transcript log:", err.message);
    }
  }
}
