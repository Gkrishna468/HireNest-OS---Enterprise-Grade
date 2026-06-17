import { db } from "../../lib/firebase";
import { collection, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

export class CRMAdapter {
  static async getAccount(accountId: string) {
    const docRef = doc(db, "crm_accounts", accountId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }

  static async getOpportunity(opportunityId: string) {
    const docRef = doc(db, "crm_opportunities", opportunityId);
    const snap = await getDoc(docRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }
}
