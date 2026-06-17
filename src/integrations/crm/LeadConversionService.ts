import { db } from "../../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { EventDispatcher } from "../../events/EventDispatcher";

export class LeadConversionService {
  static async convertLeadToRequirement(leadId: string) {
    console.log(`[LeadConversionService] Converting lead ${leadId} to requirement...`);
    
    const reqId = `req-${Date.now()}`;
    await setDoc(doc(db, "requirements", reqId), {
      title: "Converted from Lead",
      leadId,
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
