import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { AccessControlService, HireNestAccessContext } from "./accessControlService";

/**
 * Unified Requirements Service
 * Centralized, authoritative resolver for operational requirements across HireNestOS.
 */
export class UnifiedRequirementsService {
  /**
   * Canonical Operational Gate Test
   * Strict Invariant: status === 'ACTIVE' AND distributionStatus === 'PUBLISHED'
   * No legacy fallbacks: unstated, missing, or alternate flags are rejected.
   */
  static isRequirementOperational(req: any): boolean {
    if (!req) return false;
    const status = (req.status || "").toUpperCase();
    const distStatus = (req.distributionStatus || "").toUpperCase();

    // Strict canonical gate: ACTIVE AND PUBLISHED
    return status === "ACTIVE" && distStatus === "PUBLISHED";
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
      // 1. Fetch requirements using scoped server-side query with graceful fallback
      let allReqs: any[] = [];
      try {
        const qScoped = query(
          collection(db, "requirements_public"),
          where("status", "==", "ACTIVE"),
          where("distributionStatus", "==", "PUBLISHED")
        );
        const snap = await getDocs(qScoped);
        allReqs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (scopedErr) {
        console.warn("[UnifiedRequirementsService] Scoped query fallback:", scopedErr);
        const snap = await getDocs(collection(db, "requirements_public"));
        allReqs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }

      // 2. Strict canonical in-memory gate: ACTIVE AND PUBLISHED
      const operationalReqs = allReqs.filter((req) =>
        this.isRequirementOperational(req)
      );

      // 3. Filter using authoritative AccessControlService permissions
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
