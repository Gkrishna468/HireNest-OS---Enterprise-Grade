/**
 * HireNestOS Real Windows Worker Runtime Smoke Test
 *
 * Validates the end-to-end outbound Windows GPU worker transaction:
 * - Synthetic candidate processing job in Firestore (ai_job_queue)
 * - Atomic lease claiming via HTTP POST /api/ai-worker?action=claim
 * - Local Ollama proxy inference over 127.0.0.1:11435
 * - Result submission via HTTP POST /api/ai-worker?action=submit
 * - Direct Firestore checks (COMPLETED status, non-empty candidate analysis, zero-cost accounting)
 * - Defense against unauthorized secrets and impostor worker IDs
 * - Full cleanup of synthetic Firestore test records
 */

// 1. Set environment variables BEFORE importing local worker CommonJS script
process.env.OLLAMA_PROXY_KEY = "staging_worker_secret_key_32chars_min";
process.env.WORKER_SECRET = "staging_worker_secret_key_32chars_min";
process.env.SERVER_URL = "http://127.0.0.1:3099";
process.env.OLLAMA_PROXY_URL = "http://127.0.0.1:11435";

import { describe, it, before, after } from "node:test";
import express from "express";
import http from "http";
import assert from "assert";
import { adminDb } from "../../lib/firebase-admin.js";
import aiWorkerHandler from "../handlers/ai-worker.js";
import { httpRequest, executeOllamaInference } from "../../../scripts/local-ai-worker.cjs";
import { createProxyApp } from "../../../scripts/ollama-proxy-server.cjs";

const TEST_PORT = 3099;
const OLLAMA_PROXY_PORT = 11435;
const WORKER_SECRET = "staging_worker_secret_key_32chars_min";
const WORKER_ID = "windows-gpu-worker-smoke-01";
const SYNTHETIC_JOB_ID = `smoke-job-synth-${Date.now()}`;

