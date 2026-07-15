import { db } from "../../lib/firebase-admin.js";

export class PlacementSyncService {
  static async updateCRMOpportunity(placementId: string, candidateId: string) {
    console.log(`[PlacementSyncService] Emitting PLACEMENT_CLOSED event for: ${placementId}`);
    if (!db) return;

    // Direct write to system_events using firebase-admin to decouple from browser dependencies
    const eventId = `evt-${Date.now()}`;
    await db.collection("system_events").doc(eventId).set({
      id: eventId,
      type: "PLACEMENT_CLOSED",
      timestamp: new Date().toISOString(),
      tenantId: "system",
      payload: { placementId, candidateId },
      status: "PENDING",
      publishedAt: new Date().toISOString()
    });

    console.log(`[PlacementSyncService] Successfully published PLACEMENT_CLOSED event to system_events.`);
  }
}

