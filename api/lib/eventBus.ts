import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Enterprise Priority 1: Event-Driven Architecture
 * Pub/Sub pattern decoupling agent execution from direct Firestore writes.
 */

export interface CognitionEvent {
    eventId: string;
    eventType: "AGENT_PROPOSAL" | "GOVERNANCE_REVIEW" | "CONSENSUS_REACHED" | "WORKFORCE_TASK";
    payload: any;
    timestamp: string;
}

export async function publishCognitionEvent(eventType: CognitionEvent["eventType"], payload: any) {
    if (!adminDb) return;
    const event: CognitionEvent = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        eventType,
        payload,
        timestamp: new Date().toISOString()
    };
    try {
        await adminDb.collection("eventBusLogs").doc(event.eventId).set(event);
        console.log(`[EVENT_BUS] Published async event: ${eventType} -> Queue`);
    } catch(err) {
        console.error("[EVENT_BUS] Publish failed:", err);
    }
}
