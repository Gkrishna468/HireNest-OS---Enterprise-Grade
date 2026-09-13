import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { HireNestAccessContext, enforceCoreAccess, CoreResourceNotFoundError, CoreAuthorizationError } from "../types";
import { RequirementService } from "./RequirementService";
import { SubmissionService } from "./SubmissionService";

export interface InterviewEntity {
  id: string;
  submissionId: string;
  requirementId: string;
  candidateId: string;
  candidateName: string;
  vendorId: string;
  clientId: string;
  roundName: string;
  scheduledAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  feedback?: string;
  score?: number;
  interviewerEmail?: string;
  createdAt: string;
  updatedAt: string;
}

const memoryInterviews = new Map<string, InterviewEntity>();

function cleanData<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as T;
}

export class InterviewService {
  static async scheduleInterview(
    ctx: HireNestAccessContext,
    payload: {
      submissionId: string;
      requirementId: string;
      candidateId: string;
      candidateName: string;
      vendorId: string;
      clientId: string;
      roundName: string;
      scheduledAt: string;
      interviewerEmail?: string;
    }
  ): Promise<InterviewEntity> {
    enforceCoreAccess(ctx, "interviews.create");

    const id = `INT-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const entity: InterviewEntity = {
      id,
      submissionId: payload.submissionId,
      requirementId: payload.requirementId,
      candidateId: payload.candidateId,
      candidateName: payload.candidateName,
      vendorId: payload.vendorId,
      clientId: payload.clientId,
      roundName: payload.roundName,
      scheduledAt: payload.scheduledAt,
      status: "SCHEDULED",
      createdAt: now,
      updatedAt: now,
      ...(payload.interviewerEmail ? { interviewerEmail: payload.interviewerEmail } : {}),
    };

    memoryInterviews.set(id, entity);

    try {
      await setDoc(doc(db, "interviews", id), cleanData(entity));
    } catch (e) {}

    await SubmissionService.advanceStage(ctx, payload.submissionId, "INTERVIEW_SCHEDULED");

    try {
      await RequirementService.updateFulfillmentStats(ctx, payload.requirementId, { interviews: 1 });
    } catch (e) {}

    return entity;
  }

  static async getInterview(ctx: HireNestAccessContext, interviewId: string): Promise<InterviewEntity> {
    enforceCoreAccess(ctx, "interviews.read");

    let data = memoryInterviews.get(interviewId);
    if (!data) {
      try {
        const snap = await getDoc(doc(db, "interviews", interviewId));
        if (snap.exists()) {
          data = { ...(snap.data() as InterviewEntity), id: snap.id };
        }
      } catch (e) {}
    }

    if (!data) {
      throw new CoreResourceNotFoundError("Interview", interviewId);
    }

    if (ctx.role === "VENDOR_ADMIN" || ctx.role === "VENDOR_RECRUITER") {
      const vendor = ctx.vendorId || ctx.organizationId;
      enforceCoreAccess(ctx, "interviews.read", { vendorId: data.vendorId || vendor });
    } else if (ctx.role.startsWith("CLIENT_")) {
      const client = ctx.clientId || ctx.organizationId;
      enforceCoreAccess(ctx, "interviews.read", { clientId: data.clientId || client });
    }

    return data;
  }
}
