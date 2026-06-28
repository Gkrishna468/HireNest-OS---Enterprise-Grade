export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string;
  status: string;
  processingVersion: number;
  lastMatchedAt?: string;
  lastAgentRun?: string;
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  clientName: string;
  skillsRequired: string[];
  status: string;
  processingVersion: number;
  lastMatchedAt?: string;
  lastBroadcastAt?: string;
  lastAgentRun?: string;
  graphVersion?: number;
}

export interface CandidateMatch {
  id: string;
  candidateId: string;
  candidateName: string;
  requirementId: string;
  requirementTitle: string;
  matchScore: number;
  matchInference: string;
  status: "matched" | "submitted" | "shortlisted" | "interview" | "offer" | "joined";
  createdAt: string;
  confidence: number;
  reason: string;
  matchedBy: "RULE_ENGINE" | "GEMINI" | "HYBRID";
  reviewed: boolean;
}

export interface BusinessEvent {
  eventId: string;
  type: string;
  createdAt: string;
  payload: any;
}

export interface BootstrapStage {
  id: number;
  name: string;
  status: "idle" | "running" | "completed" | "failed";
  progress: number;
  details: string;
}

export interface SystemMetrics {
  totalRequirements: number;
  totalCandidates: number;
  totalMatches: number;
  reconciliationRate: number;
  continuousMode: boolean;
  lastHeartbeat?: string;
  // Live Telemetry
  requirementsWaiting?: number;
  candidatesWaiting?: number;
  broadcastsPending?: number;
  failedJobs?: number;
  averageProcessingSpeed?: number; // in seconds
  currentWorkload?: number; // percentage
  cooRecommendation?: string;
}

export interface ReconciliationJob {
  jobId: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  requirementsProcessed: number;
  candidatesProcessed: number;
  vendorsProcessed: number;
  matchesGenerated: number;
  lastRequirementId?: string;
  lastCandidateId?: string;
  errors: string[];
}

export interface AgentRun {
  runId: string;
  office: string;
  started: string;
  completed: string;
  duration: number; // ms
  itemsProcessed: number;
  success: boolean;
  failed: boolean;
  retryCount: number;
  cost: number;
  traceId: string;
}

