import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Enterprise Priority 2: Durable Workflow Runtime
 * Simulates Temporal.io behavior for stateful, long-running agent workflows.
 */

export async function startDurableAgentWorkflow(workflowId: string, workflowType: string, input: any) {
    if (!adminDb) return;
    try {
        await adminDb.collection("workflowStates").doc(workflowId).set({
            workflowId,
            workflowType,
            input,
            status: "RUNNING",
            retryCount: 0,
            startedAt: new Date().toISOString()
        });
        console.log(`[TEMPORAL] Started durable workflow: ${workflowType} (${workflowId})`);
    } catch (err) {
        console.error("[TEMPORAL] Failed to start workflow:", err);
    }
}
