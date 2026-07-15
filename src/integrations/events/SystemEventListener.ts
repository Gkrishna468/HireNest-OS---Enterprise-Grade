import { db } from "../../lib/firebase";
import { collection, query, where, onSnapshot, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { EventDispatcher } from "../../events/EventDispatcher";
import { EventEnvelope } from '../../events/types/EventEnvelope';

export class SystemEventListener {
  private static isInitialized = false;

  static async initialize() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    console.log("[SystemEventListener] Initializing hybrid event bridge...");

    // 1. Fetch our subscriptions
    const subQ = query(
      collection(db, "system_event_subscriptions"),
      where("consumer", "==", "HireNestOS"),
      where("enabled", "==", true)
    );
    
    try {
      const subsSnap = await getDocs(subQ);
      let subscribedTypes = subsSnap.docs.map(d => d.data().eventType);

      if (subscribedTypes.length === 0) {
        console.log("[SystemEventListener] No remote events subscribed to in system_event_subscriptions. Seeding default subscriptions.");
        
        const defaultEvents = ["OPPORTUNITY_WON", "PLACEMENT_CLOSED", "CandidateUploaded", "JobPublished", "SubmissionCreated", "DealRoomOpened", "InterviewScheduled", "PlacementCompleted"];
        
        try {
          for (const type of defaultEvents) {
            await setDoc(doc(collection(db, "system_event_subscriptions")), {
              consumer: "HireNestOS",
              enabled: true,
              eventType: type,
              createdAt: new Date().toISOString()
            });
          }
          console.log("[SystemEventListener] Successfully seeded default subscriptions.");
          subscribedTypes = defaultEvents;
        } catch (seedErr) {
          console.warn("[SystemEventListener] Failed to seed default subscriptions, using fallback memory types.", seedErr);
          subscribedTypes = defaultEvents;
        }
      }

      // 2. Listen to system_events
      const eventsQ = query(
        collection(db, "system_events"),
        where("status", "==", "PENDING")
      );

      onSnapshot(eventsQ, (snap) => {
        snap.docChanges().forEach(async (change) => {
          if (change.type === "added") {
            const evt = change.doc.data() as EventEnvelope<any>;
            
            if (subscribedTypes.includes(evt.type)) {
              console.log(`[SystemEventListener] Routing system event to OS EventBus: ${evt.type}`);
              EventDispatcher.getInstance().publish({
                id: evt.id,
                type: evt.type,
                timestamp: new Date(evt.timestamp || Date.now()).toISOString(),
                tenantId: evt.tenantId || "system",
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
      }, (err) => {
        console.warn("[SystemEventListener] Snapshot listener failed:", err.message);
      });
    } catch (e) {
      console.warn("[SystemEventListener] Permission issue or offline, skipping remote subscriptions setup.");
    }
  }
}
