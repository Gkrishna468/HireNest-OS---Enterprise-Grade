import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { AccessControlService, HireNestAccessContext } from "./accessControlService.js";

/**
 * Unified Requirements Service
 * Centralized, authoritative resolver for operational requirements across HireNestOS.
 */
export class UnifiedRequirementsService {
  /**
   * Canonical Operational Gate Test
   * Consistent Invariant: status is ACTIVE, PUBLISHED, or OPEN.
   */
  static isRequirementOperational(req: any): boolean {
    if (!req) return false;
    const status = (req.status || "").toUpperCase();
    const distStatus = (req.distributionStatus || "").toUpperCase();

    const isStatusOk = status === "ACTIVE" || status === "PUBLISHED" || status === "OPEN";
    const isDistOk = distStatus === "PUBLISHED" || distStatus === "ACTIVE" || distStatus === "OPEN";

    return isStatusOk && isDistOk;
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
    return reqs.filter((req) => this.isAuthorizedOperational(req, actorId, role));
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

      return authorized;
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
