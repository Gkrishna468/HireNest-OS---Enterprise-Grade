export type ActorType = "ADMIN" | "VENDOR" | "RECRUITER" | "CLIENT" | "SYSTEM";

export interface TaskInitiator {
  type: ActorType;
  userId: string;
}

export enum AgentTaskStatus {
  PENDING = "PENDING",
  RUNNING = "RUNNING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED"
}

export interface TaskBusinessOutcome {
  candidatesReviewed: number;
  qualifiedCandidates: number;
  submissionsPrepared: number;
  submissionsSent: number;
  interviewsScheduled: number;
  offersReceived: number;
  placementsGenerated: number;
}

export interface ExecutionLease {
  workerId: string;
  leasedAt: string;
  expiresAt: string;
}

export interface TaskEconomics {
  currency: "INR" | "USD";
  aiCost: number;             // Model inference tokens converted to currency
  computeCost: number;        // Processing / OCR / server runtime cost
  browserCost: number;        // Headless browser / scraping cost
  humanReviewCost: number;    // Assigned recruiter review hours * rate (0 if recruiterId is null)
  totalOperatingCost: number; // Sum of all costs above
  
  // Staged Value Attribution (Strictly NON-ADDITIVE)
  potentialValue: number;         // Top-of-funnel expected value (e.g. initial match probability * target fee)
  pipelineValue: number;          // Submission & interview stage commercial value
  bookedRevenue: number;          // Placed / confirmed billable contract gross revenue
  realizedRevenue: number;        // Cash collected
  attributedGrossMargin: number;  // Gross margin attributed to agent from realized revenue
  
  agentEconomicEfficiency: number | null; // Attributed Gross Margin ÷ Total Operating Cost (null if cost basis is 0)
  aeeStatus?: "VALID" | "INSUFFICIENT_COST_BASIS" | "ZERO_MARGIN" | "NEGATIVE_MARGIN";
  aeeReason?: string;
}

export interface AgentTask {
  id: string;
  tenantId: string;
  initiatedBy: TaskInitiator;
  
  // Optional business entity actors - strictly null unless explicitly assigned/existent
  recruiterId: string | null;
  vendorId?: string | null;
  clientId?: string | null;
  requirementId?: string | null;
  
  agentId: string; // e.g. "AI_MATCHING_AGENT", "AI_SCREENING_AGENT"
  correlationId: string;
  goal: string;
  status: AgentTaskStatus;
  lease?: ExecutionLease | null; // Atomic lease for concurrency control
  currentStepIndex: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  
  businessOutcome: TaskBusinessOutcome;
  economics: TaskEconomics;
}

export interface AgentTaskStep {
  id: string;
  taskId: string;
  stepIndex: number;
  title: string;
  action: "FIND_REQUIREMENTS" | "RETRIEVE_CANDIDATES" | "MATCH_CANDIDATES" | "VERIFY_OWNERSHIP" | "PREPARE_SUBMISSIONS";
  input: Record<string, any>;
  output?: Record<string, any> | null;
  status: AgentTaskStatus;
  error?: string | null;
  
  stepEconomics?: {
    aiCost: number;
    tokensUsed: number;
    durationMs: number;
  };
  updatedAt: string;
}
