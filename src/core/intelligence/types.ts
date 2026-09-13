import { HireNestAccessContext } from "../types";

export type AIOutputKind = "ANALYZE" | "SCORE" | "RECOMMEND" | "DRAFT" | "PREDICT";

export interface AIOutputMeta {
  kind: AIOutputKind;
  model: string;
  confidenceScore: number;
  reasoning: string[];
  generatedAt: string;
  requiresHumanApproval: boolean;
}

export interface AIRecommendation<T> {
  meta: AIOutputMeta;
  targetEntityType: string;
  targetEntityId: string;
  recommendation: T;
  actionablePayload: any;
  approvalStatus: "PENDING_REVIEW" | "APPROVED" | "REJECTED";
}

export interface AIScoreResult {
  meta: AIOutputMeta;
  entityId: string;
  score: number; // 0 - 100
  factors: { name: string; impact: "POSITIVE" | "NEUTRAL" | "NEGATIVE"; weight: number; description: string }[];
}

export interface AIPredictionResult<T> {
  meta: AIOutputMeta;
  prediction: T;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  projectedDate?: string;
}

export interface AIDraftResult<T> {
  meta: AIOutputMeta;
  draftContent: T;
  contextSummary: string;
}
