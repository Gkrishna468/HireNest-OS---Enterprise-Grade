/**
 * HireNestOS Chief Recruiter AI — Shared Intelligence Service
 * Provides shared intelligence for HireNestOS and HireNest CRM via AIGateway:
 * - Evidence comparison & skill gap detection
 * - Multi-turn grounded candidate coaching
 * - Deep project questions
 * - Client requirement intake with contradiction detection
 * - Direct & vendor eligibility checks
 * - Submission readiness & recruiter next-best-action recommendations
 */

import { AIGateway } from "./AIGateway.js";
import { CandidateEvidenceEngine } from "./CandidateEvidenceEngine.js";
import { AIDataSanitizer } from "./AIDataSanitizer.js";
import { adminDb } from "../../lib/firebase-admin.js";

export interface CoachSessionMessage {
  role: "system" | "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface CoachSessionState {
  sessionId: string;
  candidateId: string;
  requirementId: string;
  history: CoachSessionMessage[];
  verifiedClaims: string[];
  unverifiedClaims: string[];
  skillGaps: string[];
  updatedAt: string;
}

export class ChiefRecruiterAI {
  private static memorySessions: Map<string, CoachSessionState> = new Map();
  /**
   * Evidence-Grounded Comparison & Skill Gap Analysis
   */
  public static async compareEvidenceAndSkills(candidateId: string, requirementId: string) {
    if (!adminDb) {
      throw new Error("Firestore Admin DB is not initialized.");
    }

    // 1. Fetch Candidate
    const candDoc = await adminDb.collection("candidatePool").doc(candidateId).get();
    if (!candDoc.exists) {
      throw new Error(`Candidate with ID '${candidateId}' not found.`);
    }
    const cand = candDoc.data() || {};
    const resumeText = (cand.parsedData?.rawText || cand.resumeText || cand.text || "").trim();
    const candidateSkills: string[] = cand.skills || cand.normalizedSkills || [];

    // 2. Fetch Requirement (Canonical requirements collection)
    const reqDoc = await adminDb.collection("requirements").doc(requirementId).get();
    const req = reqDoc.exists ? reqDoc.data() || {} : {};
    const jdText = (req.description || req.rawText || req.jdText || "").trim();
    const mandatorySkills: string[] = req.mandatorySkills || req.skills || [];

    const prompt = `Compare candidate resume against target job description for evidence-grounded skill verification.
Candidate Resume:
${resumeText.substring(0, 3000)}

Job Description:
${jdText.substring(0, 3000)}

Mandatory Requirement Skills: ${mandatorySkills.join(", ")}

Analyze and return JSON with keys:
- "verifiedSkills": string[] (skills strongly supported with project/experience evidence)
- "weaklySupportedSkills": string[] (skills mentioned but lacking depth/details)
- "unverifiedSkills": string[] (skills claimed without resume evidence)
- "missingSkills": string[] (mandatory JD skills missing from resume)
- "confidenceScore": number (0-100)
- "evidenceExplanation": string (detailed evidence breakdown)`;

    const aiRes = await AIGateway.processChat({
      prompt,
      feature: "deep_screening",
      level: 2,
      strategy: "cost",
      fallbackRuleEngine: () => {
        const verified = candidateSkills.filter(s => mandatorySkills.some(m => m.toLowerCase().includes(s.toLowerCase())));
        const missing = mandatorySkills.filter(m => !candidateSkills.some(c => c.toLowerCase().includes(m.toLowerCase())));
        return {
          verifiedSkills: verified,
          weaklySupportedSkills: [],
          unverifiedSkills: candidateSkills.filter(s => !verified.includes(s)),
          missingSkills: missing,
          confidenceScore: 85,
          evidenceExplanation: "Deterministic rule-based evidence comparison fallback."
        };
      }
    });

    let resultJson: any = {};
    try {
      resultJson = JSON.parse(aiRes.response);
    } catch {
      resultJson = {
        verifiedSkills: candidateSkills.filter(s => mandatorySkills.some(m => m.toLowerCase().includes(s.toLowerCase()))),
        weaklySupportedSkills: [],
        unverifiedSkills: [],
        missingSkills: mandatorySkills.filter(m => !candidateSkills.some(c => c.toLowerCase().includes(m.toLowerCase()))),
        confidenceScore: 80,
        evidenceExplanation: aiRes.response
      };
    }

    return {
      candidateId,
      requirementId,
      verifiedSkills: resultJson.verifiedSkills || [],
      weaklySupportedSkills: resultJson.weaklySupportedSkills || [],
      unverifiedSkills: resultJson.unverifiedSkills || [],
      missingSkills: resultJson.missingSkills || [],
      confidenceScore: resultJson.confidenceScore || 80,
      evidenceExplanation: resultJson.evidenceExplanation || "",
      aiProvider: aiRes.provider,
      estimatedCost: aiRes.estimatedCost || 0
    };
  }

