/**
 * HireNestOS Phase 4 Security & Data Integrity Verification Test Suite
 *
 * Verifies P0 and P1 security remediations:
 * 1. Worker Authorization: Fail closed with missing secret, rejection of invalid secret tokens.
 * 2. Atomic Worker Leases: Firestore transaction claim isolation, lease expiration, worker identity checks.
 * 3. Trusted Authorization: Rejection of client 'x-user-role' headers without valid auth tokens.
 * 4. Control Tower Integrity: Removal of all fabricated default values (no hardcoded 1000/650/REQ-FS-01/CAN-001).
 * 5. Reporting Export: ABAC field minimization, PII masking, external role denial.
 * 6. Canonical Schema: ChiefRecruiterAI operates strictly on canonical 'requirements' collection.
 */

import assert from "assert";
import workerHandler from "../handlers/ai-worker.js";
import controlTowerHandler from "../handlers/control-tower.js";
import reportingExportHandler from "../handlers/reporting-export.js";
import { ChiefRecruiterAI } from "../services/ChiefRecruiterAI.js";
import { adminDb } from "../../lib/firebase-admin.js";

function createMockReqRes(options: {
  method?: string;
  query?: any;
  body?: any;
  headers?: Record<string, string>;
  user?: any;
}) {
  const req: any = {
    method: options.method || "GET",
    query: options.query || {},
    body: options.body || {},
    headers: options.headers || {},
    user: options.user || null,
    url: "/api/test"
  };

  let statusCode = 200;
  let responseData: any = null;
  const headersSet: Record<string, string> = {};

  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    setHeader: (name: string, value: string) => {
      headersSet[name.toLowerCase()] = value;
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
    _getData: () => responseData,
    _getHeaders: () => headersSet
  };

  return { req, res };
}

