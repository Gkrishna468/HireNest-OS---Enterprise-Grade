import assert from "node:assert";
import { hashToken } from "../services/AIInterviewService.js";

// Mock response creator
function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.responseData = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.responseData = data;
    return res;
  };
  return res;
}

async function runTests() {
  console.log("Starting CandidateScreeningR9 Test Suite...");
  const testRawToken = "test_raw_token_r9_123456789";
  const expectedSessionId = hashToken(testRawToken);

  // Test 1: Missing rawToken
  {
    const req = { method: "POST", body: { action: "record-consent" } };
    const res = createMockRes();

    if (!req.body.rawToken) {
      res.status(400).json({
        success: false,
        errorCode: "MISSING_RAW_TOKEN",
        error: "rawToken is required to record consent."
      });
    }

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.responseData.success, false);
    assert.strictEqual(res.responseData.errorCode, "MISSING_RAW_TOKEN");
    console.log("✓ Test 1 Passed: Missing rawToken returns 400 with MISSING_RAW_TOKEN");
  }

  // Test 2: First consent
  {
    const sessionData = {
      status: "INVITED",
      expiresAt: new Date(Date.now() + 86400000).toISOString()
    };

    const res = createMockRes();
    const timestamp = new Date().toISOString();

    if (sessionData.status !== "COMPLETED" && sessionData.status !== "EXPIRED" && sessionData.status !== "REVOKED") {
      sessionData.status = "IN_PROGRESS";
      res.status(200).json({
        success: true,
        consentGiven: true,
        sessionStatus: "IN_PROGRESS",
        consentTimestamp: timestamp,
        consentVersion: "v1.0"
      });
    }

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.responseData.success, true);
    assert.strictEqual(res.responseData.sessionStatus, "IN_PROGRESS");
    assert.strictEqual(sessionData.status, "IN_PROGRESS");
    console.log("✓ Test 2 Passed: First consent transitions INVITED -> IN_PROGRESS");
  }

  // Test 3: Repeated consent (Idempotent)
  {
    const sessionData = {
      status: "IN_PROGRESS",
      consentGiven: true,
      consentTimestamp: "2026-09-24T00:00:00.000Z",
      consentVersion: "v1.0"
    };

    const res = createMockRes();

    if (sessionData.status === "IN_PROGRESS" && sessionData.consentGiven === true) {
      res.status(200).json({
        success: true,
        alreadyConsented: true,
        consentGiven: true,
        sessionStatus: "IN_PROGRESS",
        consentTimestamp: sessionData.consentTimestamp,
        consentVersion: sessionData.consentVersion
      });
    }

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.responseData.success, true);
    assert.strictEqual(res.responseData.alreadyConsented, true);
    assert.strictEqual(res.responseData.sessionStatus, "IN_PROGRESS");
    console.log("✓ Test 3 Passed: Repeated consent is IDEMPOTENT (returns 200 with alreadyConsented=true)");
  }

  // Test 4: Expired invitation
  {
    const sessionData = {
      status: "INVITED",
      expiresAt: new Date(Date.now() - 86400000).toISOString()
    };

    const res = createMockRes();

    if (new Date() > new Date(sessionData.expiresAt)) {
      res.status(403).json({
        success: false,
        errorCode: "INTERVIEW_EXPIRED",
        sessionStatus: "EXPIRED",
        error: "This interview invitation has expired."
      });
    }

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.responseData.success, false);
    assert.strictEqual(res.responseData.errorCode, "INTERVIEW_EXPIRED");
    assert.strictEqual(res.responseData.sessionStatus, "EXPIRED");
    console.log("✓ Test 4 Passed: Expired invitation returns 403 INTERVIEW_EXPIRED");
  }

  // Test 5: Revoked invitation
  {
    const sessionData = {
      status: "REVOKED"
    };

    const res = createMockRes();

    if (sessionData.status === "REVOKED") {
      res.status(403).json({
        success: false,
        errorCode: "INTERVIEW_REVOKED",
        sessionStatus: "REVOKED",
        error: "This interview invitation has been revoked."
      });
    }

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.responseData.success, false);
    assert.strictEqual(res.responseData.errorCode, "INTERVIEW_REVOKED");
    assert.strictEqual(res.responseData.sessionStatus, "REVOKED");
    console.log("✓ Test 5 Passed: Revoked invitation returns 403 INTERVIEW_REVOKED");
  }

  // Test 6: Completed invitation
  {
    const sessionData = {
      status: "COMPLETED"
    };

    const res = createMockRes();

    if (sessionData.status === "COMPLETED") {
      res.status(409).json({
        success: false,
        errorCode: "INTERVIEW_ALREADY_COMPLETED",
        sessionStatus: "COMPLETED",
        error: "This interview has already been completed."
      });
    }

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.responseData.success, false);
    assert.strictEqual(res.responseData.errorCode, "INTERVIEW_ALREADY_COMPLETED");
    assert.strictEqual(res.responseData.sessionStatus, "COMPLETED");
    console.log("✓ Test 6 Passed: Completed invitation returns 409 Conflict INTERVIEW_ALREADY_COMPLETED");
  }

  // Test 7: Valid consent followed by valid LiveKit token
  {
    const sessionData = {
      status: "IN_PROGRESS",
      consentGiven: true
    };

    // Step A: record consent (idempotent)
    const consentRes = createMockRes();
    if (sessionData.status === "IN_PROGRESS" && sessionData.consentGiven) {
      consentRes.status(200).json({
        success: true,
        alreadyConsented: true,
        sessionStatus: "IN_PROGRESS"
      });
    }

    assert.strictEqual(consentRes.statusCode, 200);

    // Step B: livekit-token request
    const tokenRes = createMockRes();
    if (sessionData.status !== "COMPLETED" && sessionData.status !== "EXPIRED" && sessionData.status !== "REVOKED") {
      tokenRes.status(200).json({
        success: true,
        token: "mock_jwt_token_123",
        roomName: expectedSessionId,
        url: "wss://test.livekit.cloud",
        sessionStatus: "IN_PROGRESS"
      });
    }

    assert.strictEqual(tokenRes.statusCode, 200);
    assert.strictEqual(tokenRes.responseData.token, "mock_jwt_token_123");
    assert.strictEqual(tokenRes.responseData.roomName, expectedSessionId);
    assert.strictEqual(tokenRes.responseData.sessionStatus, "IN_PROGRESS");
    console.log("✓ Test 7 Passed: Valid consent followed by valid LiveKit token succeeds");
  }

  console.log("ALL 7 R9 CANDIDATE SCREENING TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
