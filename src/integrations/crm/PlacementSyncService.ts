import { CRMAdapter } from "./CRMAdapter";
import { EventPublisher } from "../../connectors/os/EventPublisher";

export class PlacementSyncService {
  static async updateCRMOpportunity(placementId: string, candidateId: string) {
    console.log(`[PlacementSyncService] Emitting placement event through EventPublisher: ${placementId}`);
    
    // Instead of directly writing to CRM, we publish a system event
    await EventPublisher.publish({
      id: `evt-${Date.now()}`,
      type: "PLACEMENT_CLOSED",
      timestamp: new Date().toISOString(),
      tenantId: "system",
      payload: { placementId, candidateId }
    } as any);
  }
}
