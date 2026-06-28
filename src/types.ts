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
}

export interface HybridMatchResult {
  matchScore: number;
  matchInference: string;
  skillsMatch?: string[];
  skillsMissing?: string[];
  missingSkills?: string[];
  experienceMatch?: boolean;
  explanation?: string;
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
}
