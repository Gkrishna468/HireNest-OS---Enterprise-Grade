import { CRMAdapter } from "./CRMAdapter.js";
import { db } from "../../lib/firebase-admin.js";
import { EventDispatcher } from "../../events/EventDispatcher.js";
import { IntegrationMappingService } from "./IntegrationMappingService.js";

export class ClientSyncService {
  static async syncFromWonOpportunity(opportunityId: string) {
    console.log(`[ClientSyncService] Syncing client from won opportunity: ${opportunityId}`);
    if (!db) return;

    const opportunity = await CRMAdapter.getOpportunity(opportunityId);
    let accountName = "Synced Client " + Date.now();
    let accountId = "acc-" + Date.now();

    if (opportunity && opportunity.accountId) {
      accountId = opportunity.accountId;
      const account = await CRMAdapter.getAccount(accountId);
      if (account && account.name) {
        accountName = account.name || account.companyName || accountName;
      }
    }

    const clientId = "cli-" + accountId;

    // Create HireNest client organization / client document in organizations collection
    await db.collection("organizations").doc(clientId).set({
      id: clientId,
      name: accountName,
      companyName: accountName,
      orgType: "CLIENT",
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

