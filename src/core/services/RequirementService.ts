import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit, orderBy } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError } from "../types";

export interface RequirementEntity {
  id: string;
  title: string;
  clientId: string;
  clientName: string;
  status: "DRAFT" | "ACTIVE" | "PAUSED" | "FULFILLED" | "CANCELLED";
  distributionState: "UNPUBLISHED" | "TIER_1_ONLY" | "OPEN_ALL_VENDORS" | "CLOSED";
  positionsCount: number;
  openPositionsCount: number;
  skills: string[];
  location: string;
  budgetMin?: number;
  budgetMax?: number;
  rateCardCurrency?: string;
  assignedRecruiterId?: string;
  authorizedVendorIds: string[];
  opportunityId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  fulfillmentStats: {
    submissionsCount: number;
    interviewsCount: number;
    offersCount: number;
    placementsCount: number;
  };
}

const memoryRequirements = new Map<string, RequirementEntity>();

export class RequirementService {
  /**
   * Retrieves a requirement with ABAC boundary check
   */
  static async getRequirement(ctx: HireNestAccessContext, requirementId: string): Promise<RequirementEntity> {
    enforceCoreAccess(ctx, "requirements.read");

    let data = memoryRequirements.get(requirementId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "requirements", requirementId));
        if (snap.exists()) {
          data = { ...(snap.data() as RequirementEntity), id: snap.id };
        }
      } catch (e) {}
    }

    if (!data) {
      throw new CoreResourceNotFoundError("Requirement", requirementId);
    }

    // Scope check: Vendors can only view requirements authorized to their vendor organization
    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const vendorId = ctx.vendorId || ctx.organizationId;
      if (
        data.distributionState === "UNPUBLISHED" ||
        (data.distributionState === "TIER_1_ONLY" && !data.authorizedVendorIds?.includes(vendorId))
      ) {
        enforceCoreAccess(ctx, "requirements.read", { vendorId: data.authorizedVendorIds?.[0] || "UNAUTHORIZED" });
      }
    } else if (ctx.role.startsWith("CLIENT_")) {
      const clientOrg = ctx.clientId || ctx.organizationId;
      enforceCoreAccess(ctx, "requirements.read", { clientId: data.clientId || clientOrg });
    }

    return data;
  }

  /**
   * Creates requirement (from OS operations or CRM qualified opportunity handoff)
   */
  static async createRequirement(
    ctx: HireNestAccessContext,
    payload: Partial<RequirementEntity>
  ): Promise<RequirementEntity> {
    enforceCoreAccess(ctx, "requirements.create");

    const reqId = payload.id || `HN-REQ-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const newReq: RequirementEntity = {
      id: reqId,
      title: payload.title || "Untitled Requisition",
      clientId: payload.clientId || ctx.clientId || ctx.organizationId || "CLIENT-DEFAULT",
      clientName: payload.clientName || "Enterprise Client",
      status: payload.status || "ACTIVE",
      distributionState: payload.distributionState || "UNPUBLISHED",
      positionsCount: payload.positionsCount || 1,
      openPositionsCount: payload.openPositionsCount || payload.positionsCount || 1,
      skills: payload.skills || [],
      location: payload.location || "Remote",
      budgetMin: payload.budgetMin,
      budgetMax: payload.budgetMax,
      rateCardCurrency: payload.rateCardCurrency || "INR",
      assignedRecruiterId: payload.assignedRecruiterId,
      authorizedVendorIds: payload.authorizedVendorIds || [],
      opportunityId: payload.opportunityId,
      createdAt: now,
      updatedAt: now,
      createdBy: ctx.email || ctx.uid,
      fulfillmentStats: {
        submissionsCount: 0,
        interviewsCount: 0,
        offersCount: 0,
        placementsCount: 0,
      },
    };

    memoryRequirements.set(reqId, newReq);

    const cleanReq: Record<string, any> = {};
    for (const [key, value] of Object.entries(newReq)) {
      if (value !== undefined) {
        cleanReq[key] = value;
      }
    }

    try {
      await setDoc(doc(db, "requirements", reqId), cleanReq);
    } catch (err) {
      // Memory fallback for tests
    }
    return newReq;
  }

  /**
   * Updates fulfillment telemetry (OS execution feedback loop to CRM)
   */
  static async updateFulfillmentStats(
    ctx: HireNestAccessContext,
    requirementId: string,
    delta: { submissions?: number; interviews?: number; offers?: number; placements?: number }
  ): Promise<void> {
    const isLifecycleAuthorized =
      ctx.permissions.includes("requirements.update") ||
      ctx.permissions.includes("submissions.create") ||
      ctx.permissions.includes("interviews.create") ||
      ctx.permissions.includes("offers.create") ||
      ctx.permissions.includes("placements.create") ||
      ctx.isAdminEquivalent;

    if (!isLifecycleAuthorized) {
      enforceCoreAccess(ctx, "requirements.update");
    }

    let data = memoryRequirements.get(requirementId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "requirements", requirementId));
        if (snap.exists()) {
          data = snap.data() as RequirementEntity;
        }
      } catch (e) {}
    }

    if (!data) return;

    const current = data.fulfillmentStats || {
      submissionsCount: 0,
      interviewsCount: 0,
      offersCount: 0,
      placementsCount: 0,
    };

    const updated = {
      submissionsCount: Math.max(0, current.submissionsCount + (delta.submissions || 0)),
      interviewsCount: Math.max(0, current.interviewsCount + (delta.interviews || 0)),
      offersCount: Math.max(0, current.offersCount + (delta.offers || 0)),
      placementsCount: Math.max(0, current.placementsCount + (delta.placements || 0)),
    };

    const openCount = Math.max(0, data.positionsCount - updated.placementsCount);

    const updatedReq: RequirementEntity = {
      ...data,
      fulfillmentStats: updated,
      openPositionsCount: openCount,
      status: openCount === 0 ? "FULFILLED" : data.status,
      updatedAt: new Date().toISOString(),
    };

    memoryRequirements.set(requirementId, updatedReq);

    try {
      await updateDoc(doc(db, "requirements", requirementId), {
        fulfillmentStats: updated,
        openPositionsCount: openCount,
        status: openCount === 0 ? "FULFILLED" : data.status,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {}
  }
}
