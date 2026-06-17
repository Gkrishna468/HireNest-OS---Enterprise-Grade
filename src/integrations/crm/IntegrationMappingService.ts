import { db } from "../../lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
    const mappingId = this.getMappingId(mapping.crmEntityType, mapping.crmEntityId, mapping.osEntityType);
    await setDoc(doc(db, "integration_mappings", mappingId), {
      ...mapping,
      syncedAt: new Date().toISOString()
    });
    console.log(`[IntegrationMappingService] Created mapping: ${mappingId}`);
  }

  static async getOsEntityId(crmEntityType: string, crmEntityId: string, osEntityType: string): Promise<string | null> {
    const mappingId = this.getMappingId(crmEntityType, crmEntityId, osEntityType);
    const snap = await getDoc(doc(db, "integration_mappings", mappingId));
    if (snap.exists()) {
      return snap.data().osEntityId;
    }
    return null;
  }
}
