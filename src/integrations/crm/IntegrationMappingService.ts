import { db } from "../../lib/firebase-admin.js";

export interface IntegrationMapping {
  crmEntityId: string;
  osEntityId: string;
  crmEntityType: string;
  osEntityType: string;
  sourceSystem: string;
  targetSystem: string;
}

export class IntegrationMappingService {
  /**
   * Generates a deterministic mapping ID.
   */
  private static getMappingId(crmEntityType: string, crmEntityId: string, osEntityType: string): string {
    return `mapping_${crmEntityType}_${crmEntityId}_to_${osEntityType}`;
  }

  static async createMapping(mapping: IntegrationMapping): Promise<void> {
    if (!db) return;
    const mappingId = this.getMappingId(mapping.crmEntityType, mapping.crmEntityId, mapping.osEntityType);
    await db.collection("integration_mappings").doc(mappingId).set({
      ...mapping,
      syncedAt: new Date().toISOString()
    });
    console.log(`[IntegrationMappingService] Created mapping: ${mappingId}`);
  }

  static async getOsEntityId(crmEntityType: string, crmEntityId: string, osEntityType: string): Promise<string | null> {
    if (!db) return null;
    const mappingId = this.getMappingId(crmEntityType, crmEntityId, osEntityType);
    const snap = await db.collection("integration_mappings").doc(mappingId).get();
    if (snap.exists) {
      return snap.data()?.osEntityId || null;
    }
    return null;
  }
}

