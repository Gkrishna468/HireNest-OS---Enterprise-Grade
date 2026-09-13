import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError, CoreAuthorizationError } from "../types";
import { RequirementService } from "./RequirementService";

export type SubmissionStage =
  | "SUBMITTED"
  | "SCREENING_PASSED"
  | "INTERVIEW_SCHEDULED"
  | "OFFER_EXTENDED"
  | "PLACED"
  | "REJECTED";

export interface SubmissionEntity {
  id: string;
  requirementId: string;
  candidateId: string;
  candidateName: string;
  vendorId: string;
  recruiterId: string;
  recruiterEmail: string;
  stage: SubmissionStage;
  aiMatchScore?: number;
  expectedRate?: number;
  submittedAt: string;
  updatedAt: string;
}

const memorySubmissions = new Map<string, SubmissionEntity>();

function cleanData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export class SubmissionService {
  static async getSubmission(ctx: HireNestAccessContext, submissionId: string): Promise<SubmissionEntity> {
    enforceCoreAccess(ctx, "submissions.read");

    let data: SubmissionEntity | undefined = memorySubmissions.get(submissionId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "submissions", submissionId));
        if (snap.exists()) {
          data = { ...(snap.data() as SubmissionEntity), id: snap.id };
        }
      } catch (e) {}
    }

    if (!data) {
      throw new CoreResourceNotFoundError("Submission", submissionId);
    }

    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const callerVendor = ctx.vendorId || ctx.organizationId;
      enforceCoreAccess(ctx, "submissions.read", { vendorId: data.vendorId || callerVendor });
    }

    return data;
  }

  static async createSubmission(
    ctx: HireNestAccessContext,
    payload: { requirementId: string; candidateId: string; candidateName: string; aiMatchScore?: number; expectedRate?: number }
  ): Promise<SubmissionEntity> {
    enforceCoreAccess(ctx, "submissions.create");

    const vendorId = ctx.vendorId || ctx.organizationId;
    if (!vendorId && !ctx.isAdminEquivalent) {
      throw new CoreAuthorizationError("Vendor recruiter must belong to a valid Vendor Organization to submit.");
    }

    const subId = `SUB-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const entity: SubmissionEntity = {
      id: subId,
      requirementId: payload.requirementId,
      candidateId: payload.candidateId,
      candidateName: payload.candidateName,
      vendorId: vendorId || "ORG-HQ",
      recruiterId: ctx.uid,
      recruiterEmail: ctx.email,
      stage: "SUBMITTED",
      submittedAt: now,
      updatedAt: now,
      ...(payload.aiMatchScore !== undefined ? { aiMatchScore: payload.aiMatchScore } : {}),
      ...(payload.expectedRate !== undefined ? { expectedRate: payload.expectedRate } : {}),
    };

    memorySubmissions.set(subId, entity);

    try {
      await setDoc(doc(db, "submissions", subId), cleanData(entity));
    } catch (e) {}

    // Increment fulfillment telemetry on Requirement SSOT
    try {
      await RequirementService.updateFulfillmentStats(ctx, payload.requirementId, { submissions: 1 });
    } catch (e) {}

    return entity;
  }

  static async advanceStage(
    ctx: HireNestAccessContext,
    submissionId: string,
    nextStage: SubmissionStage
  ): Promise<void> {
    enforceCoreAccess(ctx, "submissions.update");

    let current = memorySubmissions.get(submissionId);
    if (!current) {
      try {
        const snap = await getDoc(doc(db, "submissions", submissionId));
        if (snap.exists()) {
          current = snap.data() as SubmissionEntity;
        }
      } catch (e) {}
    }

    if (!current) {
      throw new CoreResourceNotFoundError("Submission", submissionId);
    }

    const updated: SubmissionEntity = {
      ...current,
      stage: nextStage,
      updatedAt: new Date().toISOString(),
    };

    memorySubmissions.set(submissionId, updated);

    try {
      await updateDoc(doc(db, "submissions", submissionId), {
        stage: nextStage,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {}
  }
}
