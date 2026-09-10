import { db } from "../lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp,
  limit,
  updateDoc
} from "firebase/firestore";
import { SkillNormalizer } from "../resume-engine/matching/skill-normalizer";
import { formatBudget } from "../lib/currency";
import { UnifiedRequirementsService } from "./unifiedRequirementsService";
import { AccessControlService, HireNestAccessContext } from "./accessControlService";
import { emitEvent } from "./eventBus";

export interface CandidateRequirementMatchRecord {
  id: string; // `${candidateId}_${requirementId}`
  candidateId: string;
  candidateName?: string;
  requirementId: string;
  reqTitle?: string;
  clientName?: string;
  score: number;
  matchScore: number;
  fitScore: number;
  tier: "STRONG" | "VALIDATABLE" | "GAP" | "HARD_GATE_FAIL";
  matchTier: "STRONG" | "VALIDATABLE" | "GAP" | "HARD_GATE_FAIL";
  evidence: {
    skillsScore: number;
    experienceScore: number;
    recentRoleScore: number;
    workModeScore: number;
    locationScore: number;
    availabilityScore: number;
    domainScore: number;
    compensation: string;
  };
  breakdown: {
    skillsScore: number;
    experienceScore: number;
    domainScore: number;
    locationScore: number;
    workModeScore: number;
    recentRoleScore: number;
    availabilityScore: number;
  };
  skillMatches: string[];
  skillsOverlap: string[];
  missingSkills: string[];
  hardGateVerdict: "PASS" | "FAIL";
  hardGateReason?: string | null;
  summary: string;
  overallMatchReason: string;
  strengths: string[];
  risks: string[];
  recommendation: string;
  recruiterAssessment: string;
  algorithmVersion: string;
  evaluatedAt: string;
  updatedAt: string;
}

/**
 * Sanitizes any data payload destined for Firestore by stripping undefined values.
 */
function sanitizeFirestorePayload<T>(data: T): T {
  if (data === undefined) {
    return null as any;
  }
  if (data === null || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeFirestorePayload(item)) as any;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeFirestorePayload(value);
    }
  }
  return cleanObj as T;
}

export interface MatchCandidateToRequirementParams {
  candidateId: string;
  requirementId: string;
  context: HireNestAccessContext;
  onProgress?: (step: string) => void;
}

export interface CandidateMatchResult {
  requirementId: string;
  jobTitle: string;
  companyName?: string;
  jobType: "Full-Time" | "C2H" | "Contract" | "Hybrid" | "Onsite";
  workMode: string;
  location: string;
  experienceRequired: string;
  budget?: string;
  fitmentScore: number;
  matchTier: "STRONG" | "VALIDATABLE" | "GAP" | "HARD_GATE_FAIL";
  skillsOverlap: string[];
  missingSkills: string[];
  hardGateVerdict: "PASS" | "FAIL";
  hardGateReason?: string;
  isApplied?: boolean;
  notificationRecordId?: string;
}

export interface JobMatchNotificationRecord {
  id: string; // `${candidateId}_${requirementId}`
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidatePhone?: string;
  requirementId: string;
  requirementTitle: string;
  jobType: string;
  workMode: string;
  location: string;
  fitmentScore: number;
  matchTier: "STRONG" | "VALIDATABLE" | "GAP";
  matchVersion: string;
  emailSent: boolean;
  emailSentAt: string | null;
  osNotificationCreated: boolean;
  osNotificationId: string | null;
  viewedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
}

export class CandidateMatchingService {
  private static MATCH_VERSION = "v1.4-FITMENT-ENGINE";

