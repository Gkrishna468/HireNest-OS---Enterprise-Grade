import { db } from "../../lib/firebase-admin.js";
import { EventDispatcher } from "../../events/EventDispatcher.js";

export class LeadConversionService {
  static async convertLeadToRequirement(leadId: string) {
    console.log(`[LeadConversionService] Converting lead ${leadId} to requirement...`);
    if (!db) return;

    const leadSnap = await db.collection("crm_leads").doc(leadId).get();
    const leadData = leadSnap.exists ? leadSnap.data() : null;

    const reqId = `req-${Date.now()}`;
    await db.collection("requirements_public").doc(reqId).set({
      id: reqId,
      title: leadData?.title || leadData?.requirementTitle || "Converted from CRM Lead",
      description: leadData?.description || "Requirement details synchronized from CRM lead.",
      leadId,
      orgId: leadData?.clientId || leadData?.orgId || "system",
      clientId: leadData?.clientId || "system",
      status: "DRAFT",
      createdAt: new Date().toISOString()
    });

    EventDispatcher.getInstance().publish({
      id: `evt-${Date.now()}`,
      type: "REQUIREMENT_CREATED",
      timestamp: new Date().toISOString(),
      tenantId: "system",
      payload: { requirementId: reqId, source: "CRM_LEAD" }
    });
  }
}

