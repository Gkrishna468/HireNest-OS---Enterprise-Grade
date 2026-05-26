import { adminDb } from '../../src/lib/firebase-admin.js';

/**
 * Tenant Billing & Execution Metering Engine
 * Tracks AI tokens, workflow execution units, and SLA penalty metrics.
 */

export async function meterExecution(orgId: string, executionType: "WORKFLOW" | "AI_INFERENCE" | "VECTOR_SEARCH", units: number) {
  if (!adminDb) return;
  const billingPeriod = new Date().toISOString().substring(0, 7); // e.g., "2026-05"
  const ledgerId = `${orgId}_${billingPeriod}`;
  
  try {
     const ledgerRef = adminDb.collection("billingLedgers").doc(ledgerId);
     const doc = await ledgerRef.get();
     
     if (!doc.exists) {
        await ledgerRef.set({
           orgId,
           billingPeriod,
           workflowExecutions: executionType === 'WORKFLOW' ? units : 0,
           aiTokens: executionType === 'AI_INFERENCE' ? units : 0,
           vectorQueries: executionType === 'VECTOR_SEARCH' ? units : 0,
           slaPenaltiesIncurred: 0,
           lastMeteredAt: new Date().toISOString()
        });
     } else {
        const data = doc.data();
        await ledgerRef.update({
           workflowExecutions: executionType === 'WORKFLOW' ? (data?.workflowExecutions || 0) + units : (data?.workflowExecutions || 0),
           aiTokens: executionType === 'AI_INFERENCE' ? (data?.aiTokens || 0) + units : (data?.aiTokens || 0),
           vectorQueries: executionType === 'VECTOR_SEARCH' ? (data?.vectorQueries || 0) + units : (data?.vectorQueries || 0),
           lastMeteredAt: new Date().toISOString()
        });
     }
  } catch (err) {
     console.error("[METERING_ERR] Failed to record usage:", err);
  }
}

export async function applySlaPenalty(orgId: string, penaltyAmount: number, reason: string) {
  if (!adminDb) return;
  const billingPeriod = new Date().toISOString().substring(0, 7);
  try {
     const ledgerRef = adminDb.collection("billingLedgers").doc(`${orgId}_${billingPeriod}`);
     await ledgerRef.set({
        slaPenaltiesIncurred: penaltyAmount,
        lastPenaltyReason: reason,
        updatedAt: new Date().toISOString()
     }, { merge: true });
     console.warn(`[BILLING_ENGINE] SLA Penalty of ${penaltyAmount} applied to org ${orgId} for: ${reason}`);
  } catch (err) {
     console.error("[BILLING_ENGINE_ERR] Failed to apply SLA penalty:", err);
  }
}
