import { db } from "../../lib/firebase-admin.js";

export class CRMAdapter {
  static async getAccount(accountId: string) {
    if (!db) return null;
    const snap = await db.collection("crm_accounts").doc(accountId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }

  static async getOpportunity(opportunityId: string) {
    if (!db) return null;
    const snap = await db.collection("crm_opportunities").doc(opportunityId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  }
}

