import { adminDb } from "../../lib/firebase-admin.js";

export class OrganizationResolver {
  static async resolve(
    email: string,
    tenantId: string,
  ): Promise<{ orgId: string | null; type: "Vendor" | "Client" | "Prospect" | "Unknown" }> {
    if (!adminDb || !email) return { orgId: null, type: "Unknown" };

    const parts = email.split("@");
    if (parts.length < 2) return { orgId: null, type: "Unknown" };

    const domain = parts[1].toLowerCase();
    if (["gmail.com", "yahoo.com", "hotmail.com"].includes(domain)) {
      return { orgId: null, type: "Unknown" }; // Generic domain, skip org resolution by domain
    }

    try {
      // Check Vendors
      let snap = await adminDb
        .collection("vendors")
        .where("domain", "==", domain)
        .where("organizationId", "==", tenantId)
        .limit(1)
        .get();
      if (!snap.empty) return { orgId: snap.docs[0].id, type: "Vendor" };

      // Check Clients
      snap = await adminDb
        .collection("clients")
        .where("domain", "==", domain)
        .where("organizationId", "==", tenantId)
        .limit(1)
        .get();
      if (!snap.empty) return { orgId: snap.docs[0].id, type: "Client" };
        
      // Check Prospects
      snap = await adminDb
        .collection("prospects")
        .where("domain", "==", domain)
        .where("organizationId", "==", tenantId)
        .limit(1)
        .get();
      if (!snap.empty) return { orgId: snap.docs[0].id, type: "Prospect" };
      
      // We didn't find any, we can either create a Prospect or return Unknown
      return { orgId: null, type: "Unknown" };
    } catch (e) {
      console.error("[OrganizationResolver] Org resolve failed", e);
    }

    return { orgId: null, type: "Unknown" };
  }
}
