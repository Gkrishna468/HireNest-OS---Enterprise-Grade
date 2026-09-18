import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase.js";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError } from "../types.js";

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
      let totalApproved = 0;
      let totalAllocated = 0;
      let totalUtilized = 0;
      let currencyCode = "INR";

      try {
        const reqRef = collection(db, "requirements_public");
        const reqQuery = query(reqRef, where("clientId", "==", clientId));
        const reqSnap = await getDocs(reqQuery);

        reqSnap.forEach((docSnap) => {
          const reqData = docSnap.data();
          const budget = Number(reqData.financials?.clientBudget || reqData.vendorVisibleBudget || 0);
          if (budget > 0) {
            totalApproved += budget;
            if (reqData.status === "ACTIVE" || reqData.status === "PUBLISHED") {
              totalAllocated += budget;
            }
          }
          if (reqData.financials?.clientCurrency) {
            currencyCode = reqData.financials.clientCurrency;
          }
        });

        const subRef = collection(db, "submissions");
        const subQuery = query(subRef, where("clientId", "==", clientId), where("status", "in", ["HIRED", "PLACED"]));
        const subSnap = await getDocs(subQuery);

        subSnap.forEach((docSnap) => {
          const subData = docSnap.data();
          const subRate = Number(subData.clientBillRate || subData.billingRate || 0);
          if (subRate > 0) {
            totalUtilized += subRate * 160;
          } else if (subData.budgetAllocation) {
            totalUtilized += Number(subData.budgetAllocation || 0);
          }
        });
      } catch (e) {
        console.warn("Failed to dynamically compute client budget:", e);
      }

      data = {
        id: clientId,
        clientId,
        totalApprovedBudget: totalApproved,
        allocatedBudget: totalAllocated,
        utilizedBudget: totalUtilized,
        currency: currencyCode,
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