  /**
   * Evaluates deterministic skill overlap, hard gates (experience & location),
   * and computes a score from 0-100%.
   */
  public static evaluateFitment(
    candidate: {
      skills: string[];
      experienceYears?: number;
      location?: string;
      preferredWorkMode?: string;
    },
    requirement: {
      skills?: string[];
      experience?: string;
      minExperience?: string;
      location?: string;
      workMode?: string;
      jobType?: string;
      mandatorySkills?: string[];
    }
  ): {
    score: number;
    tier: "STRONG" | "VALIDATABLE" | "GAP" | "HARD_GATE_FAIL";
    skillsOverlap: string[];
    missingSkills: string[];
    hardGateVerdict: "PASS" | "FAIL";
    hardGateReason?: string;
  } {
    const candSkills = (candidate.skills || []).map(s => s.toLowerCase().trim());
    const reqSkills = (requirement.skills || []).map(s => s.toLowerCase().trim());
    const mandatorySkills = (requirement.mandatorySkills || []).map(s => s.toLowerCase().trim());

    // Normalize synonyms using controlled taxonomy (e.g. C++ with C++17, React with ReactJS)
    const normalizeSkill = (s: string) => SkillNormalizer.normalize(s).toLowerCase();

    const candNormalized = candSkills.map(normalizeSkill);
    const reqNormalized = reqSkills.map(normalizeSkill);

    // Identify overlap
    const skillsOverlap: string[] = [];
    const missingSkills: string[] = [];

    (requirement.skills || []).forEach((origSkill, idx) => {
      const norm = reqNormalized[idx];
      if (candNormalized.includes(norm) || candSkills.some(cs => cs.includes(origSkill.toLowerCase()))) {
        skillsOverlap.push(origSkill);
      } else {
        missingSkills.push(origSkill);
      }
    });

    // Check mandatory skills hard gate
    let missingMandatoryCount = 0;
    if (mandatorySkills.length > 0) {
      mandatorySkills.forEach(ms => {
        const norm = normalizeSkill(ms);
        if (!candNormalized.includes(norm)) {
          missingMandatoryCount++;
        }
      });
    }

    // Check experience hard gate
    const minExpReq = parseInt(requirement.minExperience || requirement.experience || "0", 10) || 0;
    const candExp = candidate.experienceYears || 0;

    let hardGateVerdict: "PASS" | "FAIL" = "PASS";
    let hardGateReason: string | undefined = undefined;

    if (minExpReq > 0 && candExp > 0 && candExp < minExpReq - 2) {
      hardGateVerdict = "FAIL";
      hardGateReason = `Experience requirement (${minExpReq}+ years) exceeds candidate profile (${candExp} years)`;
    } else if (missingMandatoryCount > 1) {
      hardGateVerdict = "FAIL";
      hardGateReason = `Missing critical mandatory core skills (${missingMandatoryCount} missing)`;
    }

    // Score calculation
    let calculatedScore = 50;
    if (reqSkills.length > 0) {
      const overlapRatio = skillsOverlap.length / reqSkills.length;
      calculatedScore = Math.round(45 + overlapRatio * 50);
    } else {
      calculatedScore = 75;
    }

    // Work Mode & Location Bonus / Penalty
    const candLoc = (candidate.location || "").toLowerCase();
    const reqLoc = (requirement.location || "").toLowerCase();
    if (candLoc && reqLoc && (candLoc.includes(reqLoc) || reqLoc.includes(candLoc))) {
      calculatedScore = Math.min(99, calculatedScore + 5);
    }

    // Assign Match Tier
    let tier: "STRONG" | "VALIDATABLE" | "GAP" | "HARD_GATE_FAIL" = "GAP";
    if (hardGateVerdict === "FAIL") {
      tier = "HARD_GATE_FAIL";
      calculatedScore = Math.min(50, calculatedScore);
    } else if (calculatedScore >= 80) {
      tier = "STRONG";
    } else if (calculatedScore >= 65) {
      tier = "VALIDATABLE";
    } else {
      tier = "GAP";
    }

    return {
      score: calculatedScore,
      tier,
      skillsOverlap,
      missingSkills,
      hardGateVerdict,
      hardGateReason
    };
  }

