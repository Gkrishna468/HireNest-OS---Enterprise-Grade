import { db } from "../../../lib/firebase-admin.js";
import { CapabilityBroker, CapabilityRequest } from "./CapabilityBroker.js";

export interface DecisionContext {
  tenantId: string;
  revenue: number; // Potential fee
  slaDaysRemaining: number; // Days to SLA deadline
  clientPriority: "HIGH" | "MEDIUM" | "LOW";
  vendorPerformance: number; // 0.0 to 1.0 (historical placement rate)
  candidateQuality: number; // Match score 0 to 100
  historicalSuccessRate: number; // 0.0 to 1.0
  officeCapacity: number; // Current load %
  recruiterWorkload: number; // Number of active requirements they own
  vendorReliability: number; // 0.0 to 1.0
  clientResponsiveness: number; // Average reply hours (lower is better)
  candidateAvailability: "IMMEDIATE" | "TWO_WEEKS" | "PASSIVE";
  estimatedExecutionCost: number; // API cost / recruiter hours cost
  // AI Pipeline specific fields
  eventId?: string;
  entityId?: string;
  entityType?: string;
}

export interface OptimizationResult {
  highestValueAction:
    | "SUBMIT_TO_CLIENT"
    | "SCHEDULE_INTERVIEW"
    | "AUTO_REJECT"
    | "BOOST_SOURCING"
    | "MANUAL_TRIAGE"
    | "AI_RECOMMENDATION";
  score: number; // Priority index
  confidence: number;
  justification: string;
  metrics: {
    revenuePotential: number;
    executionCost: number;
    urgencyMultiplier: number;
  };
}

/**
 * Formalized Decision Pipeline for all Offices.
 */
export class DecisionEngine {
  public static readonly VERSION = "v3.1";

  async decideNextAction(
    context: DecisionContext,
  ): Promise<OptimizationResult> {
    console.log(
      `[Decision Engine ${DecisionEngine.VERSION}] Evaluating pipeline for tenant: ${context.tenantId}`,
    );

    // 1. Validation
    if (!context.tenantId || context.revenue < 0) {
      throw new Error("Invalid DecisionContext");
    }

    // 2. Business Rules & Deterministic Filters
    if (context.slaDaysRemaining < 0) {
      return this.buildResult(
        "MANUAL_TRIAGE",
        0,
        1.0,
        "SLA Breached, manual intervention required",
        context,
      );
    }

    // 3. Business Graph (Simulated lookup if entityId provided)
    let graphContext = {};
    if (context.entityId) {
      // e.g. BusinessGraph.getConnectedNodes(context.entityId)
      graphContext = { hasActiveInterviews: false };
    }

    // 4. Capability Broker (AI Models)
    // Decide whether to consult AI based on complexity
    let aiRecommendation = null;
    let confidence = 1.0;

    if (context.candidateQuality > 50 && context.candidateQuality < 90) {
      // Borderline case, ask Capability Broker to evaluate
      const req: CapabilityRequest = {
        capabilityName: "candidate.semantic_match",
        promptContext: { ...context, ...graphContext },
        promptTemplate:
          "Evaluate the following context and recommend an action (SUBMIT_TO_CLIENT, BOOST_SOURCING, MANUAL_TRIAGE):",
        expectedSchema: {
          type: "object",
          properties: {
            recommendation: { type: "string" },
            confidence: { type: "number" },
            reasoning: { type: "array", items: { type: "string" } },
          },
          required: ["recommendation", "confidence"],
        },
      };

      const aiResponse = await CapabilityBroker.executeCapability(req);
      if (aiResponse.success && aiResponse.result) {
        aiRecommendation = aiResponse.result.recommendation;
        confidence = aiResponse.result.confidence;
        // ExperienceEngine could feed back here
      }
    }

    // 5. Confidence Scoring & Policy Validation (Bands)
    if (aiRecommendation) {
      if (confidence >= 0.95) {
        return this.buildResult(
          aiRecommendation as any,
          90,
          confidence,
          "AI High Confidence Auto-Approval",
          context,
        );
      } else if (confidence >= 0.8) {
        return this.buildResult(
          "MANUAL_TRIAGE",
          70,
          confidence,
          `AI Suggested ${aiRecommendation} but requires Recruiter Review (${(confidence * 100).toFixed(0)}%)`,
          context,
        );
      } else {
        return this.buildResult(
          "MANUAL_TRIAGE",
          40,
          confidence,
          "AI Low Confidence, Human Approval Required",
          context,
        );
      }
    }

    // 6. Deterministic Fallback Score Calculation (if AI not used)
    let score = this.calculateDeterministicScore(context);

    // 7. Map score to Next Optimal Action
    let highestValueAction: OptimizationResult["highestValueAction"] =
      "MANUAL_TRIAGE";
    let justification = "";

    if (score >= 80) {
      highestValueAction = "SUBMIT_TO_CLIENT";
      justification = `High-yield candidate match (${context.candidateQuality}%) with strong revenue potential ($${context.revenue}) and active client interest. Prompt submission recommended.`;
    } else if (score >= 60) {
      highestValueAction = "SCHEDULE_INTERVIEW";
      justification = `Sufficient qualification threshold achieved. Schedule screening to maintain hiring velocity within SLA constraints (${context.slaDaysRemaining} days remaining).`;
    } else if (score >= 40) {
      highestValueAction = "BOOST_SOURCING";
      justification = `Moderate candidate alignment. Capacity permits increasing sourcing efforts across trusted vendor networks to find stronger fits.`;
    } else if (score >= 20) {
      highestValueAction = "MANUAL_TRIAGE";
      justification = `Complex parameters. Sourcing load (${context.recruiterWorkload} jobs) or candidate details require human recruiter bypass for validation.`;
    } else {
      highestValueAction = "AUTO_REJECT";
      justification = `Candidate match criteria or availability did not satisfy target SLA / quality requirements. Auto-archiving to optimize resources.`;
    }

    return this.buildResult(
      highestValueAction,
      score,
      1.0,
      justification,
      context,
    );
  }

