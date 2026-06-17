import { db } from "../lib/firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp, increment } from "firebase/firestore";

export class AnalyticsService {
  static async logOperationalEvent(tenantId: string, eventType: string, payload: any) {
    try {
      if (!tenantId) return;

      // 1. Log to tenant analytics timeline
      await addDoc(collection(db, "organizations", tenantId, "analytics_events"), {
        eventType,
        payload,
        timestamp: serverTimestamp()
      });

      // 2. Increment global counters for the organization
      const metricsRef = doc(db, "organizations", tenantId, "metrics", "operational");
      const increments: any = {};
      
      if (eventType === "SUBMISSION_CREATED") increments.totalSubmissions = increment(1);
      if (eventType === "INTERVIEW_SCHEDULED") increments.totalInterviews = increment(1);
      if (eventType === "PLACEMENT_CLOSED") increments.totalPlacements = increment(1);

      if (Object.keys(increments).length > 0) {
        await setDoc(metricsRef, increments, { merge: true });
      }

    } catch (err) {
      console.warn("[AnalyticsService] Failed to log event:", err);
    }
  }

  static async logAILearningSignal(candidateId: string, requirementId: string, previousPhase: string, currentPhase: string, humanAction: string, aiScore: number) {
    try {
      await addDoc(collection(db, "ai_learning_events"), {
        candidateId,
        requirementId,
        previousPhase,
        currentPhase,
        humanAction, // 'ADVANCED' | 'REJECTED' | 'SHORTLISTED'
        aiScore,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.warn("[AnalyticsService] Failed to log AI signal:", err);
    }
  }
}
