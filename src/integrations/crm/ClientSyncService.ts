import { CRMAdapter } from "./CRMAdapter";
import { db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { EventDispatcher } from "../../events/EventDispatcher";
import { IntegrationMappingService } from "./IntegrationMappingService";

export class ClientSyncService {
  static async syncFromWonOpportunity(opportunityId: string) {
    console.log(`[ClientSyncService] Syncing client from won opportunity: ${opportunityId}`);
    
    // In a real scenario, fetch opportunity and account from CRM
    // const opportunity = await CRMAdapter.getOpportunity(opportunityId);
    // const account = await CRMAdapter.getAccount(opportunity.accountId);

    const accountId = "acc-" + Date.now(); // Stub
    const clientId = "cli-" + accountId;

    // Create HireNest client
    await setDoc(doc(db, "clients", clientId), {
      name: "Synced Client " + accountId,
      status: "ACTIVE",
      createdAt: new Date().toISOString()
    });
    
    // Create mapping explicitly so OS never directly holds CRM IDs
    await IntegrationMappingService.createMapping({
      crmEntityId: accountId,
      osEntityId: clientId,
      crmEntityType: "ACCOUNT",
      osEntityType: "CLIENT",
      sourceSystem: "CRM",
      targetSystem: "CORE_OS"
    });

    console.log(`[ClientSyncService] Created HireNest Client: ${clientId}`);

    EventDispatcher.getInstance().publish({
      id: `evt-${Date.now()}`,
      type: "CLIENT_CREATED",
      timestamp: new Date().toISOString(),
      tenantId: "system",
      payload: { clientId, source: "CRM" }
    });
  }
}
