import { db } from "../../../lib/firebase-admin.js";

export interface OutcomeFeedback {
  sourceModule: string; // e.g. 'Placement', 'Recruiter Review'
  entityId: string; // e.g. matchId, submissionId
  outcome: "SUCCESS" | "FAILURE" | "DEGRADED";
  metrics?: any;
  reason?: string;
  createdAt: string;
}

export class ExperienceEngine {
  /**
   * Record outcome feedback to learn from it in the future.
   */
  static async recordOutcome(
    feedback: Omit<OutcomeFeedback, "createdAt">,
  ): Promise<void> {
    if (!db) return;

    const docId = `outcome-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    await db
      .collection("experience_outcomes")
      .doc(docId)
      .set({
        ...feedback,
        createdAt: new Date().toISOString(),
      });

    // Generate a learning signal from the outcome
    this.generateLearningSignal(feedback).catch((e) =>
      console.error("[ExperienceEngine] update model failed", e),
    );
  }

  /**
   * Translates an outcome into a learning signal (e.g. adjusting decision weights)
   */
  private static async generateLearningSignal(
    feedback: Omit<OutcomeFeedback, "createdAt">,
  ) {
    if (!db) return;

    if (feedback.outcome === "SUCCESS") {
      // e.g. Positive reinforcement for this pattern
      await db.collection("experience_signals").add({
        type: "POSITIVE_REINFORCEMENT",
        source: feedback.sourceModule,
        entity: feedback.entityId,
        weightAdjust: 0.05,
        timestamp: new Date().toISOString(),
      });
    } else if (feedback.outcome === "FAILURE") {
      // e.g. Negative reinforcement
      await db.collection("experience_signals").add({
        type: "NEGATIVE_REINFORCEMENT",
        source: feedback.sourceModule,
        entity: feedback.entityId,
        weightAdjust: -0.1,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Retrieve aggregated feedback or learned patterns for a specific domain/context
   * to inform future Decision Engine choices.
   */
  static async getLearnings(domain: string): Promise<any> {
    if (!db) return {};

    const snap = await db
      .collection("experience_learnings")
      .where("domain", "==", domain)
      .get();

    if (snap.empty) return {};
    return snap.docs[0].data();
  }
}
