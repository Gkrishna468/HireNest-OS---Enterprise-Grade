import { db } from "../lib/firebase-admin";
import { ApprovalRequest } from "../types/approval";
import { v4 as uuidv4 } from "uuid";
import { roiEngine } from "../services/roiEngine";
import { BusinessEventType } from "../types/roi";

export class ApprovalService {
  /**
   * Request approval for a submission
   */
  async requestApproval(
    submissionId: string,
    tenantId: string,
    requestedBy: string,
    requiredApproverType: "ADMIN" | "RECRUITER",
    assignedRecruiterId: string | null,
    submissionVersion: number
  ): Promise<string> {
    const approvalId = `appreq-${submissionId}-${uuidv4()}`;
    const approvalRef = db.collection("approvals").doc(approvalId);

    const request: any = {
      approvalId,
      tenantId,
      submissionId,
      status: "PENDING",
      requiredApproverType,
      assignedRecruiterId,
      requestedBy,
      requestedAt: new Date().toISOString(),
      submissionVersion,
      policyVersion: "1.0",
      idempotencyKey: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let subData: any;
    await db.runTransaction(async (transaction: any) => {
      const submissionRef = db.collection("submissions").doc(submissionId);
      const submissionDoc = await transaction.get(submissionRef);
      if (!submissionDoc.exists) throw new Error("Submission not found");
      subData = submissionDoc.data();
      if (subData.tenantId !== tenantId) throw new Error("Unauthorized");

      transaction.set(approvalRef, request);
    });

    // ROI Event - outside transaction
    await roiEngine.recordEvent({
      tenantId,
      requirementId: subData.requirementId,
      eventType: BusinessEventType.APPROVAL_REQUESTED,
      stage: "PIPELINE",
      actorType: "ADMIN",
      actorId: requestedBy,
      metadata: { approvalId, submissionId }
    });

    return approvalId;
  }

  /**
   * Approve a submission
   */
  async approveSubmission(
    approvalId: string,
    tenantId: string,
    approverId: string,
    approverType: "ADMIN" | "RECRUITER",
    submissionVersion: number // Added check
  ): Promise<void> {
    let approvalDocData: any;
    await db.runTransaction(async (transaction: any) => {
      const approvalRef = db.collection("approvals").doc(approvalId);
      const approvalDoc = await transaction.get(approvalRef);
      if (!approvalDoc.exists) throw new Error("Approval request not found");
      approvalDocData = approvalDoc.data();

      const approval = approvalDocData as ApprovalRequest;
      if (approval.tenantId !== tenantId) throw new Error("Unauthorized");
      if (approval.status !== "PENDING") throw new Error("Approval no longer pending");
      
      // Version check
      if (approval.submissionVersion !== submissionVersion) {
        transaction.update(approvalRef, { status: "INVALIDATED" });
        throw new Error("APPROVAL_INVALIDATED: Submission version mismatch");
      }
      if (approval.policyVersion !== "1.0") {
        transaction.update(approvalRef, { status: "INVALIDATED" });
        throw new Error("APPROVAL_INVALIDATED: Policy version mismatch");
      }

      // Verify authorization
      if (approverType === "RECRUITER" && approval.requiredApproverType !== "RECRUITER") {
        throw new Error("Unauthorized: Admin approval required");
      }
      if (approval.requiredApproverType === "RECRUITER" && approval.assignedRecruiterId !== approverId) {
        throw new Error("Unauthorized: Recruiter not assigned");
      }

      transaction.update(approvalRef, {
        status: "APPROVED",
        decidedBy: approverId,
        decidedByType: approverType,
        decidedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // ROI Event - outside transaction
    const subDoc = await db.collection("submissions").doc(approvalDocData.submissionId).get();
    const subData = subDoc.data();

    await roiEngine.recordEvent({
      tenantId,
      requirementId: subData!.requirementId,
      eventType: BusinessEventType.APPROVAL_APPROVED,
      stage: "PIPELINE",
      actorType: approverType,
      actorId: approverId,
      metadata: { approvalId, submissionId: approvalDocData.submissionId }
    });
  }
}
export const approvalService = new ApprovalService();