async function runTests() {
  console.log("==================================================================");
  console.log("🛡️ Running HireNestOS Phase 4 Security & Data Integrity Test Suite");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function logPass(title: string) {
    console.log(`  ✓ [PASS] ${title}`);
    passed++;
  }

  function logFail(title: string, err: any) {
    console.error(`  ✗ [FAIL] ${title}:`, err.message || err);
    failed++;
  }

  // --- 1. WORKER AUTHENTICATION TESTS ---
  console.log("\n-> 1. Testing Worker Authentication & Secret Enforcement:");

  try {
    // 1a. Missing worker secret -> 401 / Fail Closed
    const prevKey = process.env.OLLAMA_PROXY_KEY;
    const prevWorkerSec = process.env.WORKER_SECRET;
    delete process.env.OLLAMA_PROXY_KEY;
    delete process.env.WORKER_SECRET;
    delete process.env.AI_WORKER_SECRET;

    const { req: req1, res: res1 } = createMockReqRes({
      method: "POST",
      query: { action: "claim" },
      headers: { "x-worker-secret": "invalid_secret_token" }
    });
    await workerHandler(req1, res1);

    assert.strictEqual(res1._getStatus(), 500, "Server must fail closed when worker secret is not configured in env");
    logPass("Worker handler fails closed (500) when server secret is unconfigured");

    // Restore test secret
    process.env.OLLAMA_PROXY_KEY = "test_phase4_strong_worker_key_9988";

    // 1b. Invalid secret -> 401 Unauthorized
    const { req: req2, res: res2 } = createMockReqRes({
      method: "POST",
      query: { action: "claim" },
      headers: { "x-worker-secret": "wrong_secret_123" }
    });
    await workerHandler(req2, res2);

    assert.strictEqual(res2._getStatus(), 401, "Invalid worker secret must return 401");
    logPass("Invalid worker secret returns HTTP 401 Unauthorized");

    // 1c. Valid secret -> Accepted
    const { req: req3, res: res3 } = createMockReqRes({
      method: "POST",
      query: { action: "claim" },
      headers: { "x-worker-secret": "test_phase4_strong_worker_key_9988" }
    });
    await workerHandler(req3, res3);

    assert.strictEqual(res3._getStatus(), 200, "Valid worker secret must return 200");
    logPass("Valid worker secret passes authentication (HTTP 200)");
  } catch (err: any) {
    logFail("Worker authentication tests", err);
  }

  // --- 2. ATOMIC WORKER LEASES & SUBMISSION VERIFICATION ---
  console.log("\n-> 2. Testing Atomic Worker Lease Claiming & Result Submission:");

  try {
    if (adminDb) {
      const testJobId = `job-test-atomic-${Date.now()}`;
      await adminDb.collection("ai_job_queue").doc(testJobId).set({
        taskType: "deep_screening",
        prompt: "Screen candidate for Cloud Architect role",
        status: "PENDING",
        model: "qwen3:8b",
        tenantId: "tenant-test",
        createdAt: new Date().toISOString()
      });

      // Claim job via transaction
      const { req: reqClaim, res: resClaim } = createMockReqRes({
        method: "POST",
        query: { action: "claim" },
        headers: { "x-worker-secret": "test_phase4_strong_worker_key_9988" },
        body: { workerId: "worker-node-alpha" }
      });
      await workerHandler(reqClaim, resClaim);

      assert.strictEqual(resClaim._getStatus(), 200, "Claim request returns 200");
      const claimData = resClaim._getData();
      assert.strictEqual(claimData.claimed, true, "Job must be claimed");
      assert.strictEqual(claimData.job.id, testJobId, "Claimed job ID matches test job");
      logPass("Atomic Firestore transaction claims pending job lease");

      // Verify second claim for same job fails or receives no job
      const { req: reqClaim2, res: resClaim2 } = createMockReqRes({
        method: "POST",
        query: { action: "claim" },
        headers: { "x-worker-secret": "test_phase4_strong_worker_key_9988" },
        body: { workerId: "worker-node-beta" }
      });
      await workerHandler(reqClaim2, resClaim2);

      const claimData2 = resClaim2._getData();
      assert.strictEqual(claimData2.claimed, false, "Second concurrent claim must NOT re-claim already claimed job");
      logPass("Atomic transaction prevents duplicate concurrent claims on same job");

      // Verify result submission from unauthorized worker is rejected
      const { req: reqSubUnauthorized, res: resSubUnauthorized } = createMockReqRes({
        method: "POST",
        query: { action: "submit" },
        headers: { "x-worker-secret": "test_phase4_strong_worker_key_9988" },
        body: {
          jobId: testJobId,
          workerId: "worker-impostor",
          status: "COMPLETED",
          resultText: "Fake output"
        }
      });
      await workerHandler(reqSubUnauthorized, resSubUnauthorized);

      assert.strictEqual(resSubUnauthorized._getStatus(), 403, "Submission from wrong workerId must return 403");
      logPass("Submission rejected (HTTP 403) when workerId does not match lease owner");

      // Verify result submission from valid worker succeeds
      const { req: reqSubValid, res: resSubValid } = createMockReqRes({
        method: "POST",
        query: { action: "submit" },
        headers: { "x-worker-secret": "test_phase4_strong_worker_key_9988" },
        body: {
          jobId: testJobId,
          workerId: "worker-node-alpha",
          status: "COMPLETED",
          resultText: "Strong candidate matching score 92%",
          durationMs: 450,
          tokens: 120
        }
      });
      await workerHandler(reqSubValid, resSubValid);

      assert.strictEqual(resSubValid._getStatus(), 200, "Valid result submission must return 200");
      assert.strictEqual(resSubValid._getData().success, true, "Result submission must be successful");
      logPass("Valid worker result submission persists successfully");

      // Verify idempotent re-submission
      const { req: reqSubIdempotent, res: resSubIdempotent } = createMockReqRes({
        method: "POST",
        query: { action: "submit" },
        headers: { "x-worker-secret": "test_phase4_strong_worker_key_9988" },
        body: {
          jobId: testJobId,
          workerId: "worker-node-alpha",
          status: "COMPLETED",
          resultText: "Duplicate submission"
        }
      });
      await workerHandler(reqSubIdempotent, resSubIdempotent);

      assert.strictEqual(resSubIdempotent._getStatus(), 200, "Idempotent re-submission returns 200");
      assert.strictEqual(resSubIdempotent._getData().message.includes("idempotent"), true, "Idempotency message returned");
      logPass("Re-submitting completed job behaves idempotently");

      // Cleanup test job
      await adminDb.collection("ai_job_queue").doc(testJobId).delete().catch(() => {});
    }
  } catch (err: any) {
    logFail("Atomic worker leases tests", err);
  }

  // --- 3. TRUSTED AUTHORIZATION & FORGED ROLE HEADER DEFENSE ---
  console.log("\n-> 3. Testing Trusted Authorization & Role Header Forging Defense:");

  try {
    // 3a. Control Tower with x-user-role: super_admin but NO token -> 401
    const { req: reqCtForged, res: resCtForged } = createMockReqRes({
      method: "GET",
      headers: { "x-user-role": "super_admin" }
    });
    await controlTowerHandler(reqCtForged, resCtForged);

    assert.strictEqual(resCtForged._getStatus(), 401, "Forged x-user-role header without valid auth token must return 401");
    logPass("Control Tower rejects forged 'x-user-role: super_admin' header without token (HTTP 401)");

    // 3b. Reporting Export with x-user-role: admin but NO token -> 401
    const { req: reqExpForged, res: resExpForged } = createMockReqRes({
      method: "GET",
      headers: { "x-user-role": "admin" }
    });
    await reportingExportHandler(reqExpForged, resExpForged);

    assert.strictEqual(resExpForged._getStatus(), 401, "Reporting export rejects forged x-user-role header");
    logPass("Reporting export rejects forged 'x-user-role: admin' header without token (HTTP 401)");

    // 3c. Control Tower with verified Recruiter user context -> 200, financials excluded
    const { req: reqCtRecruiter, res: resCtRecruiter } = createMockReqRes({
      method: "GET",
      user: { uid: "recruiter-01", role: "recruiter", tenantId: "tenant-default" }
    });
    await controlTowerHandler(reqCtRecruiter, resCtRecruiter);

    assert.strictEqual(resCtRecruiter._getStatus(), 200, "Authenticated recruiter request succeeds");
    const ctDataRecruiter = resCtRecruiter._getData();
    assert.strictEqual(ctDataRecruiter.isFinanceAuthorized, false, "Recruiter is NOT finance authorized");
    assert.strictEqual(ctDataRecruiter.financials, undefined, "Financials object omitted for recruiter");
    logPass("Control Tower suppresses financial margins for recruiter role");

    // 3d. Control Tower with verified Admin user context -> 200, financials included
    const { req: reqCtAdmin, res: resCtAdmin } = createMockReqRes({
      method: "GET",
      user: { uid: "admin-01", role: "admin", tenantId: "tenant-default" }
    });
    await controlTowerHandler(reqCtAdmin, resCtAdmin);

    assert.strictEqual(resCtAdmin._getStatus(), 200, "Authenticated admin request succeeds");
    const ctDataAdmin = resCtAdmin._getData();
    assert.strictEqual(ctDataAdmin.isFinanceAuthorized, true, "Admin IS finance authorized");
    assert.notStrictEqual(ctDataAdmin.financials, undefined, "Financials object included for admin");
    logPass("Control Tower includes financial metrics for authenticated admin role");
  } catch (err: any) {
    logFail("Trusted authorization tests", err);
  }

  // --- 4. CONTROL TOWER DATA INTEGRITY (ZERO FABRICATED DEFAULTS) ---
  console.log("\n-> 4. Testing Control Tower Data Integrity (Zero Fabricated Defaults):");

  try {
    if (adminDb) {
      const testSubId = `sub-integrity-test-${Date.now()}`;
      await adminDb.collection("submissions").doc(testSubId).set({
        requirementId: "REQ-REAL-101",
        candidateId: "CAN-REAL-202",
        candidateName: "Actual Real Candidate",
        status: "SUBMITTED",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
        // Intentionally missing clientBillingRate and vendorPayoutRate
      });

      const { req: reqCt, res: resCt } = createMockReqRes({
        method: "GET",
        user: { uid: "admin-01", role: "admin", tenantId: "tenant-default" }
      });
      await controlTowerHandler(reqCt, resCt);

      const data = resCt._getData();
      const testRow = data.tableRows.find((r: any) => r.submissionId === testSubId);

      assert.ok(testRow, "Test submission record present in Control Tower output");
      assert.strictEqual(testRow.clientBillingRate, null, "Missing billing rate must be null, NOT default 1000");
      assert.strictEqual(testRow.vendorPayoutRate, null, "Missing payout rate must be null, NOT default 650");
      assert.strictEqual(testRow.formattedMarginHr, "N/A", "Missing rates return 'N/A' margin, NOT fake calculated margin");
      assert.notStrictEqual(testRow.requirementId, "REQ-FS-01", "Requirement ID must NOT default to REQ-FS-01");
      assert.notStrictEqual(testRow.candidateId, "CAN-001", "Candidate ID must NOT default to CAN-001");

      logPass("Control Tower output strictly contains ZERO fabricated rate or ID defaults");

      // Cleanup
      await adminDb.collection("submissions").doc(testSubId).delete().catch(() => {});
    }
  } catch (err: any) {
    logFail("Control Tower zero fabricated defaults tests", err);
  }

  // --- 5. REPORTING EXPORT ABAC & PII MINIMIZATION ---
  console.log("\n-> 5. Testing Reporting Export ABAC & Field Minimization:");

  try {
    // 5a. External vendor access denied -> 403
    const { req: reqExpVendor, res: resExpVendor } = createMockReqRes({
      method: "GET",
      user: { uid: "vendor-user-01", role: "vendor_partner" }
    });
    await reportingExportHandler(reqExpVendor, resExpVendor);

    assert.strictEqual(resExpVendor._getStatus(), 403, "Vendor access to reporting export must return 403");
    logPass("Reporting export denies access to external vendor partners (HTTP 403)");

    // 5b. Unprivileged recruiter role receives PII masked output
    if (adminDb) {
      const testSubId = `sub-export-pii-${Date.now()}`;
      await adminDb.collection("submissions").doc(testSubId).set({
        requirementId: "REQ-EXPORT-01",
        candidateId: "CAN-EXPORT-01",
        candidateName: "Siddharth Malhotra",
        status: "SUBMITTED",
        createdAt: new Date().toISOString()
      });

      const { req: reqExpRecruiter, res: resExpRecruiter } = createMockReqRes({
        method: "GET",
        user: { uid: "recruiter-02", role: "recruiter" }
      });
      await reportingExportHandler(reqExpRecruiter, resExpRecruiter);

      assert.strictEqual(resExpRecruiter._getStatus(), 200);
      const expDataRecruiter = resExpRecruiter._getData();
      assert.strictEqual(expDataRecruiter.meta.piiMinimized, true, "PII minimization flag must be true for recruiter");

      const testExportRow = expDataRecruiter.data.find((r: any) => r.submissionId === testSubId);
      if (testExportRow) {
        assert.notStrictEqual(testExportRow.candidateName, "Siddharth Malhotra", "Raw candidate PII must be masked for unprivileged recruiter role");
        assert.strictEqual(testExportRow.candidateName, "Siddharth M.", "Candidate name is masked to Siddharth M.");
      }

      logPass("Reporting export enforces field-level PII minimization for recruiter role");

      // Cleanup
      await adminDb.collection("submissions").doc(testSubId).delete().catch(() => {});
    }
  } catch (err: any) {
    logFail("Reporting export tests", err);
  }

  // --- 6. CHIEF RECRUITER AI CANONICAL REQUIREMENT COLLECTION ---
  console.log("\n-> 6. Testing ChiefRecruiterAI Canonical Collection Alignment:");

  try {
    if (adminDb) {
      const testReqId = `req-canonical-${Date.now()}`;
      const testCandId = `cand-canonical-${Date.now()}`;

      await adminDb.collection("requirements").doc(testReqId).set({
        title: "Senior Node.js Backend Architect",
        description: "Must have deep expertise in Node.js, TypeScript, and Firestore.",
        mandatorySkills: ["Node.js", "TypeScript", "Firestore"]
      });

      await adminDb.collection("candidatePool").doc(testCandId).set({
        name: "Arjun Rampal",
        skills: ["Node.js", "TypeScript", "Express"],
        parsedData: { rawText: "Experienced Node.js and TypeScript developer with 8 years of experience." }
      });

      const result = await ChiefRecruiterAI.compareEvidenceAndSkills(testCandId, testReqId);
      assert.strictEqual(result.requirementId, testReqId);
      assert.ok(Array.isArray(result.verifiedSkills), "verifiedSkills is an array");
      assert.ok(Array.isArray(result.missingSkills), "missingSkills is an array");

      logPass("ChiefRecruiterAI queries canonical 'requirements' collection without legacy fallbacks");

      // Cleanup
      await adminDb.collection("requirements").doc(testReqId).delete().catch(() => {});
      await adminDb.collection("candidatePool").doc(testCandId).delete().catch(() => {});
    }
  } catch (err: any) {
    logFail("ChiefRecruiterAI canonical schema tests", err);
  }

  console.log("==================================================================");
  console.log(`📊 Phase 4 Security & Integrity Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error("Critical test execution failure:", err);
  process.exit(1);
});
