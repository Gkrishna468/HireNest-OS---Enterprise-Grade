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

    // Asynchronously update a feedback aggregation read model if needed
    this.updateFeedbackModel(feedback).catch((e) =>
      console.error("[ExperienceEngine] update model failed", e),
    );
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

  private static async updateFeedbackModel(
    feedback: Omit<OutcomeFeedback, "createdAt">,
  ) {
    // e.g. adjust weighting for specific vendors or matching traits based on SUCCESS/FAILURE
  }
}
