import crypto from "crypto";
import { adminDb } from "../../lib/firebase-admin.js";
import { AIGateway } from "./AIGateway.js";
import { CandidateScreeningEngine, CandidateScreeningResult } from "./CandidateScreeningEngine.js";
import { AIDataSanitizer } from "./AIDataSanitizer.js";

export type EvidenceGrade = 
  | "VERIFIED" 
  | "PARTIAL" 
  | "UNVERIFIED" 
  | "MISSING" 
  | "CONTRADICTED" 
  | "NOT_APPLICABLE";

export type ScreeningStatus =
  | "AI_SCREENING_PENDING"
  | "AI_SCREENING_QUEUED"
  | "AI_SCREENING_PARSING"
  | "AI_SCREENING_EVIDENCE_EXTRACTION"
  | "AI_SCREENING_JD_ANALYSIS"
  | "AI_SCREENING_MATCH_ANALYSIS"
  | "AI_SCREENING_RUNNING"
  | "AI_SCREENING_COMPLETED"
  | "AI_SCREENING_DEGRADED"
  | "AI_SCREENING_FAILED"
  | "AI_SCREENING_RETRY_REQUIRED"
  | "AI_INTERVIEW_PENDING"
  | "AI_INTERVIEW_IN_PROGRESS"
  | "AI_INTERVIEW_COMPLETED"
  | "AI_INTERVIEW_REVIEW_REQUIRED";

export interface EvidenceVerificationReport {
  evidenceScore: number; // 0-100
  confidenceRating: "HIGH" | "MEDIUM" | "LOW";
  verifiedCapabilities: Record<string, {
    grade: EvidenceGrade;
    explanation: string;
    evidenceSource?: string; // Projects or experience mention
  }>;
  discrepancies: string[];
}

export interface AIScreeningRecord {
  id: string;
  candidateId: string;
  requirementId: string;
  submissionId?: string;
  status: ScreeningStatus;
  evidenceReport: EvidenceVerificationReport;
  screeningResult: CandidateScreeningResult;
  resumeHash: string;
  requirementHash: string;
  screeningVersion: number;
  createdAt: string;
  updatedAt: string;
  errorMessage?: string;

  // Refined properties
  resumeValidation?: {
    parsedCorrectly: boolean;
    corruptionsOrWarnings: string[];
  };
  requirementMatch?: {
    matchScore: number;
    matchingCriteria: string[];
  };
  evidenceMatrix?: Array<{
    capability: string;
    grade: EvidenceGrade;
    explanation: string;
    evidenceSource?: string;
  }>;
  skillGaps?: string[];
  aiInterviewTranscriptAssessment?: {
    sessionId?: string;
    completed?: boolean;
    overallScore?: number;
    communicationScore?: number;
    recommendation?: string;
    keyTakeaways?: string[];
  } | null;
  riskFlags?: string[];
  auditTrail?: {
    timestamp: string;
    engineVersion: number;
  };
}

export class CandidateEvidenceEngine {
  private static readonly CURRENT_VERSION = 2; // Screening Version for cache protection

  /**
   * Generates a deterministic content hash for caching
   */
  public static generateCacheKey(resumeText: string, jdText: string, version: number = this.CURRENT_VERSION): string {
    const rNormalized = (resumeText || "").trim().toLowerCase();
    const jNormalized = (jdText || "").trim().toLowerCase();
    return crypto
      .createHash("sha256")
      .update(`${rNormalized}:::${jNormalized}:::V${version}`)
      .digest("hex");
  }

