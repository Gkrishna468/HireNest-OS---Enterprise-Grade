import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError } from "../types";

export interface SLAEntity {
  id: string;
  requirementId: string;
  clientId: string;
  firstSubmissionTargetHours: number;
  shortlistTargetHours: number;
  interviewTargetHours: number;
  fulfillmentTargetDays: number;
  createdAt: string;
  breachStatus: "ON_TRACK" | "AT_RISK" | "BREACHED";
}

const memorySLAs = new Map<string, SLAEntity>();

export class SLAService {
  static async getRequirementSLA(ctx: HireNestAccessContext, requirementId: string): Promise<SLAEntity | null> {
    enforceCoreAccess(ctx, "sla.read");
    let data = memorySLAs.get(requirementId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "sla_rules", requirementId));
        if (snap.exists()) {
          data = { ...(snap.data() as SLAEntity), id: snap.id };
        }
      } catch (e) {}
    }
    return data || null;
  }

  static async setRequirementSLA(
    ctx: HireNestAccessContext,
    payload: { requirementId: string; clientId: string; fulfillmentTargetDays: number }
  ): Promise<SLAEntity> {
    enforceCoreAccess(ctx, "sla.manage");
    const entity: SLAEntity = {
      id: payload.requirementId,
      requirementId: payload.requirementId,
      clientId: payload.clientId,
      firstSubmissionTargetHours: 24,
      shortlistTargetHours: 48,
      interviewTargetHours: 72,
      fulfillmentTargetDays: payload.fulfillmentTargetDays || 30,
      createdAt: new Date().toISOString(),
      breachStatus: "ON_TRACK",
    };
    memorySLAs.set(payload.requirementId, entity);
    try {
      await setDoc(doc(db, "sla_rules", payload.requirementId), entity);
    } catch (e) {}
    return entity;
  }
}

export interface BudgetEntity {
  id: string;
  clientId: string;
  totalApprovedBudget: number;
  allocatedBudget: number;
  utilizedBudget: number;
  currency: string;
  fiscalYear: string;
  updatedAt: string;
}

const memoryBudgets = new Map<string, BudgetEntity>();

export class BudgetService {
  static async getClientBudget(ctx: HireNestAccessContext, clientId: string): Promise<BudgetEntity | null> {
    enforceCoreAccess(ctx, "budget.read");
    if (ctx.role.startsWith("CLIENT_")) {
      const callerClient = ctx.clientId || ctx.organizationId;
      enforceCoreAccess(ctx, "budget.read", { clientId: callerClient });
    }
    let data = memoryBudgets.get(clientId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "client_budgets", clientId));
        if (snap.exists()) {
          data = { ...(snap.data() as BudgetEntity), id: snap.id };
        }
      } catch (e) {}
    }
    if (!data) {
      // Default initial budget entity
      data = {
        id: clientId,
        clientId,
        totalApprovedBudget: 500000,
        allocatedBudget: 150000,
        utilizedBudget: 80000,
        currency: "INR",
        fiscalYear: "FY2026",
        updatedAt: new Date().toISOString(),
      };
      memoryBudgets.set(clientId, data);
    }
    return data;
  }
}

export interface PerformanceEntity {
  id: string;
  vendorId?: string;
  recruiterId?: string;
  clientId?: string;
  submissionToInterviewRate: number;
  interviewToOfferRate: number;
  offerToPlacementRate: number;
  averageTimeToFillDays: number;
  overallScore: number;
  computedAt: string;
}

const memoryPerformance = new Map<string, PerformanceEntity>();

export class PerformanceService {
  static async getVendorPerformance(ctx: HireNestAccessContext, vendorId: string): Promise<PerformanceEntity | null> {
    enforceCoreAccess(ctx, "performance.read");
    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const callerVendor = ctx.vendorId || ctx.organizationId;
      enforceCoreAccess(ctx, "performance.read", { vendorId: callerVendor });
    }
    let data = memoryPerformance.get(vendorId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "performance_metrics", `VENDOR_${vendorId}`));
        if (snap.exists()) {
          data = { ...(snap.data() as PerformanceEntity), id: snap.id };
        }
      } catch (e) {}
    }
    if (!data) {
      data = {
        id: `PERF-${vendorId}`,
        vendorId,
        submissionToInterviewRate: 68.5,
        interviewToOfferRate: 42.0,
        offerToPlacementRate: 91.2,
        averageTimeToFillDays: 14,
        overallScore: 88,
        computedAt: new Date().toISOString(),
      };
      memoryPerformance.set(vendorId, data);
    }
    return data;
  }
}
