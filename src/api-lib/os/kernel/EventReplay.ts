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
}
