/**
 * CandidateRequirementEligibilityPolicy
 * 
 * The single authoritative policy source of truth governing candidate-facing requirement visibility.
 * 
 * Strict Candidate Gate Rules:
 * 1. Status === ACTIVE | OPEN | PUBLISHED
 * 2. Employment Type === FTE | FULL-TIME | PERMANENT
 * 3. Work Mode === ONSITE (Explicitly rejects REMOTE, C2C, CONTRACT)
 * 4. candidatePublish / candidate_publish !== false
 * 5. directApplyEnabled !== false
 */

export interface CandidateRequirementPolicyEvaluation {
  isEligible: boolean;
  reasons: string[];
  sanitizedWorkMode: "Onsite";
  sanitizedEmploymentType: "FTE";
}

export class CandidateRequirementEligibilityPolicy {
  /**
   * Authoritatively checks if a raw requirement meets all criteria for public candidate visibility.
   */
  public static isCandidateEligible(rawReq: any): boolean {
    if (!rawReq) return false;

    // 1. Status Gate (Active / Open only)
    const status = (rawReq.status || "").toString().trim().toUpperCase();
    const isStatusActive = status === "ACTIVE" || status === "OPEN" || status === "PUBLISHED";
    if (!isStatusActive) return false;

    // 2. Candidate Publish Flag Gate
    if (rawReq.candidatePublish === false || rawReq.candidate_publish === false) {
      return false;
    }

    // 3. Work Mode Gate (Strictly ONSITE only - Rejects Remote, C2C, Contract)
    const rawMode = (rawReq.workMode || "").toString().trim().toUpperCase();
    const rawJobType = (rawReq.jobType || "").toString().trim().toUpperCase();
    const rawType = (rawReq.employmentType || rawReq.type || "").toString().trim().toUpperCase();

    // Check banned keywords
    if (
      rawMode.includes("REMOTE") ||
      rawMode.includes("C2C") ||
      rawJobType.includes("C2C") ||
      rawType.includes("C2C") ||
      rawJobType.includes("CONTRACT") ||
      rawType.includes("CONTRACT") ||
      rawMode.includes("CONTRACT")
    ) {
      return false;
    }

    // Must be Onsite
    const isOnsite =
      rawMode.includes("ONSITE") ||
      rawMode === "ON-SITE" ||
      rawMode === "ON SITE" ||
      rawMode === "IN-OFFICE" ||
      rawMode === "OFFICE";
    if (!isOnsite) {
      return false;
    }

    // 4. Employment Type Gate (Strictly FTE / Full-Time only)
    const isFTE =
      rawType === "FTE" ||
      rawType === "FULL-TIME" ||
      rawType === "FULL TIME" ||
      rawType === "PERMANENT" ||
      rawJobType === "FTE" ||
      rawJobType === "FULL-TIME" ||
      rawJobType === "FULL TIME" ||
      rawJobType === "PERMANENT" ||
      (!rawType && !rawJobType); // Default fallback for Onsite active requirement

    if (!isFTE) {
      return false;
    }

    // 5. Direct Apply Gate
    if (rawReq.directApplyEnabled === false) {
      return false;
    }

    return true;
  }

  /**
   * Detailed policy evaluation for diagnostic auditing and explanation
   */
  public static evaluateRequirement(rawReq: any): CandidateRequirementPolicyEvaluation {
    const reasons: string[] = [];
    if (!rawReq) {
      return {
        isEligible: false,
        reasons: ["Requirement is null or undefined"],
        sanitizedWorkMode: "Onsite",
        sanitizedEmploymentType: "FTE"
      };
    }

    const status = (rawReq.status || "").toString().trim().toUpperCase();
    const isStatusActive = status === "ACTIVE" || status === "OPEN" || status === "PUBLISHED";
    if (!isStatusActive) reasons.push(`Status '${status}' is not ACTIVE/OPEN`);

    if (rawReq.candidatePublish === false || rawReq.candidate_publish === false) {
      reasons.push("candidatePublish flag is explicitly disabled");
    }

    const rawMode = (rawReq.workMode || "").toString().trim().toUpperCase();
    const rawJobType = (rawReq.jobType || "").toString().trim().toUpperCase();
    const rawType = (rawReq.employmentType || rawReq.type || "").toString().trim().toUpperCase();

    if (rawMode.includes("REMOTE")) reasons.push("Remote work mode is excluded from candidate feed");
    if (rawMode.includes("C2C") || rawJobType.includes("C2C") || rawType.includes("C2C")) {
      reasons.push("C2C arrangement is excluded from candidate feed");
    }
    if (rawJobType.includes("CONTRACT") || rawType.includes("CONTRACT") || rawMode.includes("CONTRACT")) {
      reasons.push("Contract arrangement is excluded from candidate feed");
    }

    const isOnsite =
      rawMode.includes("ONSITE") ||
      rawMode === "ON-SITE" ||
      rawMode === "ON SITE" ||
      rawMode === "IN-OFFICE" ||
      rawMode === "OFFICE";
    if (!isOnsite) reasons.push(`Work mode '${rawMode}' is not Onsite`);

    const isFTE =
      rawType === "FTE" ||
      rawType === "FULL-TIME" ||
      rawType === "FULL TIME" ||
      rawType === "PERMANENT" ||
      rawJobType === "FTE" ||
      rawJobType === "FULL-TIME" ||
      rawJobType === "FULL TIME" ||
      rawJobType === "PERMANENT" ||
      (!rawType && !rawJobType);
    if (!isFTE) reasons.push(`Employment type '${rawType || rawJobType}' is not FTE`);

    if (rawReq.directApplyEnabled === false) reasons.push("directApplyEnabled is explicitly false");

    return {
      isEligible: reasons.length === 0,
      reasons,
      sanitizedWorkMode: "Onsite",
      sanitizedEmploymentType: "FTE"
    };
  }
}
