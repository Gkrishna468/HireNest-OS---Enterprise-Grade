import { db } from "../../../lib/firebase-admin.js";
import { BusinessEvent } from "./RuntimeTypes.js";
import { EventBus } from "../../services/EventBus.js";

export class OutboxDispatcher {
  /**
   * Called by a background cron/trigger to dispatch outbox events.
   */
  static async dispatchOutbox() {
    if (!db) return;

    // Fetch up to 50 pending outbox events
    const snap = await db
      .collection("outbox_events")
      .where("status", "==", "PENDING")
      .orderBy("createdAt", "asc")
      .limit(50)
      .get();

    if (snap.empty) return;

    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        status: "PROCESSING",
        processedAt: new Date().toISOString(),
      });
    }
    await batch.commit();

    for (const doc of snap.docs) {
      const data = doc.data();
      try {
        // Actually publish to event bus (bypassing the outbox part in EventBus.publish for this internal call)
        await EventBus.publishInternal(data.event as BusinessEvent);
        await doc.ref.update({
          status: "PUBLISHED",
          publishedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        console.error(
          `[OutboxDispatcher] Error publishing event ${doc.id}:`,
          err,
        );
        await doc.ref.update({
          status: "FAILED",
          error: err.message,
          failedAt: new Date().toISOString(),
        });
      }
    }
  }
}
