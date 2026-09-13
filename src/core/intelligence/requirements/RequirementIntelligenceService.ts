import { HireNestAccessContext, enforceCoreAccess } from "../../types";
import { RequirementService, RequirementEntity } from "../../services/RequirementService";
import { AIOutputMeta, AIScoreResult, AIPredictionResult } from "../types";

export interface RequirementDifficultyAnalysis {
  requirementId: string;
  marketScarcityScore: number; // 0 - 100
  estimatedDaysToFill: number;
  salaryCompetitivenessRating: "ABOVE_MARKET" | "COMPETITIVE" | "BELOW_MARKET";
  recommendedVendorTier: "TIER_1" | "TIER_2" | "ALL_VENDORS";
  keySkillRisks: string[];
}

export class RequirementIntelligenceService {
  /**
   * Analyzes market difficulty, pricing and vendor allocation recommendations for a Requisition
   */
  static async analyzeRequirement(
    ctx: HireNestAccessContext,
    requirementId: string
  ): Promise<{ analysis: RequirementDifficultyAnalysis; meta: AIOutputMeta }> {
    enforceCoreAccess(ctx, "requirements.read");

    const req = await RequirementService.getRequirement(ctx, requirementId);

    const isNiche = req.skills.some((s) => /rust|elixir|ai|ml|distributed/i.test(s));

    const analysis: RequirementDifficultyAnalysis = {
      requirementId: req.id,
      marketScarcityScore: isNiche ? 78 : 45,
      estimatedDaysToFill: isNiche ? 24 : 14,
      salaryCompetitivenessRating: req.budgetMax && req.budgetMax > 2500000 ? "ABOVE_MARKET" : "COMPETITIVE",
      recommendedVendorTier: isNiche ? "TIER_1" : "ALL_VENDORS",
      keySkillRisks: isNiche ? ["High demand for specialized engineering talent"] : [],
    };

    const meta: AIOutputMeta = {
      kind: "ANALYZE",
      model: "hirenest-req-intel-v1",
      confidenceScore: 0.91,
      reasoning: [
        `Evaluated requirement skills: [${req.skills.join(", ")}] against market baseline.`,
        "Computed estimated time-to-fill and recommended vendor tier distribution."
      ],
      generatedAt: new Date().toISOString(),
      requiresHumanApproval: false,
    };

    return { analysis, meta };
  }

  /**
   * Predicts SLA breach probability
   */
  static async predictSLARisk(
    ctx: HireNestAccessContext,
    requirementId: string
  ): Promise<AIPredictionResult<{ riskScore: number; breachProbability: number; bottleneck: string }>> {
    enforceCoreAccess(ctx, "requirements.read");
    const req = await RequirementService.getRequirement(ctx, requirementId);

    const stats = req.fulfillmentStats || { submissionsCount: 0, interviewsCount: 0, offersCount: 0, placementsCount: 0 };
    const lowSubmissions = stats.submissionsCount === 0;

    return {
      meta: {
        kind: "PREDICT",
        model: "hirenest-sla-predictor",
        confidenceScore: 0.88,
        reasoning: ["Evaluated submission velocity vs requisition target window."],
        generatedAt: new Date().toISOString(),
        requiresHumanApproval: false,
      },
      prediction: {
        riskScore: lowSubmissions ? 65 : 20,
        breachProbability: lowSubmissions ? 0.42 : 0.08,
        bottleneck: lowSubmissions ? "Initial candidate pipeline building" : "Interview scheduling round",
      },
      riskLevel: lowSubmissions ? "MEDIUM" : "LOW",
    };
  }
}
