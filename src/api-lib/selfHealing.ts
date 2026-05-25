import { adminDb } from "../lib/firebase-admin";

/**
 * Self-Healing Infrastructure
 * Detects stalled workflows, recovers broken sagas, and reroutes overloaded partitions.
 */

export async function sweepStalledWorkflows() {
   if (!adminDb) return;
   
   console.log("[SELF_HEALING] Initiating sweep for stalled durable workflows...");
   try {
      // Find workflows stuck in RUNNING for too long
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const stalledQuery = await adminDb.collection("durableExecutions")
          .where("state", "==", "RUNNING")
          .where("updatedAt", "<", fiveMinutesAgo)
          .get();

      for (const doc of stalledQuery.docs) {
          const data = doc.data();
          const retryAttempt = (data.retryState?.attempt || 0) + 1;
          
          console.warn(`[SELF_HEALING] Recovering stalled workflow ${doc.id} (Attempt ${retryAttempt})`);
          
          await doc.ref.update({
             state: "SUSPENDED", // Suspend for manual review or secondary retry queue
             retryState: {
                attempt: retryAttempt,
                lastFailure: "STALLED_TIMEOUT",
                nextBackoffWakeup: new Date(Date.now() + 60000).toISOString()
             },
             updatedAt: new Date().toISOString()
          });
      }
   } catch(err) {
      console.error("[SELF_HEALING_ERR]", err);
   }
}
