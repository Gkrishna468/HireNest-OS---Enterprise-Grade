import { db } from "../../../lib/firebase-admin.js";
import { OfficePolicy, OfficeCapability } from "./RuntimeTypes.js";

export class OfficeCapabilityRegistry {
  /**
   * Called by an office to register its capabilities.
   */
  static async registerOffice(name: string, policy: OfficePolicy) {
    if (!db) return;

    await db.collection("office_registry").doc(name).set(
      {
        name,
        policy,
        lastRegisteredAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  /**
   * Get an office by capability
   */
  static async findOfficesByCapability(
    capabilityName: string,
  ): Promise<string[]> {
    if (!db) return [];

    const snap = await db.collection("office_registry").get();
    const results: string[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const capabilities: OfficeCapability[] = data.policy?.capabilities || [];
      if (capabilities.some((c) => c.name === capabilityName)) {
        results.push(data.name);
      }
    }

    return results;
  }

  /**
   * Get all offices that support an event type
   */
  static async getOfficesForEvent(eventType: string): Promise<string[]> {
    if (!db) return [];

    const snap = await db.collection("office_registry").get();
    const results: string[] = [];

    for (const doc of snap.docs) {
      const data = doc.data();
      const supportedEvents: string[] = data.policy?.supportedEvents || [];
      if (supportedEvents.includes(eventType)) {
        results.push(data.name);
      }
    }

    return results;
  }
}
