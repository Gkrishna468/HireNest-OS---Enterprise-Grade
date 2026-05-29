// src/types.ts

export enum OrgType {
  ADMIN = 'admin',
  CLIENT = 'client',
  VENDOR = 'vendor',
  PARTNER = 'partner',
  INTERNAL = 'internal'
}

export type RecruiterType = 'internal' | 'vendor' | 'freelance' | 'contract';

export interface User {
  id: string; // Map to uid
  email: string;
  orgId: string;
  role: 'admin' | 'client_hm' | 'client_finance' | 'client_recruiter' | 'recruiter';
  recruiterType?: RecruiterType; // Only applicable if role === 'recruiter'
  permissions: string[];
  status: 'active' | 'inactive' | 'pending';
}

export interface Organization {
  id: string;
  name: string;
  type: OrgType;
  status: 'active' | 'suspended' | 'pending';
  createdAt: Date | any;
}

export interface Candidate {
  candidateId: string;
  fullName: string;
  primaryEmail?: string;
  phoneHash?: string;
  skills: string[];
  experience: any; // Could be detailed json
  canonicalProfile: boolean;
  visibilityScopes: string[];
  sourceOrganizations: string[];
  createdBy: string;
  dedupeFingerprint?: string;
  matchScore?: number; // Optional for view layers
}

export interface Submission {
  submissionId: string;
  candidateId: string;
  requirementId: string;
  submittedBy: string;
  vendorOrgId?: string;
  clientOrgId?: string;
  status: 'submitted' | 'screening' | 'interview' | 'offer' | 'rejected';
  timeline: any[];
}

export enum DealStatus {
  MATCHED = 'MATCHED',
  IDENTITY_REVEALED = 'IDENTITY_REVEALED',
  ACTIVE_NEGOTIATION = 'ACTIVE_NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

export interface MatchBreakdown {
  skillsScore?: number;
  experienceScore?: number;
  domainScore: number;
  locationScore?: number;
  bonusScore?: number;
  totalScore?: number;
  semanticScore?: number;
  careerTrajectoryScore?: number;
  authenticityScore?: number;
}

export interface MarginConfig {
  type: 'FIXED' | 'PERCENTAGE' | 'TIERED' | 'DYNAMIC';
  value: number;
  fixedAmount?: number;
  percentage?: number;
}

export interface Financials {
  clientBudget: number;
  clientCurrency: string;
  adminMargin: number;
  vendorPayout: number;
  platformProfit: number;
  marginConfig: MarginConfig;
}

export interface HybridMatchResult {
  candidateId: string;
  requirementId: string;
  score: number;
  breakdown: MatchBreakdown;
  summary: string;
  strengths: string[];
  gaps: string[];
  missingSkills?: string[];
  recruiterAssessment: string;
  recommendation: 'STRONG_FIT' | 'CONSIDER' | 'NOT_SUITABLE';
  nextSteps: string;
}

export interface VendorScore {
  orgId: string;
  rating: number; // 0-100
  tier: 'GOLD' | 'SILVER' | 'BRONZE' | 'NEW';
  placements: number;
  qualityScore: number;
}

export interface Deal {
  id: string;
  requirementId: string;
  candidateId: string;
  submissionId?: string;
  vendorId?: string;
  clientId: string;
  status: DealStatus;
  commercials: {
    clientBudget: number;
    currency: string;
    finalPlacementSalary?: number;
    vendorPayout: number;
    platformMargin: number;
    splits: CommissionSplit[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface CommissionSplit {
  beneficiaryId: string; // The OrgId or UserId receiving the split
  role: 'PLATFORM' | 'VENDOR_ORG' | 'VENDOR_RECRUITER' | 'CLIENT_ACCOUNT_MANAGER';
  percentage: number;
  expectedAmount: number;
}

export interface Commission {
  requirementId: string;
  dealId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'DISPUTED';
  type: 'FIXED' | 'PERCENTAGE';
  splits?: CommissionSplit[];
}

