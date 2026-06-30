import { db } from "../../../lib/firebase-admin.js";
import { NotificationOffice } from "../../services/NotificationOffice.js";

/**
 * EventEngine handles the pub/sub of business events throughout the OS.
 */
export class EventEngine {
  private subscribers: Map<string, Array<(payload: any) => Promise<void>>> =
    new Map();

  async publish(eventName: string, payload: any): Promise<void> {
    console.log(`[EventEngine] Publishing event: ${eventName}`, payload);

    // 1. Persist to Firestore
    try {
      await db.collection("os_events").add({
        eventName,
        payload,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("[EventEngine] Firestore event log error:", e);
    }

    // 2. Flow through central Notification Office
    try {
      await NotificationOffice.handleEvent(eventName, payload);
    } catch (e) {
      console.error("[EventEngine] Notification office error:", e);
    }

    // 3. Trigger active local subscribers
    const handlers = this.subscribers.get(eventName) || [];
    for (const handler of handlers) {
      try {
        await handler(payload);
      } catch (err) {
        console.error(
          `[EventEngine] Subscriber error for event ${eventName}:`,
          err,
        );
      }
    }
  }

  async subscribe(
    eventName: string,
    handler: (payload: any) => Promise<void>,
  ): Promise<void> {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    this.subscribers.get(eventName)!.push(handler);
    console.log(`[EventEngine] Subscriber registered for event: ${eventName}`);
  }
}
