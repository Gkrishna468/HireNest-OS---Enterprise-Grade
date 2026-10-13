/**
 * VendorRequirementEligibilityPolicy
 * 
 * The authoritative policy governing requirement eligibility within the Authorized Vendor Workspace.
 * 
 * Separates the Authorized Vendor Workspace path from the Public Candidate Feed path:
 * 
 * 1. Public Candidate Feed (CandidateRequirementEligibilityPolicy.isCandidateEligible):
 *    - Strictly ONSITE work mode (rejects REMOTE, HYBRID, C2C, CONTRACT)
 *    - Strictly FTE / FULL-TIME employment type
 *    - Strict candidatePublish !== false
 *    - Strict directApplyEnabled !== false
 * 
 * 2. Authorized Vendor Workspace (VendorRequirementEligibilityPolicy.isVendorEligible):
 *    - Allows requirements eligible for vendor delivery and staffing
 *    - Permits REMOTE, HYBRID, and ONSITE work modes
 *    - Permits CONTRACT, C2C, C2H, and FTE employment types
 *    - Requires active operational lifecycle: status === ACTIVE | OPEN | PUBLISHED | APPROVED
 *    - Rejects inactive lifecycle states: CLOSED, ARCHIVED, HOLD, PAUSED, EXPIRED, DRAFT
 *    - Rejects unpublished distribution states: UNPUBLISHED, DRAFT, HOLD
 *    - Ensures requirement is not explicitly hidden from vendors (visibility.vendors !== false, vendorVisible !== false)
 */

export interface VendorRequirementPolicyEvaluation {
  isEligible: boolean;
  reasons: string[];
}

export class VendorRequirementEligibilityPolicy {
  /**
   * Authoritatively checks if a raw requirement meets criteria for vendor-workspace visibility and matching.
   * Allows remote, contract, C2C, and FTE requirements, provided they satisfy canonical operational lifecycle
   * and are not explicitly hidden from vendors.
   */
  public static isVendorEligible(rawReq: any): boolean {
    if (!rawReq) return false;

    // 1. Lifecycle Status Gate
    const status = (rawReq.status || "").toString().trim().toUpperCase();
    const distStatus = (rawReq.distributionStatus || "").toString().trim().toUpperCase();

    // Inactive lifecycle states are strictly excluded from vendor matching
    if (
      status === "CLOSED" ||
      status === "ARCHIVED" ||
      status === "HOLD" ||
      status === "PAUSED" ||
      status === "EXPIRED" ||
      status === "DRAFT" ||
      distStatus === "UNPUBLISHED" ||
      distStatus === "DRAFT" ||
      distStatus === "HOLD"
    ) {
      return false;
    }

    // Must have active operational status
    const isStatusActive = status === "ACTIVE" || status === "OPEN" || status === "PUBLISHED" || status === "APPROVED";
    if (!isStatusActive) {
      return false;
    }

    // If distributionStatus is explicitly present, it must be PUBLISHED or ACTIVE
    if (distStatus && distStatus !== "PUBLISHED" && distStatus !== "ACTIVE") {
      return false;
    }

    // 2. Vendor Visibility Gate: Cannot be explicitly hidden from vendors
    if (rawReq.visibility?.vendors === false || rawReq.vendorVisible === false) {
      return false;
    }

    // Authorized Vendor Workspace allows all standard work modes (Remote, Hybrid, Onsite)
    // and employment types (FTE, Contract, C2C, C2H)
    return true;
  }

  /**
   * Detailed policy evaluation for diagnostic auditing and explanation in vendor workspaces
   */
  public static evaluateVendorRequirement(rawReq: any): VendorRequirementPolicyEvaluation {
    const reasons: string[] = [];
    if (!rawReq) {
      return {
        isEligible: false,
        reasons: ["Requirement is null or undefined"]
      };
    }

    const status = (rawReq.status || "").toString().trim().toUpperCase();
    const distStatus = (rawReq.distributionStatus || "").toString().trim().toUpperCase();

    if (
      status === "CLOSED" ||
      status === "ARCHIVED" ||
      status === "HOLD" ||
      status === "PAUSED" ||
      status === "EXPIRED" ||
      status === "DRAFT"
    ) {
      reasons.push(`Requirement status '${status}' is not operational`);
    }

    if (distStatus === "UNPUBLISHED" || distStatus === "DRAFT" || distStatus === "HOLD") {
      reasons.push(`Distribution status '${distStatus}' is not published`);
    }

    const isStatusActive = status === "ACTIVE" || status === "OPEN" || status === "PUBLISHED" || status === "APPROVED";
    if (!isStatusActive) {
      reasons.push(`Status '${status}' is not ACTIVE/OPEN/PUBLISHED/APPROVED`);
    }

    if (distStatus && distStatus !== "PUBLISHED" && distStatus !== "ACTIVE") {
      reasons.push(`Distribution status '${distStatus}' is not PUBLISHED or ACTIVE`);
    }

    if (rawReq.visibility?.vendors === false || rawReq.vendorVisible === false) {
      reasons.push("Requirement is explicitly hidden from vendors");
    }

    return {
      isEligible: reasons.length === 0,
      reasons
    };
  }
}