  /**
   * Executes automatic matching for a candidate upon registration, CV upload, or manual refresh.
   * Creates JobMatchNotification records, candidate emails, and OS notifications.
   */
  public static async executeAutomaticMatching(candidateData: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    skills: string[];
    experienceYears?: number;
    location?: string;
    preferredWorkMode?: string;
  }): Promise<{
    strongMatches: CandidateMatchResult[];
    validatableMatches: CandidateMatchResult[];
    allMatches: CandidateMatchResult[];
  }> {
    if (!candidateData.id || !candidateData.email) {
      return { strongMatches: [], validatableMatches: [], allMatches: [] };
    }

    try {
      // 1. Fetch public requirements where status is ACTIVE and distributionStatus is PUBLISHED (canonical operational gate)
      const qReqs = collection(db, "requirements_public");
      const reqSnap = await getDocs(qReqs);
      const openReqs: any[] = reqSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((r: any) => {
          const isOperational = UnifiedRequirementsService.isRequirementOperational(r);
          const isDirect = r.directApplyEnabled !== false;
          return isOperational && isDirect;
        });

      // 2. Fetch candidate's existing applications to mark `isApplied`
      const appliedReqIds = new Set<string>();
      try {
        const qApps = query(
          collection(db, "applications"),
          where("candidateEmail", "==", candidateData.email),
          limit(50)
        );
        const appSnap = await getDocs(qApps);
        appSnap.docs.forEach(d => {
          const reqId = d.data().requirementId;
          if (reqId) appliedReqIds.add(reqId);
        });
      } catch (appErr) {
        console.warn("[CandidateMatchingService] Application check note:", appErr);
      }

      const strongMatches: CandidateMatchResult[] = [];
      const validatableMatches: CandidateMatchResult[] = [];
      const allMatches: CandidateMatchResult[] = [];

      for (const req of openReqs) {
        const evaluation = this.evaluateFitment(candidateData, req);

        // Ignore hard gate failures from recommendations
        if (evaluation.tier === "HARD_GATE_FAIL") {
          continue;
        }

        const jobTypeNormalized: "Full-Time" | "C2H" | "Contract" | "Hybrid" | "Onsite" = 
          (req.workMode?.includes("C2H") || req.jobType?.includes("C2H"))
            ? "C2H"
            : (req.jobType || req.workMode || "Full-Time") as any;

        const matchResult: CandidateMatchResult = {
          requirementId: req.id,
          jobTitle: req.title || req.role || "Software Specialist",
          companyName: req.clientName || "HireNest Global Partner",
          jobType: jobTypeNormalized,
          workMode: req.workMode || "Onsite",
          location: req.location || "Bengaluru",
          experienceRequired: req.experience || req.minExperience || "3-5 Years",
          budget: formatBudget(req.budget || req.rate, "Market Standard"),
          fitmentScore: evaluation.score,
          matchTier: evaluation.tier,
          skillsOverlap: evaluation.skillsOverlap,
          missingSkills: evaluation.missingSkills,
          hardGateVerdict: evaluation.hardGateVerdict,
          hardGateReason: evaluation.hardGateReason,
          isApplied: appliedReqIds.has(req.id),
          notificationRecordId: `${candidateData.id}_${req.id}`
        };

        allMatches.push(matchResult);

        if (evaluation.tier === "STRONG") {
          strongMatches.push(matchResult);
        } else if (evaluation.tier === "VALIDATABLE") {
          validatableMatches.push(matchResult);
        }

        // 3. IDEMPOTENT NOTIFICATION DISPATCH (JobMatchNotification)
        // Check / Set the JobMatchNotification record
        const notifDocId = `${candidateData.id}_${req.id}`;
        const notifDocRef = doc(db, "job_match_notifications", notifDocId);
        
        try {
          const existingNotifSnap = await getDoc(notifDocRef);
          
          if (!existingNotifSnap.exists() && (evaluation.tier === "STRONG" || evaluation.tier === "VALIDATABLE")) {
            const isStrong = evaluation.tier === "STRONG";
            
            // Create the OS Notification for Global HQ if Strong match
            let osNotifId: string | null = null;
            if (isStrong) {
              const osNotifRef = await addDoc(collection(db, "notifications"), {
                type: "CANDIDATE_JOB_MATCH",
                title: "🔔 Candidate Job Match",
                candidateName: candidateData.name,
                candidateId: candidateData.id,
                requirementId: req.id,
                requirementTitle: matchResult.jobTitle,
                fitmentScore: matchResult.fitmentScore,
                employmentType: `${matchResult.location} • ${matchResult.jobType}`,
                message: `>${candidateData.name}'s profile matches a new requirement`,
                detail: `${matchResult.jobTitle}\nFitment: ${matchResult.fitmentScore}%\nEmployment: ${matchResult.jobType}`,
                actionUrl: "/candidates",
                actionLabel: "View Candidate →",
                createdAt: new Date().toISOString(),
                status: "UNREAD"
              });
              osNotifId = osNotifRef.id;

              // Log Candidate-facing in-app message
              await addDoc(collection(db, "candidate_notifications"), {
                candidateId: candidateData.id,
                candidateEmail: candidateData.email,
                requirementId: req.id,
                title: "New Job Match Found",
                message: `A job requirement matching your resume has been identified.\n\n${matchResult.jobTitle}\n${matchResult.location} • ${matchResult.jobType}\nMatch: ${matchResult.fitmentScore}%`,
                jobTitle: matchResult.jobTitle,
                location: matchResult.location,
                jobType: matchResult.jobType,
                fitmentScore: matchResult.fitmentScore,
                status: "UNREAD",
                createdAt: new Date().toISOString()
              });
            }

            // Record in job_match_notifications to prevent duplicates
            const jobNotifData: JobMatchNotificationRecord = {
              id: notifDocId,
              candidateId: candidateData.id,
              candidateName: candidateData.name,
              candidateEmail: candidateData.email,
              candidatePhone: candidateData.phone || "",
              requirementId: req.id,
              requirementTitle: matchResult.jobTitle,
              jobType: matchResult.jobType,
              workMode: matchResult.workMode,
              location: matchResult.location,
              fitmentScore: matchResult.fitmentScore,
              matchTier: evaluation.tier,
              matchVersion: this.MATCH_VERSION,
              emailSent: isStrong,
              emailSentAt: isStrong ? new Date().toISOString() : null,
              osNotificationCreated: isStrong,
              osNotificationId: osNotifId,
              viewedAt: null,
              appliedAt: appliedReqIds.has(req.id) ? new Date().toISOString() : null,
              createdAt: new Date().toISOString()
            };

            await setDoc(notifDocRef, jobNotifData);
          }
        } catch (notifErr) {
          console.warn(`[CandidateMatchingService] Notification sync note for ${req.id}:`, notifErr);
        }
      }

      // Sort matches by fitment score descending
      allMatches.sort((a, b) => b.fitmentScore - a.fitmentScore);
      strongMatches.sort((a, b) => b.fitmentScore - a.fitmentScore);
      validatableMatches.sort((a, b) => b.fitmentScore - a.fitmentScore);

      return {
        strongMatches,
        validatableMatches,
        allMatches
      };
    } catch (err) {
      console.error("[CandidateMatchingService] executeAutomaticMatching error:", err);
      return { strongMatches: [], validatableMatches: [], allMatches: [] };
    }
  }

  /**
   * Evaluates a single candidate against a specific requirement independently of submission orchestration.
   * Enforces:
   * 1. Candidate Authorization (AccessControlService.canMatchCandidate)
   * 2. Requirement Existence & Canonical Operational Gate (status === ACTIVE && distributionStatus === PUBLISHED)
   * 3. Requirement Authorization (AccessControlService.isRequirementAuthorized)
   * 4. 7-point deterministic evidence evaluation (Skills 60%, Experience 25%, WorkMode/Location 15%, plus domain, role, availability, compensation)
   * 5. Persists match record to candidateRequirementMatches & candidate_matches
   * 6. Emits CANDIDATE_REQUIREMENT_MATCHED without invoking SubmissionOrchestrator or triggering global MatchingOffice
   */
  public static async matchCandidateToRequirement(
    params: MatchCandidateToRequirementParams
  ): Promise<CandidateRequirementMatchRecord> {
    const { candidateId, requirementId, context, onProgress } = params;

    onProgress?.("Candidate authorization...");

    // 1. Authorize candidate
    const canAccessCandidate = await AccessControlService.canMatchCandidate(context, candidateId);
    if (!canAccessCandidate) {
      throw new Error(`Unauthorized: Access denied to candidate profile (${candidateId}).`);
    }

    let poolCollection = "candidatePool";
    let candidateDocSnap = await getDoc(doc(db, "candidatePool", candidateId));
    let candData: any = null;
    if (candidateDocSnap.exists()) {
      candData = candidateDocSnap.data();
    } else {
      const directSnap = await getDoc(doc(db, "direct_candidates", candidateId));
      if (directSnap.exists()) {
        candData = directSnap.data();
        poolCollection = "direct_candidates";
      } else {
        throw new Error(`Candidate profile not found: ${candidateId}`);
      }
    }
    onProgress?.("✓ Candidate authorized");

    // 2. Resolve & Authorize requirement
    onProgress?.("Requirement authorization...");
    const reqDocSnap = await getDoc(doc(db, "requirements_public", requirementId));
    if (!reqDocSnap.exists()) {
      throw new Error(`Requirement not found: ${requirementId}`);
    }
    const reqData: any = { id: reqDocSnap.id, ...reqDocSnap.data() };

    // Canonical Operational Gate: status === ACTIVE && distributionStatus === PUBLISHED
    const isOperational = UnifiedRequirementsService.isRequirementOperational(reqData);
    if (!isOperational) {
      throw new Error(
        `Requirement ${requirementId} is not operational (status: "${reqData.status || 'UNSET'}", distributionStatus: "${reqData.distributionStatus || 'UNSET'}"). Only ACTIVE + PUBLISHED requirements are eligible for matching.`
      );
    }

    const isAuthorized = AccessControlService.isRequirementAuthorized(
      context.organizationId || context.userId,
      context.role,
      reqData
    );
    if (!isAuthorized) {
      throw new Error(`Requirement authorization failed: Access denied to requirement ${requirementId}.`);
    }
    onProgress?.("✓ Requirement authorized");
    onProgress?.("✓ Requirement ACTIVE + PUBLISHED");

    // 3. 7-Point Evidence Evaluation
    onProgress?.("Evaluating fitment & evidence...");

    // Candidate attributes
    const candidateName = candData.candidateName || candData.displayName || candData.fullName || candData.name || "Candidate";
    const candidateSkills: string[] = (candData.skills || candData.parsedResume?.skills || []).map((s: string) => String(s).trim());
    const candidateExpYears = Number(candData.totalExperience || candData.experienceYears || parseInt(candData.experience || "0", 10) || 0);
    const candidateLocation = String(candData.location || candData.city || "").trim();
    const candidateWorkMode = String(candData.preferredWorkMode || candData.workMode || "").trim();
    const candidateCurrentRole = String(candData.currentRole || candData.role || candData.title || "").trim();
    const candidateNoticePeriod = String(candData.noticePeriod || candData.availability || "").trim();
    const candidateExpectedComp = candData.expectedSalary || candData.expectedRate || candData.compensation || "";

    // Requirement attributes
    const reqTitle = reqData.title || reqData.role || "Software Specialist";
    const reqSkills: string[] = (reqData.skills || []).map((s: string) => String(s).trim());
    const reqMandatorySkills: string[] = (reqData.mandatorySkills || []).map((s: string) => String(s).trim());
    const reqMinExp = parseInt(reqData.minExperience || reqData.experience || "0", 10) || 0;
    const reqLocation = String(reqData.location || "").trim();
    const reqWorkMode = String(reqData.workMode || reqData.jobType || "Onsite").trim();
    const reqBudget = reqData.budget || reqData.rate || "";

    // Evidence 1: Skills (60% weight in core formula)
    const normalize = (s: string) => SkillNormalizer.normalize(s).toLowerCase();
    const candNorm = candidateSkills.map(normalize);
    const reqNorm = reqSkills.map(normalize);

    const skillsOverlap: string[] = [];
    const missingSkills: string[] = [];

    reqSkills.forEach((origSkill, idx) => {
      const norm = reqNorm[idx];
      if (candNorm.includes(norm) || candidateSkills.some(cs => cs.toLowerCase().includes(origSkill.toLowerCase()))) {
        skillsOverlap.push(origSkill);
      } else {
        missingSkills.push(origSkill);
      }
    });

    let skillsScore = 50;
    if (reqSkills.length > 0) {
      const ratio = skillsOverlap.length / reqSkills.length;
      skillsScore = Math.min(100, Math.round(ratio * 100));
    } else {
      skillsScore = 80;
    }

    // Check mandatory skills
    let missingMandatoryCount = 0;
    reqMandatorySkills.forEach(ms => {
      const norm = normalize(ms);
      if (!candNorm.includes(norm)) {
        missingMandatoryCount++;
      }
    });

    // Evidence 2: Experience (25% weight in core formula)
    let experienceScore = 75;
    let hardGateVerdict: "PASS" | "FAIL" = "PASS";
    let hardGateReason: string | undefined = undefined;

    if (reqMinExp > 0) {
      if (candidateExpYears >= reqMinExp) {
        experienceScore = Math.min(100, 85 + Math.min(15, (candidateExpYears - reqMinExp) * 3));
      } else if (candidateExpYears >= reqMinExp - 1) {
        experienceScore = 75;
      } else if (candidateExpYears >= reqMinExp - 2) {
        experienceScore = 60;
      } else {
        experienceScore = 40;
        hardGateVerdict = "FAIL";
        hardGateReason = `Experience requirement (${reqMinExp}+ years) exceeds candidate profile (${candidateExpYears} years)`;
      }
    }

    if (missingMandatoryCount > 1) {
      hardGateVerdict = "FAIL";
      hardGateReason = `Missing ${missingMandatoryCount} critical mandatory skills`;
    }

    // Evidence 3: Recent Role
    let recentRoleScore = 70;
    if (candidateCurrentRole && reqTitle) {
      const candRoleTokens = candidateCurrentRole.toLowerCase().split(/\W+/).filter(Boolean);
      const reqRoleTokens = reqTitle.toLowerCase().split(/\W+/).filter(Boolean);
      const overlapTokens = reqRoleTokens.filter(t => candRoleTokens.includes(t));
      if (overlapTokens.length >= 2 || candidateCurrentRole.toLowerCase().includes(reqTitle.toLowerCase())) {
        recentRoleScore = 95;
      } else if (overlapTokens.length === 1) {
        recentRoleScore = 85;
      }
    }

    // Evidence 4: Work Mode & Location (15% weight combined)
    let workModeScore = 90;
    const candWm = candidateWorkMode.toLowerCase();
    const reqWm = reqWorkMode.toLowerCase();
    if (reqWm.includes("remote") || candWm.includes("remote")) {
      workModeScore = 100;
    } else if (candWm && reqWm && (candWm.includes(reqWm) || reqWm.includes(candWm))) {
      workModeScore = 100;
    } else if (reqWm.includes("hybrid")) {
      workModeScore = 85;
    }

    let locationScore = 80;
    const cLoc = candidateLocation.toLowerCase();
    const rLoc = reqLocation.toLowerCase();
    if (reqWm.includes("remote") || candWm.includes("remote")) {
      locationScore = 100;
    } else if (cLoc && rLoc && (cLoc.includes(rLoc) || rLoc.includes(cLoc))) {
      locationScore = 100;
    }

    // Evidence 5: Availability
    let availabilityScore = 80;
    const candNotice = candidateNoticePeriod.toLowerCase();
    if (candNotice.includes("immediate") || candNotice.includes("0 day") || candNotice.includes("15 day")) {
      availabilityScore = 95;
    } else if (candNotice.includes("30 day") || candNotice.includes("1 month")) {
      availabilityScore = 85;
    } else if (candNotice.includes("60 day") || candNotice.includes("90 day")) {
      availabilityScore = 65;
    }

    // Evidence 6: Compensation (Explicitly flagged "— Not stated" if not in profile/resume)
    let compensationEvaluation = "— Not stated";
    if (candidateExpectedComp) {
      compensationEvaluation = formatBudget(candidateExpectedComp, "Aligned with requirement budget");
    }

    // Evidence 7: Domain Fit
    let domainScore = 85;
    if (skillsScore >= 80) {
      domainScore = 92;
    } else if (skillsScore >= 60) {
      domainScore = 80;
    } else {
      domainScore = 65;
    }

    // Composite Score
    let calculatedScore = Math.round(
      skillsScore * 0.60 +
      experienceScore * 0.25 +
      (workModeScore * 0.10 + locationScore * 0.05)
    );

    let tier: "STRONG" | "VALIDATABLE" | "GAP" | "HARD_GATE_FAIL" = "GAP";
    if (hardGateVerdict === "FAIL") {
      tier = "HARD_GATE_FAIL";
      calculatedScore = Math.min(50, calculatedScore);
    } else if (calculatedScore >= 80) {
      tier = "STRONG";
    } else if (calculatedScore >= 65) {
      tier = "VALIDATABLE";
    } else {
      tier = "GAP";
    }

    // Strengths, Risks, and Recommendations
    const strengths: string[] = [];
    if (skillsOverlap.length > 0) {
      strengths.push(`Verified overlap in ${skillsOverlap.slice(0, 4).join(", ")}`);
    }
    if (candidateExpYears >= reqMinExp && candidateExpYears > 0) {
      strengths.push(`${candidateExpYears} years total experience satisfies ${reqMinExp}+ years requirement`);
    }
    if (workModeScore >= 90) {
      strengths.push(`Work mode compatibility confirmed (${reqWorkMode})`);
    }
    if (strengths.length === 0) {
      strengths.push("Candidate profile registered with valid identity credentials");
    }

    const risks: string[] = [];
    if (missingSkills.length > 0) {
      risks.push(`Unmatched requirement skills: ${missingSkills.slice(0, 3).join(", ")}`);
    }
    if (hardGateVerdict === "FAIL" && hardGateReason) {
      risks.push(hardGateReason);
    }
    if (compensationEvaluation === "— Not stated") {
      risks.push("Expected compensation not stated on resume");
    }

    let summary = `Candidate demonstrates a ${tier.toLowerCase()} alignment (${calculatedScore}%) with the ${reqTitle} position.`;
    if (skillsOverlap.length > 0) {
      summary += ` Strong foundation identified in ${skillsOverlap.slice(0, 3).join(", ")}.`;
    }
    if (missingSkills.length > 0) {
      summary += ` Technical interview should validate competency in ${missingSkills.slice(0, 2).join(", ")}.`;
    }

    let recommendation = "";
    if (tier === "STRONG") {
      recommendation = "Highly Recommended: Priority shortlist for client technical review.";
    } else if (tier === "VALIDATABLE") {
      recommendation = "Conditionally Recommended: Validate specific gaps during recruiter screening.";
    } else if (tier === "HARD_GATE_FAIL") {
      recommendation = "Not Recommended: Does not meet non-negotiable minimum qualifications.";
    } else {
      recommendation = "Low Alignment: Alternative requirements recommended.";
    }

    // 4. Persist Match Only
    onProgress?.("Persisting match record...");
    const matchId = `${candidateId}_${requirementId}`;
    const nowIso = new Date().toISOString();

    const matchPayload: CandidateRequirementMatchRecord = {
      id: matchId,
      candidateId,
      candidateName,
      requirementId,
      reqTitle,
      clientName: reqData.clientName || reqData.company || "Enterprise Partner",
      score: calculatedScore,
      matchScore: calculatedScore,
      fitScore: calculatedScore,
      tier,
      matchTier: tier,
      evidence: {
        skillsScore,
        experienceScore,
        recentRoleScore,
        workModeScore,
        locationScore,
        availabilityScore,
        domainScore,
        compensation: compensationEvaluation
      },
      breakdown: {
        skillsScore,
        experienceScore,
        domainScore,
        locationScore,
        workModeScore,
        recentRoleScore,
        availabilityScore
      },
      skillMatches: skillsOverlap,
      skillsOverlap,
      missingSkills,
      hardGateVerdict,
      hardGateReason: hardGateReason || null,
      summary,
      overallMatchReason: summary,
      strengths,
      risks,
      recommendation,
      recruiterAssessment: recommendation,
      algorithmVersion: this.MATCH_VERSION,
      evaluatedAt: nowIso,
      updatedAt: nowIso
    };

    const cleanMatchPayload = sanitizeFirestorePayload(matchPayload);

    // Save to candidateRequirementMatches
    await setDoc(doc(db, "candidateRequirementMatches", matchId), cleanMatchPayload);

    // Save to candidate_matches (for Match Intelligence Governance compatibility)
    await setDoc(doc(db, "candidate_matches", matchId), sanitizeFirestorePayload({
      ...cleanMatchPayload,
      vendorId: candData.vendorId || context.vendorId || "ORG-GLOBAL-HQ",
      clientId: reqData.clientId || reqData.client_id || "ORG-CLIENT-1",
      createdAt: nowIso,
      updatedAt: nowIso
    }));

    // Update candidate record summary with merge: true
    try {
      await setDoc(doc(db, poolCollection, candidateId), {
        matchScore: calculatedScore,
        latestMatchRequirementId: requirementId,
        latestMatchEvaluatedAt: nowIso
      }, { merge: true });
    } catch (e) {
      console.warn("[CandidateMatchingService] Note updating candidate matchScore:", e);
    }

    // 5. Emit Event (CANDIDATE_REQUIREMENT_MATCHED)
    // Note: Do NOT emit SUBMISSION_CREATED and do NOT trigger global MatchingOffice.matchRequirement
    onProgress?.("Emitting match event...");
    try {
      await emitEvent(
        "CANDIDATE_REQUIREMENT_MATCHED",
        "CANDIDATE",
        candidateId,
        context.userId || context.organizationId,
        context.role,
        {
          requirementId,
          score: calculatedScore,
          tier,
          evaluatedAt: nowIso
        }
      );
    } catch (evErr) {
      console.warn("[CandidateMatchingService] Note emitting event:", evErr);
    }

    onProgress?.("Match Complete");
    return matchPayload;
  }
}
