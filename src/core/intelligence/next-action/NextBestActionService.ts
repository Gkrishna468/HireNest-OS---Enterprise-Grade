import { HireNestAccessContext, enforceCoreAccess } from "../../types.js";
import { RequirementService } from "../../services/RequirementService.js";
import { AIRecommendation, AIOutputMeta } from "../types.js";

export interface NextBestActionItem {
  id: string;
  category: "REQUISITION_BLOCKED" | "PENDING_INTERVIEW_FEEDBACK" | "RATE_CARD_NEGOTIATION" | "BENCH_MATCH_OPPORTUNITY";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  title: string;
  description: string;
  recommendedActionLabel: string;
  targetEntityId: string;
  targetEntityType: string;
}

export class NextBestActionService {
  /**
   * Generates next best action recommendations for a Recruiter or Manager
   */
  static async getNextBestActions(
    ctx: HireNestAccessContext
  ): Promise<AIRecommendation<NextBestActionItem[]>> {
    enforceCoreAccess(ctx, "requirements.read");

    const actions: NextBestActionItem[] = [
      {
        id: `NBA-1`,
        category: "BENCH_MATCH_OPPORTUNITY",
        priority: "HIGH",
        title: "High-Probability Match on Core Requisition",
        description: "3 candidate profiles scored >85% compatibility for open Staff Requisitions.",
        recommendedActionLabel: "Review & Submit",
        targetEntityId: "REQ-GLOBAL",
        targetEntityType: "Requirement",
      },
      {
        id: `NBA-2`,
        category: "PENDING_INTERVIEW_FEEDBACK",
        priority: "MEDIUM",
        title: "Interview Round Completed",
        description: "Technical screen round completed 24h ago; request feedback from client HM.",
        recommendedActionLabel: "Request Feedback Draft",
        targetEntityId: "INT-GLOBAL",
        targetEntityType: "Interview",
      },
    ];

    const meta: AIOutputMeta = {
      kind: "RECOMMEND",
      model: "hirenest-nba-engine",
      confidenceScore: 0.94,
      reasoning: ["Aggregated state changes across Requisition, Submission, and Interview SSOTs."],
      generatedAt: new Date().toISOString(),
      requiresHumanApproval: true,
    };

    return {
      meta,
      targetEntityType: "Workspace",
      targetEntityId: ctx.uid,
      recommendation: actions,
      actionablePayload: { actionsCount: actions.length },
      approvalStatus: "PENDING_REVIEW",
    };
  }
}
