export interface WorkflowEvent {
  eventType: string;
  eventVersion: string;
  producer: string;
  payload: any;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED" | "DEAD_LETTER";
  timestamp?: any;
  retryCount?: number;
}

/**
 * Pushes an event to the distributed orchestration queue.
 * On the backend, this could trigger Pub/Sub or Cloud Tasks.
 * For now, we use a Firestore collection that acts as an event bus.
 */
export async function dispatchWorkflowEvent(adminDb: any, event: Omit<WorkflowEvent, "eventVersion" | "retryCount"> & { eventVersion?: string, retryCount?: number }) {
  if (!adminDb) {
    console.warn("[QUEUE_WARN] Administrative runtime offline. Event dropped:", event.eventType);
    return false;
  }
  
  // Backpressure Control: Enforce per-tenant concurrency/queue caps
  if (event.payload?.vendorId) {
      const activeRef = await adminDb.collection("workflowEvents")
        .where("payload.vendorId", "==", event.payload.vendorId)
        .where("status", "in", ["QUEUED", "PROCESSING"])
        .count()
        .get();
        
      if (activeRef.data().count >= 500) {
          console.warn(`[BACKPRESSURE] Vendor ${event.payload.vendorId} exceeded queue limits (500). Rejecting ${event.eventType}.`);
          return false;
      }
  }
  
  try {
    await adminDb.collection("workflowEvents").add({
      ...event,
      eventVersion: event.eventVersion || "v1",
      retryCount: event.retryCount || 0,
      timestamp: new Date().toISOString()
    });
    console.log(`[QUEUE_OK] Dispatched event: ${event.eventType} from ${event.producer}`);
    return true;
  } catch (err) {
    console.error("[QUEUE_ERR] Failed to dispatch workflow event:", err);
    return false;
  }
}