  private buildResult(
    action: OptimizationResult["highestValueAction"],
    score: number,
    confidence: number,
    justification: string,
    context: DecisionContext,
  ): OptimizationResult {
    const result: OptimizationResult = {
      highestValueAction: action,
      score,
      confidence,
      justification,
      metrics: {
        revenuePotential: context.revenue,
        executionCost: context.estimatedExecutionCost,
        urgencyMultiplier: context.slaDaysRemaining <= 2 ? 2.5 : 1.0,
      },
    };

    // 8. Decision Record (Audit logging)
    if (db) {
      db.collection("decision_history")
        .add({
          tenantId: context.tenantId,
          action,
          score,
          confidence,
          justification,
          timestamp: new Date().toISOString(),
        })
        .catch((err) => console.error("Failed to log decision audit", err));
    }

    // 9. Business Event generation is typically handled by the caller (the Office)
    // after receiving the Decision Engine's result.

    return result;
  }

  private calculateDeterministicScore(context: DecisionContext): number {
    let score = 0;
    const revenueWeight = Math.min(100, (context.revenue / 20000) * 100);
    score += revenueWeight * 0.25;

    const slaMultiplier =
      context.slaDaysRemaining <= 2
        ? 2.5
        : context.slaDaysRemaining <= 7
          ? 1.5
          : 1.0;
    const slaScore = Math.max(0, (14 - context.slaDaysRemaining) * 7.1);
    score += slaScore * 0.15 * slaMultiplier;

    const priorityBonus =
      context.clientPriority === "HIGH"
        ? 30
        : context.clientPriority === "MEDIUM"
          ? 15
          : 0;
    score += priorityBonus * 0.15;

    const candidateScore = context.candidateQuality;
    const performanceBonus = context.vendorPerformance * 50;
    score += (candidateScore * 0.7 + performanceBonus * 0.3) * 0.25;

    const availabilityScore =
      context.candidateAvailability === "IMMEDIATE"
        ? 20
        : context.candidateAvailability === "TWO_WEEKS"
          ? 10
          : -10;
    const workloadPenalty = Math.min(30, context.recruiterWorkload * 3);
    score += (availabilityScore - workloadPenalty) * 0.1;

    const costPenalty = Math.min(
      10,
      (context.estimatedExecutionCost / 500) * 10,
    );
    score -= costPenalty;

    return Math.round(Math.max(0, Math.min(100, score)));
  }

  // Keep backward-compatibility method
  async decideNextActionLegacy(legacyContext: any): Promise<string> {
    const result = await this.decideNextAction({
      tenantId: "GLOBAL",
      revenue: legacyContext.revenue || 15000,
      slaDaysRemaining: legacyContext.sla || 7,
      clientPriority: (legacyContext.priority as any) || "MEDIUM",
      vendorPerformance: 0.75,
      candidateQuality: legacyContext.confidence
        ? legacyContext.confidence * 100
        : 80,
      historicalSuccessRate: 0.6,
      officeCapacity: 50,
      recruiterWorkload: 5,
      vendorReliability: 0.8,
      clientResponsiveness: 24,
      candidateAvailability: "TWO_WEEKS",
      estimatedExecutionCost: 15,
    });
    return result.highestValueAction === "SUBMIT_TO_CLIENT"
      ? "SUBMITTED"
      : "REVIEW_REQUIRED";
  }
}
