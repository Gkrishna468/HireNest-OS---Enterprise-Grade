import { db } from "../../../lib/firebase-admin.js";
import { BusinessEvent } from "./RuntimeTypes.js";
import { BusinessGraph } from "./BusinessGraph.js";

export class GraphProjectionWorker {
  /**
   * Queues an event for background projection into the Business Graph
   */
  static async queueProjection(event: BusinessEvent) {
    if (!db) return;

    await db.collection("graph_projection_queue").doc(event.eventId).set({
      event,
      status: "PENDING",
      queuedAt: new Date().toISOString(),
    });
  }

  /**
   * Processes pending graph projections
   */
  static async processQueue() {
    if (!db) return;

    const snap = await db
      .collection("graph_projection_queue")
      .where("status", "==", "PENDING")
      .orderBy("queuedAt", "asc")
      .limit(20)
      .get();

    if (snap.empty) return;

    for (const doc of snap.docs) {
      const data = doc.data();
      try {
        await doc.ref.update({ status: "PROCESSING" });

        // 1. Update Core Graph
        await BusinessGraph.buildFromEvent(
          data.event.eventType,
          data.event.payload,
        );

        // 2. Update Specialized Read Models (360 Views)
        const { ReadModels } = await import("./ReadModels.js");
        await ReadModels.updateProjections(data.event);

        await doc.ref.update({
          status: "COMPLETED",
          processedAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error(
          `[GraphProjectionWorker] Failed to project event ${data.event.eventId}`,
          error,
        );
        await doc.ref.update({ status: "FAILED", error: error.message });
      }
    }
  }
}
