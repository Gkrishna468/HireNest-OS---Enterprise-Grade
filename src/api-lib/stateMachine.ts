import { adminDb } from '../lib/firebase-admin.js';

/**
 * Workflow State Machine / Saga Orchestrator
 * Ensures deterministic workflow states, compensating actions (rollbacks),
 * and multi-step transaction guarantees.
 */

export interface SagaStep {
  name: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "COMPENSATED";
}

export interface SagaContext {
  sagaId: string;
  type: string;
  status: "ACTIVE" | "COMPLETED" | "COMPENSATING" | "FAILED";
  steps: SagaStep[];
  payload: any;
  createdAt: string;
}

/**
 * Starts a new Saga workflow.
 */
export async function startSaga(type: string, payload: any, steps: string[]): Promise<string | null> {
  if (!adminDb) return null;
  
  const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
  const sagaData: SagaContext = {
    sagaId,
    type,
    status: "ACTIVE",
    payload,
    steps: steps.map(step => ({ name: step, status: "PENDING" })),
    createdAt: new Date().toISOString()
  };

  try {
    await adminDb.collection("orchestrationSagas").doc(sagaId).set(sagaData);
    console.log(`[SAGA_START] Initiated ${type} saga (${sagaId})`);
    return sagaId;
  } catch (err) {
    console.error(`[SAGA_ERR] Failed to start saga ${type}:`, err);
    return null;
  }
}

/**
 * Marks a specific step in a saga as completed.
 */
export async function completeSagaStep(sagaId: string, stepName: string): Promise<boolean> {
   if (!adminDb) return false;
   
   try {
     const sagaRef = adminDb.collection("orchestrationSagas").doc(sagaId);
     const doc = await sagaRef.get();
     if (!doc.exists) return false;
     
     const data = doc.data() as SagaContext;
     if (data.status !== "ACTIVE") return false;

     let allCompleted = true;
     const updatedSteps = data.steps.map(s => {
        if (s.name === stepName) return { ...s, status: "COMPLETED" };
        if (s.status !== "COMPLETED" && s.name !== stepName) allCompleted = false;
        return s;
     });

     await sagaRef.update({
        steps: updatedSteps,
        status: allCompleted ? "COMPLETED" : "ACTIVE",
        updatedAt: new Date().toISOString()
     });
     
     console.log(`[SAGA_STEP] Completed step '${stepName}' for saga ${sagaId}`);
     return true;
   } catch(err) {
     console.error(`[SAGA_ERR] step completion failed:`, err);
     return false;
   }
}

/**
 * Triggers compensating actions if a step fails.
 */
export async function failAndCompensate(sagaId: string, failedStep: string, reason: string): Promise<void> {
   if (!adminDb) return;
   
   try {
     const sagaRef = adminDb.collection("orchestrationSagas").doc(sagaId);
     const doc = await sagaRef.get();
     if (!doc.exists) return;
     
     const data = doc.data() as SagaContext;
     
     const updatedSteps = data.steps.map(s => {
        if (s.name === failedStep) return { ...s, status: "FAILED" };
        // If previously completed, it needs compensation
        if (s.status === "COMPLETED") return { ...s, status: "COMPENSATED" };
        return s;
     });

     await sagaRef.update({
        steps: updatedSteps,
        status: "COMPENSATING",
        errorReason: reason,
        compensatedAt: new Date().toISOString()
     });
     
     console.warn(`[SAGA_COMPENSATE] Rollback triggered for saga ${sagaId} due to failure at step: ${failedStep}`);
   } catch(err) {
     console.error(`[SAGA_ERR] Compensation failed:`, err);
   }
}
