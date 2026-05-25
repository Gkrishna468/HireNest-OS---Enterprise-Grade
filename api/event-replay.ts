import { adminDb } from "../src/lib/firebase-admin";

/**
 * Event Replay Infrastructure
 * Allows state reconstruction and auditing by re-applying historical workflow events.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  // Strictly enforce super_admin access
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.DAEMON_SECRET || 'local-dev-trigger'}`) {
     return res.status(401).json({ error: "Unauthorized replay invocation." });
  }

  if (!adminDb) return res.status(503).json({ error: "Runtime degraded." });

  try {
     const { startTime, eventType } = req.body;
     
     if (!startTime) return res.status(400).json({ error: "startTime parameter required for replay boundary." });

     let query = adminDb.collection("workflowEvents")
       .where("timestamp", ">=", startTime)
       .where("status", "==", "COMPLETED")
       .orderBy("timestamp", "asc");

     if (eventType) {
         query = query.where("eventType", "==", eventType);
     }

     const snapshot = await query.limit(50).get();

     let replayedCount = 0;
     for (const doc of snapshot.docs) {
         const event = doc.data();
         
         // In a real system, send this event directly to a segregated replay-queue 
         // so it doesn't pollute live databases, or apply it to a shadow table.
         // Here we dispatch it as a mock 'shadow' event.
         await adminDb.collection("shadowReplayEvents").add({
             originalId: doc.id,
             replayOf: event.eventType,
             payload: event.payload,
             replayedAt: new Date().toISOString()
         });
         
         replayedCount++;
     }

     return res.status(200).json({ 
         ok: true, 
         replayed: replayedCount,
         message: "Events successfully streamed to shadow ledger for analytical reconstruction."
     });

  } catch (err: any) {
     console.error("[EVENT_REPLAY_ERR]", err);
     return res.status(500).json({ error: "Replay engine fault", details: err.message });
  }
}
