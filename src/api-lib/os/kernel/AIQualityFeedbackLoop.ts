import { db } from "../../../lib/firebase-admin.js";

export interface AIQualityFeedback {
  feedbackId: string;
  office: string;
  decisionId: string;
  tenantId: string;
  userId: string;
  rating: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  reason: string;
  createdAt: string;
}

export class AIQualityFeedbackLoop {
  /**
   * Store feedback from a user regarding an AI decision
   */
  static async recordFeedback(
    feedback: Omit<AIQualityFeedback, "feedbackId" | "createdAt">,
  ): Promise<string> {
    if (!db) return "";

    const feedbackId = `fb-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const record: AIQualityFeedback = {
      ...feedback,
      feedbackId,
      createdAt: new Date().toISOString(),
    };

    await db.collection("ai_quality_feedback").doc(feedbackId).set(record);
    return feedbackId;
  }

  /**
   * Retrieve aggregated feedback for a given prompt version or office
   */
  static async getFeedbackStats(office: string, decisionId?: string) {
    if (!db) return null;

    let query = db
      .collection("ai_quality_feedback")
      .where("office", "==", office);
    if (decisionId) {
      query = query.where("decisionId", "==", decisionId);
    }

    const snap = await query.get();
    let positive = 0,
      negative = 0,
      neutral = 0;

    snap.docs.forEach((doc) => {
      const rating = doc.data().rating;
      if (rating === "POSITIVE") positive++;
      else if (rating === "NEGATIVE") negative++;
      else neutral++;
    });

    return {
      total: snap.size,
      positive,
      negative,
      neutral,
    };
  }
}