  /**
   * Multi-Turn Candidate Coaching Session with Grounding and Session Continuity
   */
  public static async runCoachSession(params: {
    sessionId: string;
    candidateId: string;
    requirementId: string;
    userQuery: string;
  }): Promise<CoachSessionState> {
    if (!adminDb) {
      throw new Error("Firestore Admin DB is sustained offline.");
    }

    let sessionState: CoachSessionState;
    if (this.memorySessions.has(params.sessionId)) {
      sessionState = this.memorySessions.get(params.sessionId)!;
    } else {
      let sessionDoc: any = null;
      try {
        const sessionRef = adminDb.collection("ai_coach_sessions").doc(params.sessionId);
        sessionDoc = await sessionRef.get();
      } catch {}

      if (sessionDoc && sessionDoc.exists) {
        sessionState = sessionDoc.data() as CoachSessionState;
      } else {
        sessionState = {
          sessionId: params.sessionId,
          candidateId: params.candidateId,
          requirementId: params.requirementId,
          history: [],
          verifiedClaims: [],
          unverifiedClaims: [],
          skillGaps: [],
          updatedAt: new Date().toISOString()
        };
      }
    }

    // Fetch Candidate & Requirement for grounding context
    let cand: any = {};
    let req: any = {};
    try {
      if (adminDb) {
        const candDoc = await adminDb.collection("candidatePool").doc(params.candidateId).get();
        cand = candDoc.exists ? candDoc.data() || {} : {};

        const reqDoc = await adminDb.collection("requirements").doc(params.requirementId).get();
        req = reqDoc.exists ? reqDoc.data() || {} : {};
      }
    } catch (dbErr: any) {
      console.warn("[ChiefRecruiterAI] Grounding context lookup warning:", dbErr?.message);
    }

    const resumeText = (cand.parsedData?.rawText || cand.resumeText || "").substring(0, 2000);
    const jdText = (req.description || req.rawText || "").substring(0, 2000);

    const formattedHistory = sessionState.history.slice(-6).map(h => `${h.role.toUpperCase()}: ${h.content}`).join("\n");

    const prompt = `You are the Chief Recruiter AI Coach.
Grounded Context:
Candidate Resume Summary: ${resumeText}
Target Job Description: ${jdText}

Previous Conversation History:
${formattedHistory || "None"}

Candidate Question/Response: "${params.userQuery}"

Provide constructive, evidence-grounded coaching feedback and 1 targeted follow-up question.`;

    const aiRes = await AIGateway.processChat({
      prompt,
      feature: "copilot",
      level: 1,
      intent: "ASK_COPILOT",
      isAuthorizedUserAction: true,
      fallbackRuleEngine: () => ({
        reply: `Thank you for your response. Based on your target role (${req.title || "Target Position"}), focus on highlighting your technical accomplishments in ${cand.skills?.[0] || "core competencies"}. What was your specific architectural contribution in your most recent project?`
      })
    });

    let replyText = "";
    try {
      const parsed = JSON.parse(aiRes.response);
      replyText = parsed.reply || aiRes.response;
    } catch {
      replyText = aiRes.response;
    }

    sessionState.history.push({
      role: "user",
      content: params.userQuery,
      timestamp: new Date().toISOString()
    });
    sessionState.history.push({
      role: "assistant",
      content: replyText,
      timestamp: new Date().toISOString()
    });
    sessionState.updatedAt = new Date().toISOString();

    this.memorySessions.set(params.sessionId, sessionState);

    try {
      const sessionRef = adminDb.collection("ai_coach_sessions").doc(params.sessionId);
      await sessionRef.set(sessionState, { merge: true });
    } catch (dbErr: any) {
      console.warn("[ChiefRecruiterAI] Session write warning:", dbErr?.message);
    }

    return sessionState;
  }

