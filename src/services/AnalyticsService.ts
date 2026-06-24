import { db } from "../lib/firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp, increment } from "firebase/firestore";
import { observabilityService } from "../api-lib/services/ObservabilityService";

export class AnalyticsService {
  static async logOperationalEvent(tenantId: string, eventType: string, payload: any) {
    try {
      if (!tenantId) return;

      const traceId = payload.traceId || `trace-${Date.now()}`;

      // 1. Log to tenant analytics timeline
      await addDoc(collection(db, "organizations", tenantId, "analytics_events"), {
        eventType,
        payload,
        traceId,
        timestamp: serverTimestamp()
      });

      // 2. Increment global counters for the organization
      const metricsRef = doc(db, "organizations", tenantId, "metrics", "operational");
      const increments: any = {};
      
      if (eventType === "SUBMISSION_CREATED") increments.totalSubmissions = increment(1);
      if (eventType === "INTERVIEW_SCHEDULED") increments.totalInterviews = increment(1);
      if (eventType === "PLACEMENT_CLOSED") increments.totalPlacements = increment(1);
      if (eventType === "OPPORTUNITY_WON") increments.totalOpportunitiesWon = increment(1);
      if (eventType === "CLIENT_CREATED") increments.totalClients = increment(1);
      if (eventType === "REQUIREMENT_CREATED") increments.totalRequirements = increment(1);

      if (Object.keys(increments).length > 0) {
        await setDoc(metricsRef, increments, { merge: true });
      }

      // 3. System Health Telemetry
      if (["OPPORTUNITY_WON", "CLIENT_CREATED", "REQUIREMENT_CREATED", "PLACEMENT_CLOSED", "SUBMISSION_CREATED", "INTERVIEW_SCHEDULED"].includes(eventType)) {
        await observabilityService.incrementSystemHealth("eventBusProcessed");
      }

    } catch (err) {
      console.warn("[AnalyticsService] Failed to log event:", err);
      observabilityService.logRuntimeError({
        tenantId,
        sourceSystem: "AnalyticsService",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        severity: "ERROR"
      }).catch(console.error);
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
