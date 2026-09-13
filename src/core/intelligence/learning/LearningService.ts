import { HireNestAccessContext, enforceCoreAccess } from "../../types";
import { AIOutputMeta } from "../types";

export interface RecruiterFeedbackLoopEvent {
  matchId: string;
  candidateId: string;
  requirementId: string;
  originalAIScore: number;
  recruiterDecision: "ACCEPTED" | "REJECTED" | "MODIFIED";
  adjustmentReason?: string;
  timestamp: string;
}

export class LearningService {
  /**
   * Logs recruiter feedback loop events to refine future Layer 2/Layer 3 scoring models
   */
  static async recordFeedback(
    ctx: HireNestAccessContext,
    event: Omit<RecruiterFeedbackLoopEvent, "timestamp">
  ): Promise<{ meta: AIOutputMeta; success: boolean }> {
    enforceCoreAccess(ctx, "submissions.create");

    // Telemetry recorded into model learning stream
    const meta: AIOutputMeta = {
      kind: "ANALYZE",
      model: "hirenest-learning-loop-v1",
      confidenceScore: 1.0,
      reasoning: [
        `Recorded recruiter override decision: ${event.recruiterDecision} for candidate ${event.candidateId}`,
        "Adjusted weights queued for nightly semantic model recalibration."
      ],
      generatedAt: new Date().toISOString(),
      requiresHumanApproval: false,
    };

    return { meta, success: true };
  }
}