  /**
   * Deep Project Dive Questions (Ownership, Architecture, Decisions, Outcomes)
   */
  public static async generateDeepProjectQuestions(candidateId: string, requirementId: string) {
    if (!adminDb) throw new Error("Firestore Admin DB not ready.");

    const candDoc = await adminDb.collection("candidatePool").doc(candidateId).get();
    const cand = candDoc.exists ? candDoc.data() || {} : {};
    const resumeText = (cand.parsedData?.rawText || cand.resumeText || "").substring(0, 2000);

    const reqDoc = await adminDb.collection("requirements").doc(requirementId).get();
    const req = reqDoc.exists ? reqDoc.data() || {} : {};

    const prompt = `Generate 4 deep project-probing questions covering:
1. Technical Ownership & Role Scope
2. Architectural Decisions & Tradeoffs
3. Complex Troubleshooting / Debugging Case
4. Measurable Business / System Outcomes

Candidate Resume Context: ${resumeText}
Job Title: ${req.title || "Technical Role"}

Return JSON object with key "questions": array of strings.`;

    const aiRes = await AIGateway.processChat({
      prompt,
      feature: "interview_question_generation",
      level: 1,
      fallbackRuleEngine: () => ({
        questions: [
          "Describe a key system or service where you had primary technical ownership.",
          "What architectural trade-offs did you evaluate when designing your primary project?",
          "Walk through a critical production bug or outage you personally diagnosed and resolved.",
          "What specific, quantifiable metrics improved as a direct result of your implementation?"
        ]
      })
    });

    let questions: string[] = [];
    try {
      const parsed = JSON.parse(aiRes.response);
      questions = parsed.questions || [];
    } catch {
      questions = [
        "Describe a key system where you had primary technical ownership.",
        "What architectural trade-offs did you evaluate in your primary project?",
        "Walk through a critical production bug you diagnosed and resolved.",
        "What specific metrics improved as a direct result of your work?"
      ];
    }

    return { candidateId, requirementId, questions };
  }

  /**
   * Client Requirement Intake & Contradiction Detection
   */
  public static async analyzeRequirementIntake(inputText: string): Promise<{
    title: string;
    description: string;
    mandatorySkills: string[];
    optionalSkills: string[];
    minExperience: number;
    contradictions: string[];
    confirmationRequired: boolean;
  }> {
    const prompt = `Analyze this client job requirement intake text. Extract structured fields and detect contradictions or unrealistic criteria.
Intake Text: "${inputText}"

Return JSON with keys:
- "title": string
- "description": string
- "mandatorySkills": string[]
- "optionalSkills": string[]
- "minExperience": number
- "contradictions": string[] (e.g. "Requires 10 years experience in a technology released 2 years ago" or "Budget ₹5 LPA for Senior Staff Architect")
- "confirmationRequired": boolean (true if contradictions or ambiguities exist)`;

    const aiRes = await AIGateway.processChat({
      prompt,
      feature: "jd_extraction",
      level: 1,
      fallbackRuleEngine: () => ({
        title: "Client Requirement",
        description: inputText,
        mandatorySkills: ["React", "Node.js"],
        optionalSkills: ["AWS"],
        minExperience: 5,
        contradictions: [],
        confirmationRequired: false
      })
    });

    try {
      return JSON.parse(aiRes.response);
    } catch {
      return {
        title: "Client Requirement",
        description: inputText,
        mandatorySkills: [],
        optionalSkills: [],
        minExperience: 3,
        contradictions: ["Intake parsed via deterministic fallback."],
        confirmationRequired: true
      };
    }
  }

  /**
   * Submission Readiness & Next Best Action Recommendations
   */
  public static async getSubmissionReadiness(candidateId: string, requirementId: string) {
    if (!adminDb) throw new Error("Firestore Admin DB unavailable.");

    const candDoc = await adminDb.collection("candidatePool").doc(candidateId).get();
    const cand = candDoc.exists ? candDoc.data() || {} : {};

    const reqDoc = await adminDb.collection("requirements").doc(requirementId).get();
    const req = reqDoc.exists ? reqDoc.data() || {} : {};

    const candidateSkills: string[] = cand.skills || [];
    const mandatorySkills: string[] = req.mandatorySkills || req.skills || [];

    const missingMandatory = mandatorySkills.filter(m => !candidateSkills.some(c => c.toLowerCase().includes(m.toLowerCase())));
    const isReady = missingMandatory.length === 0;

    let nextAction = "";
    if (!isReady) {
      nextAction = `Complete skill verification or coaching for missing mandatory skills: ${missingMandatory.join(", ")}`;
    } else if (cand.screeningStatus !== "AI_SCREENING_COMPLETED") {
      nextAction = "Run AI Evidence Verification screening prior to client submission";
    } else {
      nextAction = "Ready for Client Submission — Generate Client Pitch Profile";
    }

    return {
      candidateId,
      requirementId,
      isReady,
      missingMandatory,
      nextAction,
      recommendationTier: isReady ? "PRIMARY_SUBMIT" : "NEEDS_ATTENTION"
    };
  }
}