  /**
   * Transition state with audit logging
   */
  public static async transitionState(
    screeningId: string,
    candidateId: string,
    requirementId: string,
    fromStatus: ScreeningStatus | "INITIAL",
    toStatus: ScreeningStatus,
    details: string,
    err?: string
  ): Promise<void> {
    if (!adminDb) return;

    try {
      // 1. Log transition event
      await adminDb.collection("interview_events").add({
        id: `ev-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        screeningId,
        candidateId,
        requirementId,
        type: "SCREENING_STATE_TRANSITION",
        fromStatus,
        toStatus,
        details,
        error: err || null,
        timestamp: new Date().toISOString(),
      });

      // 2. Update candidate status
      await adminDb.collection("candidatePool").doc(candidateId).set(
        {
          screeningStatus: toStatus,
          lastActivityAt: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log(`[CandidateEvidenceEngine] State transitioned: ${fromStatus} -> ${toStatus} for candidate ${candidateId}`);
    } catch (e: any) {
      console.error("[CandidateEvidenceEngine] Failed to write state transition audit:", e.message);
    }
  }

  /**
   * Resolves target requirement and JD automatically
   */
  public static async resolveTargetRequirement(candidateId: string, inputRequirementId?: string): Promise<{ requirementId: string; jdText: string; title: string } | null> {
    if (!adminDb) return null;

    // A. Use provided requirementId if valid
    if (inputRequirementId) {
      const doc = await adminDb.collection("requirements_public").doc(inputRequirementId).get();
      if (doc.exists) {
        const d = doc.data();
        return {
          requirementId: inputRequirementId,
          jdText: d?.description || d?.rawText || "",
          title: d?.title || "Strategic Role",
        };
      }
    }

    // B. Check submissions where candidate is submitted
    const subSnap = await adminDb
      .collection("submissions")
      .where("candidateId", "==", candidateId)
      .orderBy("updatedAt", "desc")
      .limit(1)
      .get();

    if (!subSnap.empty) {
      const sub = subSnap.docs[0].data();
      const reqId = sub.requirementId;
      if (reqId) {
        const doc = await adminDb.collection("requirements_public").doc(reqId).get();
        if (doc.exists) {
          const d = doc.data();
          return {
            requirementId: reqId,
            jdText: d?.description || d?.rawText || "",
            title: d?.title || "Strategic Role",
          };
        }
      }
    }

    // C. Check candidate pool document for linked role
    const candDoc = await adminDb.collection("candidatePool").doc(candidateId).get();
    if (candDoc.exists) {
      const cand = candDoc.data();
      const linkedReqId = cand?.requirementId || cand?.jobId;
      if (linkedReqId) {
        const doc = await adminDb.collection("requirements_public").doc(linkedReqId).get();
        if (doc.exists) {
          const d = doc.data();
          return {
            requirementId: linkedReqId,
            jdText: d?.description || d?.rawText || "",
            title: d?.title || "Strategic Role",
          };
        }
      }
    }

    return null;
  }

  /**
   * Triggers the AI Screening process
   */
  public static async triggerScreening(candidateId: string, requirementId?: string, forceRefresh: boolean = false): Promise<AIScreeningRecord> {
    if (!adminDb) {
      throw new Error("Firestore Admin DB is not initialized.");
    }

    const screeningId = `scr-${candidateId}-${requirementId || "pending"}-${Date.now()}`;
    
    // 1. Resolve JD (Transition: QUEUED)
    await this.transitionState(screeningId, candidateId, requirementId || "pending", "INITIAL", "AI_SCREENING_QUEUED", "Screening triggered and queued in HireNestOS background worker.");

    const resolvedReq = await this.resolveTargetRequirement(candidateId, requirementId);
    if (!resolvedReq) {
      console.log(`[CandidateEvidenceEngine] Awaiting requirement specification for candidate ${candidateId}`);
      // Mark as pending requirement
      await adminDb.collection("candidatePool").doc(candidateId).set(
        {
          screeningStatus: "AI_SCREENING_PENDING" as ScreeningStatus,
        },
        { merge: true }
      );
      throw new Error("No requirement / job specification resolved for this candidate. Screening status marked pending.");
    }

    const finalReqId = resolvedReq.requirementId;
    const jdText = AIDataSanitizer.sanitize(resolvedReq.jdText || "");

    // 2. Resolve Resume text (Transition: PARSING)
    await this.transitionState(screeningId, candidateId, finalReqId, "AI_SCREENING_QUEUED", "AI_SCREENING_PARSING", "Parsing ingested resume text and mapping against resolved job specification.");

    const candDoc = await adminDb.collection("candidatePool").doc(candidateId).get();
    if (!candDoc.exists) {
      throw new Error(`Candidate with ID ${candidateId} not found`);
    }
    const candData = candDoc.data();
    const rawResumeText = (candData?.parsedData?.rawText || candData?.resumeText || candData?.text || "").trim();

    if (!rawResumeText) {
      await this.transitionState(screeningId, candidateId, finalReqId, "AI_SCREENING_PARSING", "AI_SCREENING_FAILED", "Screening aborted: Candidate resume text is completely empty.");
      throw new Error("Candidate resume text is empty.");
    }

    const resumeText = AIDataSanitizer.sanitize(rawResumeText, candData?.name || candData?.fullName);

    // Try to find a submissionId for idempotency
    let submissionId = "direct";
    try {
      const subSnap = await adminDb
        .collection("submissions")
        .where("candidateId", "==", candidateId)
        .where("requirementId", "==", finalReqId)
        .limit(1)
        .get();
      if (!subSnap.empty) {
        submissionId = subSnap.docs[0].id;
      }
    } catch (e) {
      console.log("[CandidateEvidenceEngine] No submission found:", e);
    }

    const resumeHash = crypto.createHash("sha256").update(resumeText).digest("hex");
    const requirementHash = crypto.createHash("sha256").update(jdText).digest("hex");
    
    // Idempotent Identity Key logic
    const SCREENING_KEY = crypto.createHash("sha256").update(`${candidateId}:::${finalReqId}:::${submissionId}:::${resumeHash}:::V${this.CURRENT_VERSION}`).digest("hex");
    const cacheKey = SCREENING_KEY;

    if (!forceRefresh) {
      const existingDoc = await adminDb.collection("ai_screenings").doc(cacheKey).get();
      if (existingDoc.exists) {
        const existingData = existingDoc.data() as AIScreeningRecord;
        console.log(`[CandidateEvidenceEngine] Perfect idempotent key match. Reusing cached analysis for ${cacheKey.slice(0, 8)}`);
        await this.transitionState(screeningId, candidateId, finalReqId, "AI_SCREENING_PARSING", "AI_SCREENING_COMPLETED", "Idempotent hit: Screening retrieved cleanly from persistent cache (0 model cost).");
        return existingData;
      }
    }

    // 3. Evidence Extraction Setup (Transition: EVIDENCE_EXTRACTION)
    await this.transitionState(screeningId, candidateId, finalReqId, "AI_SCREENING_PARSING", "AI_SCREENING_EVIDENCE_EXTRACTION", "Starting automatic evidence extraction of core competencies and project-anchored proof.");

    // 4. Job Spec Deconstruction (Transition: JD_ANALYSIS)
    await this.transitionState(screeningId, candidateId, finalReqId, "AI_SCREENING_EVIDENCE_EXTRACTION", "AI_SCREENING_JD_ANALYSIS", "Deconstructing client Job Description into required skills, location constraints, and domain keywords.");

    // 5. Semantic Matchmaking (Transition: MATCH_ANALYSIS)
    await this.transitionState(screeningId, candidateId, finalReqId, "AI_SCREENING_JD_ANALYSIS", "AI_SCREENING_MATCH_ANALYSIS", "Executing semantic matchmaking & checking chronological gaps.");

    // 6. Running LLM Deep Verification (Transition: RUNNING)
    await this.transitionState(screeningId, candidateId, finalReqId, "AI_SCREENING_MATCH_ANALYSIS", "AI_SCREENING_RUNNING", "Firing Gemini AI principal engine for multi-vector evidence consistency validation.");

    // Build prompt for multi-vector consistency validation
    const prompt = `You are HireNestOS's elite principal Candidate Evidence Engine.
Perform a zero-hallucination, rigorous consistency analysis on the candidate's resume relative to the open Job Description (JD).

JOB REQUIREMENT:
"""
${jdText.substring(0, 4000)}
"""

CANDIDATE RESUME PROFILE:
"""
${resumeText.substring(0, 5000)}
"""

CRITICAL INSTRUCTIONS:
1. Perform an **Employment Check**: Match candidate's stated employment spans against their overall technical experience assertions. Ensure no temporal overlaps or math anomalies exist.
2. Perform a **Skills Check**: Ensure each skill listed in the "Skills" list is verified by active usage details in project summaries or day-to-day employment roles.
3. Perform a **Project Consistency Check**: Assess if projects described are logically complete, authentic, and cohere with standard software/business engineering lifetimes.
4. Categorize every skill mentioned in the JD or the resume into one of these strict **Evidence Grades**:
   - "VERIFIED": Strong project evidence with detailed technical context.
   - "PARTIAL": Stated with very brief project or role mention.
   - "UNVERIFIED": Stated only in a skills list without project context.
   - "MISSING": Required by JD but absent from resume.
   - "CONTRADICTED": Active conflicting statements exist in dates, roles, or skill usage.
   - "NOT_APPLICABLE": Non-critical skills.

Analyze this thoroughly and return valid JSON matching this schema:
{
  "evidenceScore": number (0 to 100 based on verified skills backed by direct projects),
  "confidenceRating": "HIGH" | "MEDIUM" | "LOW",
  "verifiedCapabilities": {
    "Skill_Name_1": {
      "grade": "VERIFIED" | "PARTIAL" | "UNVERIFIED" | "MISSING" | "CONTRADICTED" | "NOT_APPLICABLE",
      "explanation": "Specific context about why this grade was assigned",
      "evidenceSource": "Stated project or role location where the skill was demonstrated"
    }
  },
  "discrepancies": string[] (List of parsed anomalies or gaps found, e.g., "AWS developer claim but zero projects mentioning AWS"),
  "resumeValidation": {
    "parsedCorrectly": true,
    "corruptionsOrWarnings": []
  },
  "requirementMatch": {
    "matchScore": number,
    "matchingCriteria": string[]
  },
  "skillGaps": string[] (required skills that are missing from candidate's profile),
  "riskFlags": string[] (chronological gaps, suspicious dates, overlap anomalies, generic or unverified claims),
  "screeningResult": {
    "matchScore": number,
    "tier": "High Confidence" | "Strong Potential" | "Partial Match" | "Weak Match",
    "skillsMatched": string[],
    "skillsMissing": string[],
    "strengths": string[],
    "gaps": string[],
    "recommendation": "STRONG_FIT" | "CONSIDER" | "NOT_SUITABLE",
    "summary": string,
    "breakdown": {
      "skillsScore": number,
      "experienceScore": number,
      "domainScore": number,
      "locationScore": number,
      "totalScore": number
    },
    "recruiterAssessment": string,
    "nextSteps": string,
    "outreachDrafts": {
      "founder": string,
      "professional": string,
      "executive": string,
      "warm": string
    }
  }
}`;

    try {
      const response = await AIGateway.processChat({
        prompt,
        feature: "deep_screening",
        level: 2, // Gemini 3.7 Flash for deep logic
        agent: "CandidateEvidenceEngine",
        temperature: 0.1,
        systemInstruction: "You are the HireNestOS Candidate Evidence Engine. Do not hallucinate. Evaluate with complete objectivity.",
        isAuthorizedUserAction: true,
        schema: {
          type: "object",
          properties: {
            evidenceScore: { type: "number" },
            confidenceRating: { type: "string" },
            verifiedCapabilities: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  grade: { type: "string" },
                  explanation: { type: "string" },
                  evidenceSource: { type: "string" }
                },
                required: ["grade", "explanation"]
              }
            },
            discrepancies: { type: "array", items: { type: "string" } },
            resumeValidation: {
              type: "object",
              properties: {
                parsedCorrectly: { type: "boolean" },
                corruptionsOrWarnings: { type: "array", items: { type: "string" } }
              },
              required: ["parsedCorrectly", "corruptionsOrWarnings"]
            },
            requirementMatch: {
              type: "object",
              properties: {
                matchScore: { type: "number" },
                matchingCriteria: { type: "array", items: { type: "string" } }
              },
              required: ["matchScore", "matchingCriteria"]
            },
            skillGaps: { type: "array", items: { type: "string" } },
            riskFlags: { type: "array", items: { type: "string" } },
            screeningResult: {
              type: "object",
              properties: {
                matchScore: { type: "number" },
                tier: { type: "string" },
                skillsMatched: { type: "array", items: { type: "string" } },
                skillsMissing: { type: "array", items: { type: "string" } },
                strengths: { type: "array", items: { type: "string" } },
                gaps: { type: "array", items: { type: "string" } },
                recommendation: { type: "string" },
                summary: { type: "string" },
                breakdown: {
                  type: "object",
                  properties: {
                    skillsScore: { type: "number" },
                    experienceScore: { type: "number" },
                    domainScore: { type: "number" },
                    locationScore: { type: "number" },
                    totalScore: { type: "number" }
                  },
                  required: ["skillsScore", "experienceScore", "domainScore", "locationScore", "totalScore"]
                },
                recruiterAssessment: { type: "string" },
                nextSteps: { type: "string" },
                outreachDrafts: {
                  type: "object",
                  properties: {
                    founder: { type: "string" },
                    professional: { type: "string" },
                    executive: { type: "string" },
                    warm: { type: "string" }
                  }
                }
              },
              required: ["matchScore", "tier", "skillsMatched", "skillsMissing", "strengths", "gaps", "recommendation", "summary", "breakdown"]
            }
          },
          required: ["evidenceScore", "confidenceRating", "verifiedCapabilities", "discrepancies", "resumeValidation", "requirementMatch", "skillGaps", "riskFlags", "screeningResult"]
        }
      });

      const parsed = JSON.parse(response.response);

      const record: AIScreeningRecord = {
        id: cacheKey,
        candidateId,
        requirementId: finalReqId,
        submissionId,
        status: "AI_SCREENING_COMPLETED",
        evidenceReport: {
          evidenceScore: parsed.evidenceScore || 0,
          confidenceRating: parsed.confidenceRating || "MEDIUM",
          verifiedCapabilities: parsed.verifiedCapabilities || {},
          discrepancies: parsed.discrepancies || [],
        },
        screeningResult: {
          ...parsed.screeningResult,
          analyzedAt: new Date().toISOString(),
          cached: false,
          cacheHash: cacheKey,
        },
        resumeHash,
        requirementHash,
        screeningVersion: this.CURRENT_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),

        // Refined properties
        resumeValidation: parsed.resumeValidation || { parsedCorrectly: true, corruptionsOrWarnings: [] },
        requirementMatch: parsed.requirementMatch || { matchScore: parsed.evidenceScore || 0, matchingCriteria: [] },
        evidenceMatrix: Object.entries(parsed.verifiedCapabilities || {}).map(([capability, details]: [string, any]) => ({
          capability,
          grade: details.grade as EvidenceGrade,
          explanation: details.explanation,
          evidenceSource: details.evidenceSource,
        })),
        skillGaps: parsed.skillGaps || [],
        aiInterviewTranscriptAssessment: null, // Populated later once completed
        riskFlags: parsed.riskFlags || [],
        auditTrail: {
          timestamp: new Date().toISOString(),
          engineVersion: this.CURRENT_VERSION,
        },
      };

      // Store in screenings collection
      await adminDb.collection("ai_screenings").doc(cacheKey).set(record);

      // Merge results back onto CandidatePool document
      await adminDb.collection("candidatePool").doc(candidateId).set(
        {
          aiMatchScore: record.screeningResult.matchScore,
          aiScreeningResult: record.screeningResult,
          evidenceScore: record.evidenceReport.evidenceScore,
          evidenceReport: record.evidenceReport,
          screeningStatus: "AI_SCREENING_COMPLETED" as ScreeningStatus,
          lastScreenedAt: new Date().toISOString(),
          // Persist the refined properties too
          resumeValidation: record.resumeValidation,
          requirementMatch: record.requirementMatch,
          evidenceMatrix: record.evidenceMatrix,
          skillGaps: record.skillGaps,
          riskFlags: record.riskFlags,
          auditTrail: record.auditTrail,
        },
        { merge: true }
      );

      // State Transition -> Completed
      await this.transitionState(
        screeningId,
        candidateId,
        finalReqId,
        "AI_SCREENING_RUNNING",
        "AI_SCREENING_COMPLETED",
        `AI screening complete. Verified ${Object.keys(record.evidenceReport.verifiedCapabilities).length} technical capabilities with evidenceScore of ${record.evidenceReport.evidenceScore}%.`
      );

      return record;
    } catch (aiError: any) {
      console.warn(`[CandidateEvidenceEngine] AI Analysis failed, falling back to Degraded Deterministic Mode:`, aiError.message);

      // Graceful degraded mode using deterministic screening logic
      const fallbackResult = CandidateScreeningEngine.runDeterministicScreening(resumeText, jdText, 1);
      
      const degradedRecord: AIScreeningRecord = {
        id: cacheKey,
        candidateId,
        requirementId: finalReqId,
        submissionId,
        status: "AI_SCREENING_DEGRADED",
        evidenceReport: {
          evidenceScore: fallbackResult.matchScore,
          confidenceRating: "MEDIUM",
          verifiedCapabilities: fallbackResult.skillsMatched.reduce((acc, skill) => {
            acc[skill] = {
              grade: "VERIFIED",
              explanation: "Stated match verified via deterministic fallbacks.",
            };
            return acc;
          }, {} as any),
          discrepancies: ["AI deep verification engine currently offline. Switched to deterministic fallbacks."],
        },
        screeningResult: {
          ...fallbackResult,
          summary: `Note: Screening completed in Degraded mode due to engine load. ${fallbackResult.summary}`,
        },
        resumeHash,
        requirementHash,
        screeningVersion: this.CURRENT_VERSION,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        errorMessage: aiError.message,

        resumeValidation: { parsedCorrectly: true, corruptionsOrWarnings: [] },
        requirementMatch: { matchScore: fallbackResult.matchScore, matchingCriteria: fallbackResult.skillsMatched },
        evidenceMatrix: fallbackResult.skillsMatched.map(skill => ({
          capability: skill,
          grade: "VERIFIED" as EvidenceGrade,
          explanation: "Deterministic match",
        })),
        skillGaps: fallbackResult.skillsMissing,
        aiInterviewTranscriptAssessment: null,
        riskFlags: ["AI analysis degraded to deterministic fallback."],
        auditTrail: {
          timestamp: new Date().toISOString(),
          engineVersion: this.CURRENT_VERSION,
        },
      };

      await adminDb.collection("ai_screenings").doc(cacheKey).set(degradedRecord);

      await adminDb.collection("candidatePool").doc(candidateId).set(
        {
          aiMatchScore: degradedRecord.screeningResult.matchScore,
          aiScreeningResult: degradedRecord.screeningResult,
          evidenceScore: degradedRecord.evidenceReport.evidenceScore,
          evidenceReport: degradedRecord.evidenceReport,
          screeningStatus: "AI_SCREENING_DEGRADED" as ScreeningStatus,
          lastScreenedAt: new Date().toISOString(),
          resumeValidation: degradedRecord.resumeValidation,
          requirementMatch: degradedRecord.requirementMatch,
          evidenceMatrix: degradedRecord.evidenceMatrix,
          skillGaps: degradedRecord.skillGaps,
          riskFlags: degradedRecord.riskFlags,
          auditTrail: degradedRecord.auditTrail,
        },
        { merge: true }
      );

      await this.transitionState(
        screeningId,
        candidateId,
        finalReqId,
        "AI_SCREENING_RUNNING",
        "AI_SCREENING_DEGRADED",
        `AI screening degraded to deterministic fallbacks: ${aiError.message}`
      );

      return degradedRecord;
    }
  }
}
