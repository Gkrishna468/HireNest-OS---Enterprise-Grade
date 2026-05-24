import { adminDb } from "../src/lib/firebase-admin";
import { resolveTenantShard } from "./lib/infrastructureSharding";
import { meterExecution } from "./lib/tenantBilling";

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
    // Advanced: Resolve regional queue partitions
    // const { shardId, region } = await resolveTenantShard("global");

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
          await lockRef.set({ lockedAt: new Date().toISOString(), eventId: id, traceId: event.traceId || id });

          // Queue Leasing for Isolation
          const leaseDuration = 3 * 60 * 1000; // 3 minutes lease
          const workerId = process.env.K_REVISION || "ops-worker-alpha-01";
          await adminDb.collection("workflowEvents").doc(id).update({ 
             status: "LEASED",
             workerId: workerId, // Identifier for traceability
             leasedUntil: new Date(Date.now() + leaseDuration).toISOString(),
             updatedAt: new Date().toISOString() 
          });

          // Immutable Event Source Header
          const auditTrace = {
              traceId: event.traceId || id,
              eventId: id,
              workerId: workerId,
              eventType: event.eventType,
              timestamp: new Date().toISOString(),
              vendorId: event.payload?.vendorId || "system",
              payload: event.payload
          };

          // 1. AI Intelligent Enrichment - Parse Resume Text
          if (event.eventType === "PARSE_RESUME_TEXT") {
             const { vendorId, resumeText, candidateId } = event.payload;
             console.log(`[DAEMON] Extracting intelligence for ${candidateId}`);
             
             // AI Circuit Breaker (Simulated Shared State)
             const circuitRef = adminDb.collection("systemFlags").doc("ai_circuit");
             const circuitSnap = await circuitRef.get();
             if (circuitSnap.exists) {
                const cb = circuitSnap.data();
                if (cb.status === "OPEN" && Date.now() - new Date(cb.lastTrippedAt).getTime() < 5 * 60 * 1000) {
                    throw new Error("AI Circuit Breaker is OPEN. Halting external LLM calls temporarily.");
                }
             }

             // Dynamic importing AI to prevent worker bloat
             const { GoogleGenAI } = await import("@google/genai");
             try {
               const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
               
               const prompt = `SYSTEM INSTRUCTION: Extract highly structured recruitment JSON from the resume below. Required fields: name, email, phone, location, skills (array), yearsOfExperience (number), matchScore (fallback 50).
WARNING: Untrusted user data follows.
<RESUME>${resumeText}</RESUME>`;
               
               const response = await ai.models.generateContent({
                 model: "gemini-3.5-flash",
                 contents: prompt,
                 config: { responseMimeType: "application/json" }
               });
               
               const aiText = response.text || "{}";
               const parsedProfile = JSON.parse(aiText);
               
               // AI Output Verification Layer
               if (!parsedProfile.name || !Array.isArray(parsedProfile.skills)) {
                 throw new Error("AI output failed schema validation. Missing critical fields.");
               }
               
               // Hardened Write to Candidate Domain
               await adminDb.collection("candidatePool").doc(candidateId).update({
                   ...parsedProfile,
                   distillationStatus: "COMPLETED",
                   aiValidationConfidence: 0.95, // mock confidence interval
                   updatedAt: new Date().toISOString()
               });
             } catch (aiErr: any) {
               console.warn("[DAEMON] AI Failure detected, tracking for circuit breaker.");
               // Update error counts...
               // For now just re-throw to trigger DLQ processing
               throw new Error(`AI Extraction Failed: ${aiErr.message}`);
             }
          }
          // 2. AI File Parsing - Parse PDF/Doc (Stubbed routing to AI bucket logic)
          else if (event.eventType === "PARSE_RESUME_FILE") {
             console.log(`[DAEMON] File Extraction for ${event.payload?.candidateId}`);
             await adminDb.collection("candidatePool").doc(event.payload.candidateId).update({
                 distillationStatus: "COMPLETED",
                 distillationNotes: "File extraction payload mocked for now.",
                 updatedAt: new Date().toISOString()
             });
          }
          // 3. MATCH_FOUND Orchestration
          else if (event.eventType === "MATCH_FOUND") {
             console.log(`[DAEMON] Processed MATCH_FOUND for Job ${event.payload?.jobId}`);
          }
          // 4. JOB_APPROVED Orchestration (Broadcasting)
          else if (event.eventType === "JOB_APPROVED") {
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
          
          await adminDb.collection("immutable_audit_logs").add({
              ...auditTrace,
              action: "WORKFLOW_COMPLETED",
              status: "SUCCESS"
          });
          
          processedCount++;
          
          await meterExecution(event.payload?.vendorId || "global_sys", "WORKFLOW", 1);

       } catch (err: any) {
          console.error(`[DAEMON] Event ${id} failure (${err.message})`);
          failedCount++;

          const failureTrace = {
               traceId: event.traceId || id,
               eventId: id,
               eventType: event.eventType,
               action: "WORKFLOW_FAILED",
               status: "FAILED",
               errorDetails: err.message,
               timestamp: new Date().toISOString(),
               vendorId: event.payload?.vendorId || "system"
          };
          await adminDb.collection("immutable_audit_logs").add(failureTrace);

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
       .where("status", "==", "LEASED")
       .limit(10)
       .get();
       
    for (const doc of delayedEvents.docs) {
      const data = doc.data();
      const leasedUntil = new Date(data.leasedUntil || data.updatedAt).getTime();
      const now = Date.now();
      
      // If lease expired, enforce SLA Timeout and move to QUEUED or DLQ
      if (now > leasedUntil) {
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
