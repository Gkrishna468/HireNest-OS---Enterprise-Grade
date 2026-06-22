import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { EventDispatcher } from "../../events/EventDispatcher";
import { EventEnvelope } from '../../../packages/shared-integration/index';
import { CRMEventBridge } from "../crm/CRMEventBridge";

export class SystemEventListener {
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log("[SystemEventListener] Initializing hybrid event bridge...");

    // Initialize OS-side bridges
    CRMEventBridge.initialize();

    // 1. Fetch our subscriptions
    const subQ = query(
      collection(db, "system_event_subscriptions"),
      where("consumer", "==", "HireNestOS"),
      where("enabled", "==", true)
    );
    
    try {
      const subsSnap = await getDocs(subQ);
      const subscribedTypes = subsSnap.docs.map(d => d.data().eventType);

      if (subscribedTypes.length === 0) {
        console.log("[SystemEventListener] No remote events subscribed to in system_event_subscriptions. Using fallbacks.");
        subscribedTypes.push("OPPORTUNITY_WON");
        subscribedTypes.push("PLACEMENT_CLOSED");
      }

      // 2. Listen to system_events
      const eventsQ = query(
        collection(db, "system_events"),
        where("status", "==", "PENDING")
      );

      onSnapshot(eventsQ, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const evt = change.doc.data() as EventEnvelope;
            
            if (subscribedTypes.includes(evt.type)) {
              console.log(`[SystemEventListener] Routing system event to OS EventBus: ${evt.type}`);
              EventDispatcher.getInstance().publish({
                id: evt.id,
                type: evt.type,
                timestamp: new Date(evt.timestamp || Date.now()).toISOString(),
                tenantId: evt.context?.tenantId || "system",
                payload: evt.payload
              });

              // Mark processed
              await updateDoc(change.doc.ref, {
                status: "PROCESSED",
                processedBy: "HireNestOS",
                processedAt: new Date().toISOString()
              });
            }
          }
        });
      });
    } catch (e) {
      console.warn("[SystemEventListener] Permission issue or offline, skipping remote subscriptions setup.");
    }
  }
}
