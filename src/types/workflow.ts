// src/types/workflow.ts

// 1. Centralized State Enums
export enum RequirementState {
  DRAFT = "DRAFT",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  ACTIVE = "ACTIVE",
  ASSIGNED = "ASSIGNED",
  SOURCING = "SOURCING",
  SUBMISSION_IN_PROGRESS = "SUBMISSION_IN_PROGRESS",
  INTERVIEWING = "INTERVIEWING",
  OFFER_PENDING = "OFFER_PENDING",
  ONBOARDING = "ONBOARDING",
  FULFILLED = "FULFILLED",
  CLOSED = "CLOSED",
  ON_HOLD = "ON_HOLD",
  CANCELLED = "CANCELLED",
}

export enum SubmissionState {
  CREATED = "CREATED",
  SUBMITTED = "SUBMITTED",
  UNDER_REVIEW = "UNDER_REVIEW",
  SHORTLISTED = "SHORTLISTED",
  
  // Interview OS
  INTERVIEW_REQUESTED = "INTERVIEW_REQUESTED",
  INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED",
  INTERVIEW_IN_PROGRESS = "INTERVIEW_IN_PROGRESS",
  INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED",
  INTERVIEW_PASSED = "INTERVIEW_PASSED",
  INTERVIEW_FAILED = "INTERVIEW_FAILED",
  
  // Offer OS
  OFFER_DRAFTED = "OFFER_DRAFTED",
  OFFER_RELEASED = "OFFER_RELEASED",
  OFFER_ACCEPTED = "OFFER_ACCEPTED",
  OFFER_DECLINED = "OFFER_DECLINED",
  
  // Notice / Onboarding
  NOTICE_PERIOD = "NOTICE_PERIOD",
  JOINING_CONFIRMED = "JOINING_CONFIRMED",
  JOINED = "JOINED",
  PLACED = "PLACED",
  
  // Revenue OS
  INVOICE_GENERATED = "INVOICE_GENERATED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED",

  // Terminations
  REJECTED = "REJECTED",
  DROPPED = "DROPPED",
}

export enum OnboardingState {
  DOCUMENT_PENDING = "DOCUMENT_PENDING",
  DOCUMENT_VERIFIED = "DOCUMENT_VERIFIED",
  BGV_IN_PROGRESS = "BGV_IN_PROGRESS",
  BGV_COMPLETED = "BGV_COMPLETED",
  CLIENT_APPROVED = "CLIENT_APPROVED",
  JOINING_CONFIRMED = "JOINING_CONFIRMED",
  JOINED = "JOINED",
  STABILIZED = "STABILIZED",
}

export type WorkflowType = "req_lifecycle" | "submission_lifecycle" | "onboarding_lifecycle";
export type WorkflowState = RequirementState | SubmissionState | OnboardingState;

// 2. Immutable Workflow Events
export interface WorkflowEvent {
  eventId: string;
  workflowId: string;
  workflowType: WorkflowType;
  eventType: string; // e.g., "SUBMISSION_SHORTLISTED"
  fromState: WorkflowState;
  toState: WorkflowState;
  actorId: string; // userId triggering the change
  organizationId: string; // org of the actor
  timestamp: string; // ISO string
  metadata: any;
}

// 3. Workflow Instance Definition
export interface WorkflowInstance {
  workflowId: string; // Unique ID for this workflow orchestrator instance
  workflowType: WorkflowType;
  entityId: string; // ID of the underlying Requirement, Submission, or Placement
  currentState: WorkflowState;
  history: WorkflowEvent[]; // Timeline of events
  
  // Ownership 
  ownerOrgId: string;
  responsibleUsers: string[];
  visibilityScopes: string[];
  participantOrganizations: string[];

  // SLA tracking
  slaTimers: SlaTimer[];
  riskFlags: RiskFlag[];

  createdAt: string;
  updatedAt: string;
}

export interface SlaTimer {
  timerId: string;
  state: WorkflowState;
  startedAt: string; // ISO string
  deadlineAt: string; // ISO string
  status: "active" | "breached" | "fulfilled";
}

export interface RiskFlag {
  flagId: string;
  type: "SLA_BREACH_RISK" | "VENDOR_DROPOUT_RISK" | "CANDIDATE_GHOSTING_RISK" | "COMPLIANCE_DELAY";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  message: string;
  identifiedAt: string;
  resolved: boolean;
}
