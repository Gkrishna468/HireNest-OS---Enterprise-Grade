import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { AccessControlService, HireNestAccessContext } from "./accessControlService.js";

/**
 * Unified Requirements Service
 * Centralized, authoritative resolver for operational requirements across HireNestOS.
 */
export class UnifiedRequirementsService {
  /**
   * Canonical Operational Gate Predicate
   * A requirement is eligible for operational matching ONLY when all canonical conditions hold:
   * - Canonical lifecycle status is ACTIVE or OPEN (trimmed, case-insensitive)
   * - Distribution status is PUBLISHED (or authorized multi-vendor distribution states)
   * - If approvalStatus exists: strictly APPROVED (fail closed on PENDING, REJECTED, etc.)
   * - Inactive states (CLOSED, ARCHIVED, HOLD, PAUSED, EXPIRED, DRAFT, CANCELLED, UNPUBLISHED) are strictly rejected
   */
  static isRequirementOperational(req: any): boolean {
    if (!req) return false;
    const status = (req.status || req.lifecycleStatus || "").toString().trim().toUpperCase();
    const distStatus = (req.distributionStatus || req.distributionState || "").toString().trim().toUpperCase();
    const approvalStatus = (req.approvalStatus || "").toString().trim().toUpperCase();

    // 1. Inactive lifecycle / distribution states strictly disqualify
    const inactiveStatuses = [
      "CLOSED", "ARCHIVED", "HOLD", "ON_HOLD", "ON-HOLD", "PAUSED",
      "EXPIRED", "DRAFT", "CANCELLED", "CANCELED", "FULFILLED", "FILLED",
      "INACTIVE", "SUSPENDED", "COMPLETED", "REJECTED"
    ];
    if (inactiveStatuses.includes(status)) return false;

    const inactiveDistStatuses = [
      "UNPUBLISHED", "DRAFT", "HOLD", "ON_HOLD", "PAUSED", "ARCHIVED", "CLOSED"
    ];
    if (inactiveDistStatuses.includes(distStatus)) return false;

    // 2. If approvalStatus exists, fail closed if not APPROVED
    if (approvalStatus && approvalStatus !== "APPROVED") {
      return false;
    }

    // 3. Canonical lifecycle status must be ACTIVE or OPEN
    const isStatusOk = status === "ACTIVE" || status === "OPEN";
    if (!isStatusOk) return false;

    // 4. Distribution status must be PUBLISHED or authorized operational distribution state
    const isDistOk = distStatus === "PUBLISHED" || distStatus === "OPEN_ALL_VENDORS" || distStatus === "TIER_1_ONLY";
    if (!isDistOk) return false;

    return true;
  }

  /**
   * Canonical In-Memory Deduplication:
   * Deduplicates requirement objects across collections, sync IDs, and aliases.
   */
  static deduplicateRequirements(requirements: any[]): any[] {
    if (!Array.isArray(requirements)) return [];
    const seenIds = new Set<string>();
    const seenFingerprints = new Set<string>();
    const deduplicated: any[] = [];

    for (const req of requirements) {
      if (!req) continue;
      const canonicalId = (req.id || req.requirementId || req.reqId || "").toString().trim();
      const altId = (req.requirementId || req.id || "").toString().trim();

      const normTitle = (req.title || req.role || "").toString().trim().toLowerCase();
      const normClient = (req.clientName || req.company || req.clientId || "").toString().trim().toLowerCase();
      const fingerprint = normTitle ? `${normTitle}___${normClient}` : "";

      if (canonicalId && seenIds.has(canonicalId)) continue;
      if (altId && seenIds.has(altId)) continue;
      if (fingerprint && seenFingerprints.has(fingerprint)) continue;

      if (canonicalId) seenIds.add(canonicalId);
      if (altId) seenIds.add(altId);
      if (fingerprint) seenFingerprints.add(fingerprint);

      deduplicated.push(req);
    }

    return deduplicated;
  }

  /**
   * Authoritative synchronous check for operational + authorized status
   */
  static isAuthorizedOperational(
    req: any,
    actorId?: string,
    role?: string
  ): boolean {
    if (!this.isRequirementOperational(req)) return false;
    if (!actorId || !role) return true;
    return AccessControlService.isRequirementAuthorized(actorId, role, req);
  }

  /**
   * Authoritative synchronous filter for an array of requirements
   */
  static filterOperationalRequirements(
    reqs: any[],
    actorId?: string,
    role?: string
  ): any[] {
    if (!Array.isArray(reqs)) return [];
    const operational = reqs.filter((req) => this.isAuthorizedOperational(req, actorId, role));
    return this.deduplicateRequirements(operational);
  }

  /**
   * Centralized Resolver: Returns only operational requirements authorized for the given access context.
   */
  static async getAuthorizedOperationalRequirements(
    context: HireNestAccessContext
  ): Promise<any[]> {
    try {
      let allReqs: any[] = [];
      
      // 1. Fetch from canonical 'requirements' first
      try {
        const snap = await getDocs(collection(db, "requirements"));
        allReqs = snap.docs.map((d) => {
          const data = d.data();
          const reqId = d.id || data.requirementId || data.id;
          return { id: reqId, requirementId: reqId, ...data };
        });
      } catch (err) {
        console.warn("[UnifiedRequirementsService] Failed to load canonical requirements:", err);
      }

      // 2. Fetch from legacy 'requirements_public' and merge (deduplicate)
      try {
        const snapPub = await getDocs(collection(db, "requirements_public"));
        const publicReqs = snapPub.docs.map((d) => {
          const data = d.data();
          const reqId = d.id || data.requirementId || data.id;
          return { id: reqId, requirementId: reqId, ...data };
        });
        const existingIds = new Set(allReqs.map(r => r.id));
        for (const req of publicReqs) {
          if (req.id && !existingIds.has(req.id)) {
            allReqs.push(req);
          }
        }
      } catch (err) {
        console.warn("[UnifiedRequirementsService] Failed to load legacy requirements_public:", err);
      }

      // 3. Strict canonical in-memory gate: relaxed operational check
      const operationalReqs = allReqs.filter((req) =>
        this.isRequirementOperational(req)
      );

      // 4. Filter using authoritative AccessControlService permissions
      const authorized: any[] = [];
      const role = (context.role || "").toUpperCase();

      for (const req of operationalReqs) {
        const canView = await AccessControlService.canViewRequirement(
          context,
          req.id
        );

        if (!canView) continue;

        if (role === "VENDOR") {
          const vendorId = context.vendorId || context.organizationId;
          const canAccessVendorAuth =
            await AccessControlService.canAccessRequirementVendorAuthorization(
              context,
              req.id,
              vendorId
            );
          if (canAccessVendorAuth) {
            authorized.push(req);
          }
        } else {
          authorized.push(req);
        }
      }

      return this.deduplicateRequirements(authorized);
    } catch (err: any) {
      console.error(
        "[UnifiedRequirementsService] Error fetching authorized operational requirements:",
        err?.message
      );
      return [];
    }
  }
}

export const unifiedRequirementsService = UnifiedRequirementsService;
