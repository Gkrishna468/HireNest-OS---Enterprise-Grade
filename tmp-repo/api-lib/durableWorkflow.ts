import { adminDb } from "../src/lib/firebase-admin";

/**
 * Durable Workflow Runtime Engine
 * Provides persistent, retry-safe, and partitioned workflow execution semantics.
 * Represents an evolution towards Temporal/Step Functions capabilities.
 */

export interface DurableExecution {
  executionId: string;
  workflowType: string;
  partition: string;
  state: "INITIALIZED" | "RUNNING" | "SUSPENDED" | "COMPLETED" | "FAULTED";
  history: any[];
  retryState: {
     attempt: number;
     lastFailure?: string;
     nextBackoffWakeup?: string;
  };
}

export async function submitDurableWorkflow(workflowType: string, payload: any, partitionKey: string = "global") {
  if (!adminDb) return null;
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  
  try {
     await adminDb.collection("durableExecutions").doc(executionId).set({
        executionId,
        workflowType,
        partition: partitionKey,
        state: "INITIALIZED",
        payload,
        history: [{ event: "WORKFLOW_STARTED", timestamp: new Date().toISOString() }],
        retryState: { attempt: 0 },
        createdAt: new Date().toISOString()
     });
     console.log(`[DURABLE_WORKFLOW] Submitted execution ${executionId} on partition ${partitionKey}`);
     return executionId;
  } catch(err) {
     console.error("[DURABLE_WORKFLOW_ERR] Failed to submit:", err);
     return null;
  }
}

export async function advanceDurableContext(executionId: string, eventName: string, meta: any = {}) {
  if (!adminDb) return;
  try {
     const execRef = adminDb.collection("durableExecutions").doc(executionId);
     const doc = await execRef.get();
     if (!doc.exists) return;
     
     const data = doc.data();
     const newHistory = [...(data?.history || []), { event: eventName, meta, timestamp: new Date().toISOString() }];
     
     await execRef.update({
        state: "RUNNING",
        history: newHistory,
        updatedAt: new Date().toISOString()
     });
  } catch(err) {
     console.error("[DURABLE_WORKFLOW_ERR] Context advance failed:", err);
  }
}