describe("HireNestOS Real Windows Worker Runtime Smoke Test", () => {
  let appServer: http.Server;
  let ollamaProxyServer: http.Server;
  let mockUpstreamOllamaServer: http.Server;

  before(async () => {
    // 1. Set Environment Variables
    process.env.OLLAMA_PROXY_KEY = WORKER_SECRET;
    process.env.WORKER_SECRET = WORKER_SECRET;
    process.env.SERVER_URL = `http://127.0.0.1:${TEST_PORT}`;
    process.env.OLLAMA_PROXY_URL = `http://127.0.0.1:${OLLAMA_PROXY_PORT}`;

    // 2. Start Mock Upstream Ollama on Port 11434 (Simulates Windows Ollama GPU daemon)
    const mockOllamaApp = express();
    mockOllamaApp.use(express.json());
    mockOllamaApp.post("/api/chat", (req, res) => {
      res.status(200).json({
        model: req.body?.model || "qwen3:8b",
        message: {
          role: "assistant",
          content: "```json\n{\n  \"matchScore\": 94,\n  \"summary\": \"Candidate demonstrates senior React and TypeScript expertise with strong staffing system experience.\",\n  \"fitmentCategory\": \"STRONG_MATCH\",\n  \"recommendation\": \"RECOMMEND_INTERVIEW\"\n}\n```"
        },
        prompt_eval_count: 320,
        eval_count: 85,
        done: true
      });
    });

    await new Promise<void>((resolve) => {
      mockUpstreamOllamaServer = mockOllamaApp.listen(11434, "127.0.0.1", () => {
        resolve();
      });
    });

    // 3. Start Local Ollama Proxy Server on Port 11436
    const proxyApp = createProxyApp({
      apiKey: WORKER_SECRET,
      targetUrl: "http://127.0.0.1:11434"
    });
    await new Promise<void>((resolve) => {
      ollamaProxyServer = proxyApp.listen(OLLAMA_PROXY_PORT, "127.0.0.1", () => {
        resolve();
      });
    });

    // 4. Start Local Express Backend Server with /api/ai-worker route
    const backendApp = express();
    backendApp.use(express.json());
    backendApp.all("/api/ai-worker", async (req, res) => {
      await aiWorkerHandler(req, res);
    });

    await new Promise<void>((resolve) => {
      appServer = backendApp.listen(TEST_PORT, "127.0.0.1", () => {
        resolve();
      });
    });
  });

  after(async () => {
    // Close HTTP servers
    if (appServer) appServer.close();
    if (ollamaProxyServer) ollamaProxyServer.close();
    if (mockUpstreamOllamaServer) mockUpstreamOllamaServer.close();

    // Cleanup synthetic Firestore documents
    if (adminDb) {
      await adminDb.collection("ai_job_queue").doc(SYNTHETIC_JOB_ID).delete().catch(() => {});
      
      const ledgerSnap = await adminDb
        .collection("ai_execution_ledger")
        .where("source", "==", "outbound-windows-worker")
        .get();
      
      for (const doc of ledgerSnap.docs) {
        if (doc.data().userId === "smoke-test-user-01") {
          await doc.ref.delete().catch(() => {});
        }
      }
    }
  });

  it("1. Reject worker requests with missing or invalid secret keys", async () => {
    const claimAttempt = await httpRequest(`http://127.0.0.1:${TEST_PORT}/api/ai-worker?action=claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": "invalid_worker_secret_12345"
      }
    }, { workerId: WORKER_ID });

    assert.strictEqual(claimAttempt.status, 401);
    assert.strictEqual(claimAttempt.data.error, "Unauthorized: Invalid or missing worker secret token");
  });

  it("2. Seed synthetic candidate processing job in Firestore (status: PENDING)", async () => {
    assert.ok(adminDb, "Firestore Admin DB must be initialized");

    await adminDb.collection("ai_job_queue").doc(SYNTHETIC_JOB_ID).set({
      tenantId: "staging-test-tenant",
      userId: "smoke-test-user-01",
      taskType: "candidate_matching",
      prompt: "Evaluate candidate resume for Senior Frontend Architect role requiring React 18, TypeScript, and Vite.",
      model: "qwen3:8b",
      status: "PENDING",
      createdAt: new Date().toISOString()
    });

    const docSnap = await adminDb.collection("ai_job_queue").doc(SYNTHETIC_JOB_ID).get();
    assert.strictEqual(docSnap.exists, true);
    assert.strictEqual(docSnap.data()?.status, "PENDING");
  });

  it("3. Worker claims job lease via HTTP claim endpoint", async () => {
    const claimRes = await httpRequest(`http://127.0.0.1:${TEST_PORT}/api/ai-worker?action=claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET
      }
    }, { workerId: WORKER_ID });

    assert.strictEqual(claimRes.status, 200);
    assert.strictEqual(claimRes.data?.claimed, true);
    assert.strictEqual(claimRes.data?.job?.id, SYNTHETIC_JOB_ID);
    assert.strictEqual(claimRes.data?.job?.taskType, "candidate_matching");

    // Verify Firestore lease transition
    const docSnap = await adminDb!.collection("ai_job_queue").doc(SYNTHETIC_JOB_ID).get();
    assert.strictEqual(docSnap.data()?.status, "CLAIMED");
    assert.strictEqual(docSnap.data()?.claimedBy, WORKER_ID);
  });

  it("4. Impostor worker cannot submit result for job claimed by another worker", async () => {
    const submitRes = await httpRequest(`http://127.0.0.1:${TEST_PORT}/api/ai-worker?action=submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET
      }
    }, {
      jobId: SYNTHETIC_JOB_ID,
      workerId: "impostor-worker-999",
      status: "COMPLETED",
      resultText: "Forged result"
    });

    assert.strictEqual(submitRes.status, 403);
    assert.ok(submitRes.data?.error?.includes("claimed by worker"));
  });

  it("5. Worker executes local Ollama inference via local proxy and submits COMPLETED result", async () => {
    const job = {
      id: SYNTHETIC_JOB_ID,
      model: "qwen3:8b",
      prompt: "Evaluate candidate resume for Senior Frontend Architect role requiring React 18, TypeScript, and Vite."
    };

    // Execute local inference call
    const { resultText, durationMs, tokens } = await executeOllamaInference(job);

    assert.ok(resultText.includes("STRONG_MATCH"), "Inference result should contain candidate analysis");
    assert.ok(durationMs >= 0, "Duration should be calculated");
    assert.strictEqual(tokens, 405, "Tokens should sum prompt_eval_count + eval_count");

    // Submit result to backend
    const submitRes = await httpRequest(`http://127.0.0.1:${TEST_PORT}/api/ai-worker?action=submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET
      }
    }, {
      jobId: SYNTHETIC_JOB_ID,
      workerId: WORKER_ID,
      status: "COMPLETED",
      resultText,
      durationMs,
      tokens
    });

    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data?.success, true);
  });

  it("6. Verify Firestore state transitions, candidate analysis content, and $0 cost ledger entry", async () => {
    // Verify ai_job_queue document
    const jobSnap = await adminDb!.collection("ai_job_queue").doc(SYNTHETIC_JOB_ID).get();
    const jobData = jobSnap.data();

    assert.strictEqual(jobData?.status, "COMPLETED");
    assert.strictEqual(jobData?.completedBy, WORKER_ID);
    assert.strictEqual(jobData?.estimatedCost, 0);
    assert.ok(jobData?.result?.includes("STRONG_MATCH"));

    // Verify ai_execution_ledger entry
    const ledgerSnap = await adminDb!
      .collection("ai_execution_ledger")
      .where("userId", "==", "smoke-test-user-01")
      .get();

    assert.strictEqual(ledgerSnap.empty, false);
    const ledgerEntry = ledgerSnap.docs[0].data();

    assert.strictEqual(ledgerEntry.source, "outbound-windows-worker");
    assert.strictEqual(ledgerEntry.provider, "ollama");
    assert.strictEqual(ledgerEntry.estimatedCost, 0);
    assert.strictEqual(ledgerEntry.status, "success");
    assert.strictEqual(ledgerEntry.model, "qwen3:8b");
  });
});
