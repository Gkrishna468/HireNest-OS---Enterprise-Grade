import { adminDb } from "../src/lib/firebase-admin";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Ensure this is called by a trusted invoker (e.g., Cloud Scheduler)
  // In a real environment, verify authorization headers or Cloud Tasks OIDC tokens.
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.DAEMON_SECRET || 'local-dev-trigger'}`) {
     return res.status(401).json({ error: "Unauthorized daemon invocation." });
  }

  if (!adminDb) {
    return res.status(503).json({ error: "Runtime degraded. Daemon cannot execute.", status: "offline" });
  }

  try {
    const queueSnapshot = await adminDb.collection("workflowEvents")
       .where("status", "==", "QUEUED")
       .limit(20)
       .get();

    if (queueSnapshot.empty) {
       return res.status(200).json({ status: "IDLE", processed: 0 });
    }

    let processedCount = 0;
    let failedCount = 0;
    
    // Process Events (Simulated Distributed Handlers)
    for (const doc of queueSnapshot.docs) {
       const event = doc.data();
       const id = doc.id;
       const retryCount = event.retryCount || 0;

       const idempotencyKey = event.idempotencyKey || `evt_${id}`;

       try {
          // Idempotency Check
          const lockRef = adminDb.collection("eventLocks").doc(idempotencyKey);
          const lockDoc = await lockRef.get();
          if (lockDoc.exists) {
              console.warn(`[DAEMON] Idempotency violation prevented for ${idempotencyKey}`);
              await adminDb.collection("workflowEvents").doc(id).update({ status: "COMPLETED", skipReason: "idempotency_hit" });
              continue;
          }
          await lockRef.set({ lockedAt: new Date().toISOString(), eventId: id });

          // Marking as PROCESSING for isolation
          await adminDb.collection("workflowEvents").doc(id).update({ 
             status: "PROCESSING", 
             updatedAt: new Date().toISOString() 
          });

          // 1. MATCH_FOUND Orchestration
          if (event.eventType === "MATCH_FOUND") {
             // Mock sending candidate match notifications to vendors
             console.log(`[DAEMON] Processed MATCH_FOUND for Job ${event.payload?.jobId}`);
          }
          
          // 2. JOB_APPROVED Orchestration (Broadcasting)
          else if (event.eventType === "JOB_APPROVED") {
             // SLA Enforcement Check: Ensure broadcast happens immediately
             // This could trigger a fan-out to `vendorNetworkBroadcasts`
             await adminDb.collection("vendorNetworkBroadcasts").add({
                 requirementId: event.payload?.jobId,
                 status: "ACTIVE",
                 dispatchedAt: new Date().toISOString()
             });
             console.log(`[DAEMON] Orchestrated JOB_APPROVED broadcast for ${event.payload?.jobId}`);
          }

// Complete Event
          await adminDb.collection("workflowEvents").doc(id).update({
             status: "COMPLETED",
             completedAt: new Date().toISOString()
          });
          processedCount++;

       } catch (err: any) {
          console.error(`[DAEMON] Event ${id} failure (${err.message})`);
          failedCount++;

          // Retry logic and Dead Letter Queue enforcement
          if (retryCount >= 3) {
             console.warn(`[DAEMON] Event ${id} max retries exceeded. Routing to DEAD_LETTER.`);
             await adminDb.collection("workflowEvents").doc(id).update({
                 status: "DEAD_LETTER",
                 failedReason: err.message,
                 deadLetterAt: new Date().toISOString()
             });
          } else {
             await adminDb.collection("workflowEvents").doc(id).update({
                 status: "QUEUED",
                 retryCount: retryCount + 1,
                 nextAttemptAt: new Date(Date.now() + Math.pow(2, retryCount) * 1000).toISOString(), 
                 lastError: err.message
             });
          }
       }
    }

    // SLA Enforcement Engine Pass
    const delayedEvents = await adminDb.collection("workflowEvents")
       .where("status", "==", "PROCESSING")
       .limit(10)
       .get();
       
    for (const doc of delayedEvents.docs) {
      const data = doc.data();
      const updatedTime = new Date(data.updatedAt).getTime();
      const now = Date.now();
      
      // If stuck in processing for > 5 minutes, enforce SLA Timeout and move to QUEUED or DLQ
      if (now - updatedTime > 5 * 60 * 1000) {
          console.warn(`[SLA_MONITOR] Workflow SLA timeout detected on ${doc.id}`);
          await adminDb.collection("workflowEvents").doc(doc.id).update({
              status: "QUEUED",
              slaBreach: true,
              updatedAt: new Date().toISOString()
          });
      }
    }

    return res.status(200).json({ 
      status: "EXECUTED", 
      processed: processedCount,
      failed: failedCount,
      timestamp: new Date().toISOString()
    });

  } catch (err: any) {
    console.error("[DAEMON_FATAL]", err);
    return res.status(500).json({ error: "Daemon critical fault", details: err.message });
  }
}
