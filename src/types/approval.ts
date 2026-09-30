/**
 * Approval Engine Definitions
 */

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED" | "INVALIDATED";
export type ApproverType = "ADMIN" | "RECRUITER";

export interface ApprovalRequest {
  id: string; // `appreq-${submissionId}-${idempotencyKey}`
  tenantId: string;
  submissionId: string;
  agentTaskId?: string | null;
  stepId?: string | null;

  status: ApprovalStatus;
  requiredApproverType: ApproverType;
  assignedRecruiterId?: string | null;

  requestedBy: string;
  requestedAt: string;

  decidedBy?: string | null;
  decidedByType?: ApproverType | null;
  decidedAt?: string | null;
  decisionReason?: string | null;

  submissionVersion: number;
  policyVersion: string;

  idempotencyKey: string;

  createdAt: string;
  updatedAt: string;
}
