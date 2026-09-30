import { ActorType } from "./agentTask.js";

export enum BusinessEventType {
  REQUIREMENT_CREATED = "REQUIREMENT_CREATED",
  CANDIDATE_MATCHED = "CANDIDATE_MATCHED",
  CANDIDATE_SHORTLISTED = "CANDIDATE_SHORTLISTED",
  SUBMISSION_PREPARED = "SUBMISSION_PREPARED",
  SUBMISSION_SENT = "SUBMISSION_SENT",
  INTERVIEW_SCHEDULED = "INTERVIEW_SCHEDULED",
  INTERVIEW_COMPLETED = "INTERVIEW_COMPLETED",
  OFFER_RECEIVED = "OFFER_RECEIVED",
  PLACEMENT_MADE = "PLACEMENT_MADE",
  PLACEMENT_BILLED = "PLACEMENT_BILLED",
  PAYMENT_RECEIVED = "PAYMENT_RECEIVED"
}

export type ActorAttributionType = "MANUAL" | "AI_ASSISTED" | "AGENT_EXECUTED";
export type CommercialStage = "POTENTIAL" | "PIPELINE" | "BOOKED" | "REALIZED";

export interface BusinessValueEvent {
  businessEventId: string;
  tenantId: string;
  requirementId: string;
  candidateId?: string | null;
  agentTaskId?: string | null;
  stepId?: string | null;
  
  actorType: ActorType;
  actorId: string;
  attributionType: ActorAttributionType;
  
  // Recruiter is strictly optional and null unless explicitly assigned
  recruiterId: string | null;
  vendorId?: string | null;
  clientId?: string | null;
  
  timestamp: string;
  eventType: BusinessEventType;
  stage: CommercialStage;
  
  estimatedValue: number;
  realizedValue: number;
  currency: "INR" | "USD";
  
  cost: {
    aiCost: number;
    humanReviewCost: number;
    infrastructureCost: number;
    totalCost: number;
  };
  
  source: string;
  metadata?: Record<string, any>;
}

export interface ROISummary {
  tenantId: string;
  totalOperatingCost: number;
  aiCost: number;
  computeCost: number;
  humanOpsCost: number;
  
  totalCandidatesProcessed: number;
  totalQualified: number;
  totalSubmissions: number;
  totalInterviews: number;
  totalOffers: number;
  totalPlacements: number;
  
  bookedRevenue: number;
  realizedRevenue: number;
  attributedGrossMargin: number;
  
  // Core Efficiency KPIs
  agentEconomicEfficiency: number | null; // AEE = Attributed Gross Margin ÷ Total Operating Cost
  aeeStatus?: "VALID" | "INSUFFICIENT_COST_BASIS" | "ZERO_MARGIN" | "NEGATIVE_MARGIN";
  aeeReason?: string;
  costPerSubmission: number;
  costPerInterview: number;
  costPerPlacement: number;

  // Staged Values (Strictly NON-ADDITIVE: Each stage is a distinct commercial milestone)
  stagedValues: {
    potentialValue: number; // Top-of-funnel expected value
    pipelineValue: number;  // Submissions & interviews
    bookedRevenue: number;  // Placements billed
    realizedRevenue: number;// Cash collected
  };

  // Attributions
  attributionBreakdown: {
    manualEvents: number;
    aiAssistedEvents: number;
    agentExecutedEvents: number;
  };
  // Granular attribution dimensions separating early-stage supply from actual placement
  attributionDimensions: {
    candidateSource: Record<string, number>;
    matchContribution: Record<string, number>;
    submissionContribution: Record<string, number>;
    interviewContribution: Record<string, number>;
    placementContribution: Record<string, number>;
    realizedRevenueAttribution: Record<string, number>;
  };
  vendorAttribution: Record<string, {
    candidatesSupplied: number;
    submissions: number;
    interviews: number;
    placements: number;
  }>;
  recruiterAttribution: Record<string, {
    recruiterId: string;
    submissionsHandled: number;
    interviewsScheduled: number;
    placementsCredited: number;
  }>;
}
