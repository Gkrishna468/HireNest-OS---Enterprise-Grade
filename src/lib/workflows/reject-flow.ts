import { db } from "../firebase";
import { doc, runTransaction, serverTimestamp, collection } from "firebase/firestore";

/**
 * FIX for QA-4019: Reject Flow Synchronization
 * Wraps the rejection logic in a secure Firestore transaction to safely separate 
 * the candidate from the specific requirement pipeline WITHOUT withdrawing them 
 * from the Global Candidate Pool.
 */
export async function processClientReject(
  submissionId: string,
  candidateId: string,
  requirementId: string,
  rejectReason: string,
  workspaceId: string
) {
  await runTransaction(db, async (transaction) => {
    const submissionRef = doc(db, "submissions", submissionId);
    const candidateRef = doc(db, "candidatePool", candidateId);
    const reqLedgerRef = doc(db, "requirementLedger", requirementId);

    const submissionDoc = await transaction.get(submissionRef);
    if (!submissionDoc.exists()) throw new Error("Submission not found");

    const candidateDoc = await transaction.get(candidateRef);
    if (!candidateDoc.exists()) throw new Error("Candidate not found");

    const reqDoc = await transaction.get(reqLedgerRef);

    // 1. Mark Submission as REJECTED in the specific client workspace pipeline
    transaction.update(submissionRef, {
      status: 'REJECTED',
      rejectReason,
      updatedAt: serverTimestamp()
    });

    // 2. Safely untether the candidate from this req
    const candidateData = candidateDoc.data();
    const activePipelines = candidateData.activePipelines || [];
    transaction.update(candidateRef, {
      activePipelines: activePipelines.filter((req: string) => req !== requirementId),
      // Crucial Fix: DO NOT alter candidate.pipelineStage if they remain in GLOBAL_POOL
      // Allowing them to be matched independently later.
      updatedAt: serverTimestamp()
    });

    // 3. Reconcile Single Source of Truth Ledger (Fixing Parity Disconnects)
    if (reqDoc.exists()) {
      const reqData = reqDoc.data();
      transaction.update(reqLedgerRef, {
        activeSubmissions: Math.max(0, (reqData.activeSubmissions || 1) - 1),
        rejectedSubmissions: (reqData.rejectedSubmissions || 0) + 1,
        updatedAt: serverTimestamp()
      });
    }

    // 4. Distribute Audit & Read-Model Events
    const eventRef = doc(collection(db, "event_ledger"));
    transaction.set(eventRef, {
      eventType: 'candidate_rejected',
      candidateId,
      requirementId,
      submissionId,
      workspaceId,
      reason: rejectReason,
      timestamp: serverTimestamp()
    });

    const activityRef = doc(collection(db, "activity_feed"));
    transaction.set(activityRef, {
      type: 'REJECTION',
      message: `Candidate rejected for requirement ${requirementId}`,
      context: rejectReason,
      timestamp: serverTimestamp()
    });
  });
}
