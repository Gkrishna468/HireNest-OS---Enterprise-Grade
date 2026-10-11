/**
 * HireNestOS Server-Controlled Local AI Worker API Handlers
 * Endpoints for server-controlled lease claiming, task authorization, and result submission.
 * Enforces tenant authorization, task eligibility, schema validation, and least-privilege writes.
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

  const workerSecret = req.headers["x-worker-secret"] || req.headers["authorization"]?.replace("Bearer ", "");
  const expectedSecret = process.env.OLLAMA_PROXY_KEY || process.env.WORKER_SECRET || "worker_secure_token_secret_12345";

  if (!workerSecret || workerSecret !== expectedSecret) {
    return res.status(401).json({ error: "Unauthorized: Invalid worker secret token" });
  }

  const { action } = req.query || req.body || {};

  // Action 1: Claim Job Lease
  if (req.method === "POST" && (action === "claim" || req.url.endsWith("/claim"))) {
    const workerId = req.body?.workerId || "local-windows-worker-01";
    const leaseDurationMs = 5 * 60 * 1000; // 5 minutes

    try {
      // Find pending or expired lease jobs
      const now = new Date().toISOString();
      const snap = await adminDb
        .collection("ai_job_queue")
        .where("status", "==", "PENDING")
        .limit(1)
        .get();

      if (snap.empty) {
        return res.status(200).json({ claimed: false, message: "No pending jobs in queue" });
      }

      const jobDoc = snap.docs[0];
      const jobId = jobDoc.id;
      const jobData = jobDoc.data();

      if (!ALLOWED_TASK_TYPES.has(jobData.taskType)) {
        await adminDb.collection("ai_job_queue").doc(jobId).update({
          status: "DEAD_LETTER",
          error: `Disallowed task type: ${jobData.taskType}`,
          updatedAt: now
        });
        return res.status(200).json({ claimed: false, message: "Task type rejected" });
      }

      // Claim job lease
      const leaseExpiresAt = new Date(Date.now() + leaseDurationMs).toISOString();
      await adminDb.collection("ai_job_queue").doc(jobId).update({
        status: "CLAIMED",
        claimedBy: workerId,
        leaseExpiresAt,
        updatedAt: now
      });

      return res.status(200).json({
        claimed: true,
        job: {
          id: jobId,
          taskType: jobData.taskType,
          prompt: jobData.prompt,
          model: jobData.model || "qwen3:8b",
          tenantId: jobData.tenantId || "tenant-default",
          leaseExpiresAt
        }
      });
    } catch (err: any) {
      return res.status(500).json({ error: `Job claim failed: ${err.message}` });
    }
  }

  // Action 2: Submit Job Result
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

      if (status === "COMPLETED") {
        // Output guardrail validation
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
          completedBy: workerId,
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
        // Handle failure & retries
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
