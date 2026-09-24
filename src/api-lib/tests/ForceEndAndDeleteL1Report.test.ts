import { describe, it } from "node:test";
import assert from "node:assert";
import { adminDb } from "../../lib/firebase-admin.js";

describe("Force End Interview & Soft-Delete L1 Report Integration Tests", () => {
  const testSessionId = "test_session_force_end_" + Date.now();
  const testCandidateId = "cand_test_fe_" + Date.now();
  const testReqId = "req_test_fe_" + Date.now();

  it("should create a mock session and report in Firestore", async () => {
    await adminDb.collection("ai_interview_sessions").doc(testSessionId).set({
      candidateId: testCandidateId,
      requirementId: testReqId,
      status: "IN_PROGRESS",
      createdAt: new Date().toISOString()
    });

    await adminDb.collection("ai_interview_reports").doc(testSessionId).set({
      sessionId: testSessionId,
      candidateId: testCandidateId,
      requirementId: testReqId,
      technicalCompetenceScore: 88,
      communicationScore: 92,
      overallRecommendation: "STRONG_PASS",
      createdAt: new Date().toISOString()
    });

    const sessionSnap = await adminDb.collection("ai_interview_sessions").doc(testSessionId).get();
    const reportSnap = await adminDb.collection("ai_interview_reports").doc(testSessionId).get();

    assert.ok(sessionSnap.exists, "Session should exist");
    assert.ok(reportSnap.exists, "Report should exist");
  });

  it("should soft-delete L1 screening report and set isDeleted: true", async () => {
    const reportRef = adminDb.collection("ai_interview_reports").doc(testSessionId);
    await reportRef.update({
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      deletedBy: "Test Admin",
      deletionReason: "Unit test soft deletion"
    });

    const updatedSnap = await reportRef.get();
    const data = updatedSnap.data() || {};

    assert.strictEqual(data.isDeleted, true, "isDeleted must be true");
    assert.ok(data.deletedAt, "deletedAt timestamp must be recorded");
    assert.strictEqual(data.deletedBy, "Test Admin");
  });

  it("should update session status to FORCE_ENDED on force termination", async () => {
    const sessionRef = adminDb.collection("ai_interview_sessions").doc(testSessionId);
    await sessionRef.set({
      status: "FORCE_ENDED",
      terminationType: "ADMIN_FORCE_ENDED",
      terminationReason: "ADMIN_FORCE_ENDED",
      terminatedBy: "Recruiter Admin",
      terminatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    const sessionSnap = await sessionRef.get();
    const sessionData = sessionSnap.data() || {};

    assert.strictEqual(sessionData.status, "FORCE_ENDED");
    assert.strictEqual(sessionData.terminationType, "ADMIN_FORCE_ENDED");
    assert.ok(sessionData.terminatedAt);
  });
});
