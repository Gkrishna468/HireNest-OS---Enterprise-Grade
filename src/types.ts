// src/types.ts

export enum OrgType {
  ADMIN = 'admin',
  CLIENT = 'client',
  VENDOR = 'vendor'
}

export enum DealStatus {
  MATCHED = 'MATCHED',
  IDENTITY_REVEALED = 'IDENTITY_REVEALED',
  ACTIVE_NEGOTIATION = 'ACTIVE_NEGOTIATION',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}

export interface MatchBreakdown {
  skillsScore: number;
  experienceScore: number;
  domainScore: number;
  locationScore: number;
  bonusScore: number;
  totalScore: number;
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

export interface Commission {
  requirementId: string;
  dealId: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'DISPUTED';
  type: 'FIXED' | 'PERCENTAGE';
}
