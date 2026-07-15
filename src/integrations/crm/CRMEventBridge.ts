import { EventDispatcher } from "../../events/EventDispatcher.js";
import { ClientSyncService } from "./ClientSyncService.js";
import { PlacementSyncService } from "./PlacementSyncService.js";

export class CRMEventBridge {
  static initialize() {
    console.log("[CRMEventBridge] Initializing CRM-OS Event Bridge listeners...");
    
    // Lead / Opportunity winning in CRM flows into Core OS
    EventDispatcher.getInstance().subscribe("OPPORTUNITY_WON", "crm-bridge-opp-won", async (event: any) => {
      await ClientSyncService.syncFromWonOpportunity(event.payload.opportunityId);
    });

    // Placement in Core OS flows back to CRM
    EventDispatcher.getInstance().subscribe("PLACEMENT_CLOSED", "crm-bridge-placement", async (event: any) => {
      await PlacementSyncService.updateCRMOpportunity(event.payload.placementId, event.payload.candidateId);
    });
  }
}

