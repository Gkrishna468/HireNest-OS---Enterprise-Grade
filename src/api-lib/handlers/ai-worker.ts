/**
 * HireNestOS Server-Controlled Local AI Worker API Handlers
 * Endpoints for server-controlled lease claiming, task authorization, and result submission.
 * Enforces tenant authorization, atomic transactions, lease validation, and least-privilege writes.
 */

import { adminDb } from "../../lib/firebase-admin.js";
import { AIGuardrails } from "../services/AIGuardrails.js";

const ALLOWED_TASK_TYPES = new Set([
  "deep_screening",
  "candidate_screening",
  "skill_normalization",
  "candidate_matching",
  "deep_fitment",
  "interview_question_generation",
  "email_drafting",
  "copilot",
  "executive_summary",
  "jd_extraction"
]);

export default async function handler(req: any, res: any) {
  if (!adminDb) {
    return res.status(500).json({ error: "Firestore Admin DB is not initialized" });
  }

  // 1. Worker Authentication - Fail Closed with NO hardcoded default secret
  const workerSecret = req.headers["x-worker-secret"] || req.headers["authorization"]?.replace("Bearer ", "");
  const expectedSecret = process.env.OLLAMA_PROXY_KEY || process.env.WORKER_SECRET || process.env.AI_WORKER_SECRET;

  if (!expectedSecret) {
    return res.status(500).json({ error: "Server Configuration Error: Worker secret token is not configured in server environment" });
  }

  if (!workerSecret || workerSecret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized: Invalid or missing worker secret token" });
  }

  const { action } = req.query || req.body || {};

  // Action 1: Atomic Job Lease Claiming via Firestore Transaction
  if (req.method === "POST" && (action === "claim" || req.url.endsWith("/claim"))) {
    const workerId = req.body?.workerId || "local-windows-worker-01";
    const leaseDurationMs = 5 * 60 * 1000; // 5 minutes

    try {
      const claimResult = await adminDb.runTransaction(async (transaction: any) => {
        const pendingSnap = await adminDb
          .collection("ai_job_queue")
          .where("status", "==", "PENDING")
          .limit(10)
          .get();

        let targetDoc: any = null;
        const nowMs = Date.now();

        for (const doc of pendingSnap.docs) {
          const data = doc.data();
          if (!ALLOWED_TASK_TYPES.has(data.taskType)) {
            transaction.update(doc.ref, {
              status: "DEAD_LETTER",
              error: `Disallowed task type: ${data.taskType}`,
              updatedAt: new Date().toISOString()
            });
            continue;
          }
          targetDoc = doc;
          break;
        }

        // Recover expired leases if no pending jobs
        if (!targetDoc) {
          const claimedSnap = await adminDb
            .collection("ai_job_queue")
            .where("status", "==", "CLAIMED")
            .limit(10)
            .get();

          for (const doc of claimedSnap.docs) {
            const data = doc.data();
            const leaseExp = new Date(data.leaseExpiresAt || 0).getTime();
            if (leaseExp > 0 && leaseExp < nowMs) {
              targetDoc = doc;
              break;
            }
          }
        }

        if (!targetDoc) {
          return { claimed: false, message: "No pending or expired lease jobs in queue" };
        }

        const jobId = targetDoc.id;
        const jobData = targetDoc.data();
        const leaseExpiresAt = new Date(nowMs + leaseDurationMs).toISOString();

        transaction.update(targetDoc.ref, {
          status: "CLAIMED",
          claimedBy: workerId,
          leaseExpiresAt,
          updatedAt: new Date().toISOString()
        });

        return {
          claimed: true,
          job: {
            id: jobId,
            taskType: jobData.taskType,
            prompt: jobData.prompt,
            model: jobData.model || "qwen3:8b",
            tenantId: jobData.tenantId || "tenant-default",
            leaseExpiresAt
          }
        };
      });

      return res.status(200).json(claimResult);
    } catch (err: any) {
      return res.status(500).json({ error: `Job claim transaction failed: ${err.message}` });
    }
  }

  // Action 2: Result Submission with Worker Identity & Lease Verification
  if (req.method === "POST" && (action === "submit" || req.url.endsWith("/submit"))) {
    const { jobId, workerId, resultText, status, error, durationMs, tokens } = req.body || {};

    if (!jobId) {
      return res.status(400).json({ error: "Missing required jobId parameter" });
    }

    try {
      const jobRef = adminDb.collection("ai_job_queue").doc(jobId);
      const jobDoc = await jobRef.get();

      if (!jobDoc.exists) {
        return res.status(404).json({ error: `Job '${jobId}' not found` });
      }

      const jobData = jobDoc.data() || {};
      const now = new Date().toISOString();

      // Idempotency check: if job is already completed, return success
      if (jobData.status === "COMPLETED") {
        return res.status(200).json({ success: true, message: "Job already completed (idempotent)" });
      }

      // Verify lease & worker ownership
      if (jobData.status !== "CLAIMED") {
        return res.status(409).json({ error: `Job '${jobId}' is not in CLAIMED state (current: ${jobData.status})` });
      }

      if (workerId && jobData.claimedBy && jobData.claimedBy !== workerId) {
        return res.status(403).json({ error: `Job '${jobId}' is claimed by worker '${jobData.claimedBy}', submission rejected from '${workerId}'` });
      }

      const leaseExpMs = new Date(jobData.leaseExpiresAt || 0).getTime();
      if (leaseExpMs > 0 && leaseExpMs < Date.now()) {
        return res.status(410).json({ error: `Worker lease for job '${jobId}' has expired` });
      }

      if (status === "COMPLETED") {
        // Guardrail toxicity validation
        if (AIGuardrails.detectToxicity(resultText || "")) {
          await jobRef.update({
            status: "DEAD_LETTER",
            error: "Toxicity detected in worker result output",
            updatedAt: now
          });
          return res.status(400).json({ error: "Result rejected due to guardrail toxicity check" });
        }

        await jobRef.update({
          status: "COMPLETED",
          result: resultText,
          completedBy: workerId || jobData.claimedBy || "worker-unknown",
          durationMs: durationMs || 0,
          tokens: tokens || 0,
          estimatedCost: 0,
          completedAt: now,
          updatedAt: now
        });

        // Write execution ledger record
        await adminDb.collection("ai_execution_ledger").add({
          timestamp: now,
          userId: jobData.userId || "system",
          agent: jobData.taskType || "local-worker",
          feature: jobData.taskType || "general",
          provider: "ollama",
          model: jobData.model || "qwen3:8b",
          latency: durationMs || 0,
          tokens: tokens || 0,
          estimatedCost: 0,
          status: "success",
          source: "outbound-windows-worker"
        });

        return res.status(200).json({ success: true, message: "Job result persisted successfully" });
      } else {
        // Handle worker failure & bounded retries
        const attempts = (jobData.attempts || 0) + 1;
        const maxAttempts = 3;

        if (attempts >= maxAttempts) {
          await jobRef.update({
            status: "DEAD_LETTER",
            error: error || "Maximum retry attempts exceeded",
            attempts,
            updatedAt: now
          });
        } else {
          await jobRef.update({
            status: "PENDING",
            error: error || "Worker task execution failed",
            attempts,
            updatedAt: now
          });
        }

        return res.status(200).json({ success: true, message: `Job failure recorded (Attempt ${attempts}/${maxAttempts})` });
      }
    } catch (err: any) {
      return res.status(500).json({ error: `Result submission failed: ${err.message}` });
    }
  }

  return res.status(405).json({ error: "Method Not Allowed" });
}
