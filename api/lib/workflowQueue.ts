export interface WorkflowEvent {
  type: string;
  source: string;
  payload: any;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  timestamp?: any;
}

/**
 * Pushes an event to the distributed orchestration queue.
 * On the backend, this could trigger Pub/Sub or Cloud Tasks.
 * For now, we use a Firestore collection that acts as an event bus.
 */
export async function dispatchWorkflowEvent(adminDb: any, event: WorkflowEvent) {
  if (!adminDb) {
    console.warn("[QUEUE_WARN] Administrative runtime offline. Event dropped:", event.type);
    return false;
  }
  
  try {
    await adminDb.collection("workflowEvents").add({
      ...event,
      timestamp: new Date().toISOString()
    });
    console.log(`[QUEUE_OK] Dispatched event: ${event.type} from ${event.source}`);
    return true;
  } catch (err) {
    console.error("[QUEUE_ERR] Failed to dispatch workflow event:", err);
    return false;
  }
}
