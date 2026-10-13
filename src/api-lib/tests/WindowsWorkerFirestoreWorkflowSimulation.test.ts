/**
 * HireNestOS Outbound Windows Worker to Firestore Workflow Simulation Test Suite
 * 
 * Simulates a real Windows GPU Worker client making authenticated HTTP requests
 * to the HireNestOS Worker API (claim/submit) with exact worker secrets, JSON payloads,
 * lease checks, and direct Firestore database state verification.
 */

import assert from "assert";
import workerHandler from "../handlers/ai-worker.js";
import { adminDb } from "../../lib/firebase-admin.js";

function createMockReqRes(options: {
  method?: string;
  query?: any;
  body?: any;
  headers?: Record<string, string>;
}) {
  const req: any = {
    method: options.method || "POST",
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
    url: "/api/ai-worker"
  };

  let statusCode = 200;
  let responseData: any = null;

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
    send: (data: any) => {
      responseData = data;
      return res;
    },
    _getStatus: () => statusCode,
    _getData: () => responseData
  };

  return { req, res };
}

export async function runWindowsWorkerSimulationTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  console.log("\n==================================================================");
  console.log("💻 Running Windows Outbound Worker to Firestore E2E Workflow Verification");
  console.log("==================================================================\n");

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function logPass(title: string) {
    console.log(`  ✓ [PASS] ${title}`);
    passed++;
  }

  function logFail(title: string, err: any) {
    console.error(`  ✗ [FAIL] ${title}:`, err.message || err);
    failed++;
    errors.push(title);
  }

  // Setup worker environment secret
  const TEST_WORKER_SECRET = "win_worker_sec_998877665544";
  process.env.OLLAMA_PROXY_KEY = TEST_WORKER_SECRET;

  const WINDOWS_WORKER_ID = "windows-gpu-node-rtx4090-01";
  const TEST_TENANT_ID = "tenant-staging-enterprise";
  const TEST_JOB_ID = `win-job-e2e-${Date.now()}`;

  try {
    if (!adminDb) {
      throw new Error("Firestore Admin Database connection not initialized");
    }

    // Step 1: Create a Pending AI Job in Firestore
    console.log("-> Step 1: Enqueuing Pending Candidate Screening Job in Firestore:");
    await adminDb.collection("ai_job_queue").doc(TEST_JOB_ID).set({
      taskType: "deep_screening",
      prompt: "Perform deep candidate screening for Senior Full Stack Cloud Engineer.",
      status: "PENDING",
      model: "qwen3:8b",
      tenantId: TEST_TENANT_ID,
      userId: "recruiter-admin-01",
      createdAt: new Date().toISOString()
    });

    const initialDoc = await adminDb.collection("ai_job_queue").doc(TEST_JOB_ID).get();
    assert.strictEqual(initialDoc.exists, true, "Job created in Firestore");
    assert.strictEqual(initialDoc.data()?.status, "PENDING", "Initial job status is PENDING");
    logPass("Successfully created PENDING job in Firestore queue");

    // Step 2: Windows Worker Claims Job via Claim Endpoint with Secret Header
    console.log("\n-> Step 2: Outbound Windows Worker Claims Job via /api/ai-worker?action=claim:");
    const { req: reqClaim, res: resClaim } = createMockReqRes({
      method: "POST",
      query: { action: "claim" },
      headers: {
        "x-worker-secret": TEST_WORKER_SECRET,
        "user-agent": "HireNest-WindowsWorker/1.4.0 (Windows NT 10.0; Win64; x64)"
      },
      body: {
        workerId: WINDOWS_WORKER_ID,
        hardware: "NVIDIA GeForce RTX 4090 24GB VRAM"
      }
    });

    await workerHandler(reqClaim, resClaim);

    assert.strictEqual(resClaim._getStatus(), 200, "Claim API returned HTTP 200");
    const claimData = resClaim._getData();
    assert.strictEqual(claimData.claimed, true, "Job successfully claimed by worker");
    assert.strictEqual(claimData.job.id, TEST_JOB_ID, "Claimed job ID matches created job");
    assert.strictEqual(claimData.job.taskType, "deep_screening", "Job task type is correct");
    logPass("Windows Worker successfully claimed job with valid secret and payload");

    // Verify Lease State directly in Firestore
    const claimedDoc = await adminDb.collection("ai_job_queue").doc(TEST_JOB_ID).get();
    const claimedData = claimedDoc.data();
    assert.strictEqual(claimedData?.status, "CLAIMED", "Firestore status updated to CLAIMED");
    assert.strictEqual(claimedData?.claimedBy, WINDOWS_WORKER_ID, "Firestore claimedBy recorded correct workerId");
    assert.notStrictEqual(claimedData?.leaseExpiresAt, undefined, "Lease expiration date recorded in Firestore");
    logPass("Verified Firestore atomic transaction set status='CLAIMED' and lease duration");

    // Step 3: Windows Worker Executes Inference locally & Submits Completed Result
    console.log("\n-> Step 3: Outbound Windows Worker Submits Completed AI Inference Result:");
    const simulatedInferenceResult = JSON.stringify({
      fitmentScore: 94,
      recommendation: "Strong Match",
      skillBreakdown: {
        react: "Expert (8 yrs)",
        nodejs: "Expert (7 yrs)",
        postgresql: "Advanced (5 yrs)",
        cloudArchitecture: "Advanced"
      },
      reasoning: "Candidate demonstrates extensive leadership in React/Node microservices with proven scale."
    });

    const { req: reqSubmit, res: resSubmit } = createMockReqRes({
      method: "POST",
      query: { action: "submit" },
      headers: {
        "x-worker-secret": TEST_WORKER_SECRET,
        "user-agent": "HireNest-WindowsWorker/1.4.0 (Windows NT 10.0; Win64; x64)"
      },
      body: {
        jobId: TEST_JOB_ID,
        workerId: WINDOWS_WORKER_ID,
        status: "COMPLETED",
        resultText: simulatedInferenceResult,
        durationMs: 420,
        tokens: 185
      }
    });

    await workerHandler(reqSubmit, resSubmit);

    assert.strictEqual(resSubmit._getStatus(), 200, "Submit API returned HTTP 200");
    assert.strictEqual(resSubmit._getData().success, true, "Submit API reported success: true");
    logPass("Windows Worker submitted inference result successfully");

    // Step 4: Verify Final Completed State & $0 Cost in Firestore
    console.log("\n-> Step 4: Direct Firestore Verification of Completed Job & Execution Ledger:");
    const completedDoc = await adminDb.collection("ai_job_queue").doc(TEST_JOB_ID).get();
    const completedData = completedDoc.data();

    assert.strictEqual(completedData?.status, "COMPLETED", "Firestore job status is COMPLETED");
    assert.strictEqual(completedData?.completedBy, WINDOWS_WORKER_ID, "Firestore completedBy matches Windows Worker ID");
    assert.strictEqual(completedData?.result, simulatedInferenceResult, "Firestore stored exact result output text");
    assert.strictEqual(completedData?.estimatedCost, 0, "Firestore cost accounting verified $0.00 zero-paid inference");
    assert.strictEqual(completedData?.tokens, 185, "Firestore recorded 185 tokens processed");
    logPass("Verified Firestore job document reflects COMPLETED status, result text, and $0 cost");

    // Verify Execution Ledger entry in Firestore
    const ledgerSnap = await adminDb
      .collection("ai_execution_ledger")
      .where("source", "==", "outbound-windows-worker")
      .get();

    assert.strictEqual(ledgerSnap.empty, false, "Execution ledger entry created in Firestore");
    const ledgerDocs = ledgerSnap.docs.sort((a, b) => {
      const tA = new Date(a.data().timestamp || 0).getTime();
      const tB = new Date(b.data().timestamp || 0).getTime();
      return tB - tA;
    });
    const ledgerData = ledgerDocs[0].data();
    assert.strictEqual(ledgerData.provider, "ollama", "Ledger records local Ollama provider");
    assert.strictEqual(ledgerData.estimatedCost, 0, "Ledger records $0 cost");
    assert.strictEqual(ledgerData.status, "success", "Ledger records success status");
    logPass("Verified Firestore ai_execution_ledger recorded outbound-windows-worker $0 execution entry");

    // Step 5: Verify Impostor Worker Rejection (Security Test)
    console.log("\n-> Step 5: Testing Lease Ownership Defense (Impostor Worker Rejection):");
    const IMPOSTOR_JOB_ID = `win-job-impostor-${Date.now()}`;
    await adminDb.collection("ai_job_queue").doc(IMPOSTOR_JOB_ID).set({
      taskType: "deep_screening",
      prompt: "Security check job",
      status: "CLAIMED",
      claimedBy: "authentic-worker-01",
      leaseExpiresAt: new Date(Date.now() + 300000).toISOString(),
      createdAt: new Date().toISOString()
    });

    const { req: reqImpostor, res: resImpostor } = createMockReqRes({
      method: "POST",
      query: { action: "submit" },
      headers: { "x-worker-secret": TEST_WORKER_SECRET },
      body: {
        jobId: IMPOSTOR_JOB_ID,
        workerId: "impostor-worker-99",
        status: "COMPLETED",
        resultText: "Fake hack output"
      }
    });

    await workerHandler(reqImpostor, resImpostor);

    assert.strictEqual(resImpostor._getStatus(), 403, "Impostor submission rejected with HTTP 403 Forbidden");
    logPass("Worker API correctly rejected result submission from unassigned workerId");

    // Clean up test documents
    await adminDb.collection("ai_job_queue").doc(TEST_JOB_ID).delete().catch(() => {});
    await adminDb.collection("ai_job_queue").doc(IMPOSTOR_JOB_ID).delete().catch(() => {});
    for (const doc of ledgerSnap.docs) {
      await doc.ref.delete().catch(() => {});
    }

  } catch (err: any) {
    logFail("Windows Worker simulation workflow test", err);
  }

  console.log("\n==================================================================");
  console.log(`📊 Windows Worker E2E Simulation Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  return { passed, failed, errors };
}

if (process.argv[1] && process.argv[1].includes("WindowsWorkerFirestoreWorkflowSimulation")) {
  runWindowsWorkerSimulationTests().then(res => {
    if (res.failed > 0) process.exit(1);
    else process.exit(0);
  }).catch(err => {
    console.error("Simulation test failed:", err);
    process.exit(1);
  });
}
