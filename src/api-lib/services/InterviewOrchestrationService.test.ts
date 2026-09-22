import { InterviewOrchestrationService } from "./InterviewOrchestrationService.js";
import { adminDb } from "../../lib/firebase-admin.js";

async function runTests() {
  console.log("=== Starting InterviewOrchestrationService End-to-End Tests ===");

  if (!adminDb) {
    console.error("Firestore Admin DB not initialized. Skipping tests.");
    process.exit(1);
  }

  try {
    const testCandidateId = `test_cand_${Date.now()}`;
    const testReqId = `test_req_${Date.now()}`;
    const testSubId = `test_sub_${Date.now()}`;

    // 1. Create Interview (DRAFT)
    console.log("\n[Test 1] Creating AI Interview...");
    const interview1 = await InterviewOrchestrationService.createAIInterview({
      type: "AI_SCREENING",
      candidateId: testCandidateId,
      submissionId: testSubId,
      requirementId: testReqId,
      organizationId: "org-test-123",
      createdBy: "admin-tester",
      createdByRole: "ADMIN"
    });
    console.log("✓ Interview Created:", interview1.interviewId, "Status:", interview1.status);
    if (interview1.status !== "DRAFT") throw new Error(`Expected status DRAFT, got ${interview1.status}`);

    // 2. Idempotency Test: Repeated creation returns same interview
    console.log("\n[Test 2] Testing Idempotent Creation...");
    const interview1Dup = await InterviewOrchestrationService.createAIInterview({
      type: "AI_SCREENING",
      candidateId: testCandidateId,
      submissionId: testSubId,
      requirementId: testReqId,
      organizationId: "org-test-123",
      createdBy: "admin-tester",
      createdByRole: "ADMIN"
    });
    console.log("✓ Idempotency Check:", interview1Dup.interviewId === interview1.interviewId ? "PASSED (Same ID)" : "FAILED");
    if (interview1Dup.interviewId !== interview1.interviewId) throw new Error("Idempotency check failed!");

    // 3. Schedule Interview
    console.log("\n[Test 3] Scheduling Interview...");
    const scheduled = await InterviewOrchestrationService.scheduleAIInterview(
      "admin-tester",
      interview1.interviewId,
      {
        summary: "Technical AI Screening",
        description: "Automated candidate assessment",
        start: { dateTime: new Date(Date.now() + 86400000).toISOString(), timeZone: "UTC" },
        end: { dateTime: new Date(Date.now() + 90000000).toISOString(), timeZone: "UTC" }
      },
      false
    );
    console.log("✓ Interview Scheduled:", scheduled.status, "Start:", scheduled.scheduledStart);
    if (scheduled.status !== "SCHEDULED") throw new Error(`Expected status SCHEDULED, got ${scheduled.status}`);

    // 4. Reschedule Interview
    console.log("\n[Test 4] Rescheduling Interview...");
    const rescheduled = await InterviewOrchestrationService.rescheduleInterview(
      "admin-tester",
      interview1.interviewId,
      {
        summary: "Technical AI Screening (Updated)",
        start: { dateTime: new Date(Date.now() + 172800000).toISOString(), timeZone: "UTC" },
        end: { dateTime: new Date(Date.now() + 176400000).toISOString(), timeZone: "UTC" }
      },
      false
    );
    console.log("✓ Interview Rescheduled:", rescheduled.status, "New Start:", rescheduled.scheduledStart);

    // 5. Invite Candidate
    console.log("\n[Test 5] Inviting Candidate...");
    const invited = await InterviewOrchestrationService.inviteCandidate(interview1.interviewId, "candidate@example.com");
    console.log("✓ Candidate Invited:", invited.status, "Invitation Token:", invited.candidateInvitationId);
    if (invited.status !== "INVITED") throw new Error(`Expected status INVITED, got ${invited.status}`);

    // 6. Start Interview
    console.log("\n[Test 6] Starting Interview Session...");
    const sessionToken = `sess_${Date.now()}`;
    const started = await InterviewOrchestrationService.startInterview(interview1.interviewId, sessionToken);
    console.log("✓ Interview Started:", started.status, "Session ID:", started.sessionId);
    if (started.status !== "IN_PROGRESS") throw new Error(`Expected status IN_PROGRESS, got ${started.status}`);

    // 7. Complete Interview
    console.log("\n[Test 7] Completing Interview with Report...");
    const reportId = `rep_${Date.now()}`;
    const completed = await InterviewOrchestrationService.completeInterview(interview1.interviewId, reportId);
    console.log("✓ Interview Completed:", completed.status, "Report ID:", completed.aiInterviewReportId);
    if (completed.status !== "COMPLETED") throw new Error(`Expected status COMPLETED, got ${completed.status}`);

    // 8. Test Invalid State Transition (COMPLETED -> DRAFT)
    console.log("\n[Test 8] Testing Invalid State Transition Block...");
    try {
      await InterviewOrchestrationService.scheduleAIInterview("admin-tester", interview1.interviewId, {
        summary: "Invalid Schedule Attempt",
        start: { dateTime: new Date().toISOString() },
        end: { dateTime: new Date().toISOString() }
      }, false);
      console.error("❌ FAILED: Invalid transition was allowed!");
      process.exit(1);
    } catch (e: any) {
      console.log("✓ Passed: Invalid state transition blocked cleanly ->", e.message);
    }

    // 9. Test Cancel Interview on new record
    console.log("\n[Test 9] Creating and Cancelling Second Interview...");
    const interview2 = await InterviewOrchestrationService.createAIInterview({
      type: "HUMAN",
      candidateId: `${testCandidateId}_2`,
      submissionId: testSubId,
      requirementId: testReqId,
      organizationId: "org-test-123",
      createdBy: "admin-tester",
      createdByRole: "ADMIN"
    });
    const cancelled = await InterviewOrchestrationService.cancelInterview(interview2.interviewId, "Candidate withdrew application");
    console.log("✓ Interview Cancelled:", cancelled.status);
    if (cancelled.status !== "CANCELLED") throw new Error(`Expected status CANCELLED, got ${cancelled.status}`);

    console.log("\n=======================================================");
    console.log("🎉 ALL INTERVIEW ORCHESTRATION TESTS PASSED SUCCESSFULLY!");
    console.log("=======================================================");

  } catch (err: any) {
    console.error("❌ TEST FAILURE:", err.message);
    process.exit(1);
  }
}

runTests();
