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
   * MUST pass BOTH status === 'ACTIVE' AND distributionStatus === 'PUBLISHED' (or equivalent active flags)
   */
  static isRequirementOperational(req: any): boolean {
    if (!req) return false;
    const status = (req.status || "").toUpperCase();
    const distStatus = (
      req.distributionStatus ||
      req.vendorVisibility ||
      (req.published ? "PUBLISHED" : "") ||
      ""
    ).toUpperCase();

    // Strict canonical gate: ACTIVE AND PUBLISHED
    const isActive = status === "ACTIVE";
    const isPublished =
      distStatus === "PUBLISHED" ||
      distStatus === "ENABLED" ||
      req.published === true ||
      req.vendorVisibility === "ENABLED" ||
      (!req.distributionStatus && isActive);

    return isActive && isPublished;
  }

  /**
   * Centralized Resolver: Returns only operational requirements authorized for the given access context.
   */
  static async getAuthorizedOperationalRequirements(
    context: HireNestAccessContext
  ): Promise<any[]> {
    try {
      // 1. Fetch requirements from canonical requirements_public collection
      const qReqs = collection(db, "requirements_public");
      const snap = await getDocs(qReqs);
      const allReqs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

      // 2. Filter using strict operational gate (ACTIVE AND PUBLISHED)
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
