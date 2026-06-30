import { db } from "../../../lib/firebase-admin.js";
import { EventBus } from "../../services/EventBus.js";

export class EventReplay {
  /**
   * Replay a single event by publishing it back to the EventBus.
   */
  static async replayEvent(eventId: string) {
    if (!db) return;
    const snap = await db.collection("business_events").doc(eventId).get();
    if (!snap.exists) throw new Error("Event not found");

    const event = snap.data();
    if (event) {
      // Update timestamp and metadata to show it's a replay
      event.publishedAt = new Date().toISOString();
      event.metadata = event.metadata || {};
      event.metadata.isReplay = true;
      event.metadata.originalEventId = eventId;
      event.eventId = `evt-replay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      await EventBus.publishInternal(event as any);
    }
  }

  /**
   * Replay dead letter events for a specific office
   */
  static async replayDeadLetters(officeName: string) {
    if (!db) return;
    const snap = await db
      .collection("dead_letter_events")
      .where("office", "==", officeName)
      .where("failureCategory", "==", "EXHAUSTED_RETRIES") // Optionally can retry PERMANENT if code was fixed
      .get();

    const batch = db.batch();
    for (const doc of snap.docs) {
      const data = doc.data();
      if (data.originalEvent) {
        const event = data.originalEvent;
        event.publishedAt = new Date().toISOString();
        event.retryCount = 0; // Reset retries
        await EventBus.publishInternal(event);

        // Remove from dead letters
        batch.delete(doc.ref);
      }
    }
    await batch.commit();
  }

  /**
   * Replay all events associated with a specific workflow
   */
  static async replayWorkflow(workflowId: string) {
    if (!db) return;
    const snap = await db
      .collection("business_events")
      .where("metadata.workflowId", "==", workflowId)
      .orderBy("createdAt", "asc")
      .get();

    for (const doc of snap.docs) {
      await this.replayEvent(doc.id);
    }
  }

  /**
   * Replay all events for a specific tenant within a time range
   */
  static async replayTenant(
    tenantId: string,
    startTime: string,
    endTime: string,
  ) {
    if (!db) return;
    const snap = await db
      .collection("business_events")
      .where("tenantId", "==", tenantId)
      .where("createdAt", ">=", startTime)
      .where("createdAt", "<=", endTime)
      .orderBy("createdAt", "asc")
      .get();

    for (const doc of snap.docs) {
      await this.replayEvent(doc.id);
    }
  }

  /**
   * Replay all events linked to a specific correlation ID
   */
  static async replayCorrelationId(correlationId: string) {
    if (!db) return;
    const snap = await db
      .collection("business_events")
      .where("correlationId", "==", correlationId)
      .orderBy("createdAt", "asc")
      .get();

    for (const doc of snap.docs) {
      await this.replayEvent(doc.id);
    }
  }
}
