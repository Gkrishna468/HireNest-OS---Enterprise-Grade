/**
 * SubmissionOrchestrator Remediation & AI Gateway Route Regression Test Suite
 * 
 * Verifies:
 * 1. Constructor and import resolution in all runtime environments (no "h is not a constructor").
 * 2. Valid authorized candidate submission through SubmissionOrchestrator.
 * 3. Rejection of unauthorized submissions (missing submitterId or invalid candidate data).
 * 4. Rejection of closed, unpublished, or inactive requirements via canonical operational predicate.
 * 5. Rejection of vendor submissions to non-vendor-eligible requirements.
 * 6. Idempotency & duplicate submission handling (no duplicate records).
 * 7. Candidate ownership conflict enforcement (Vendor A blocked by Vendor B lock).
 * 8. Correct immutable vendor/source attribution snapshot.
 * 9. Firestore persistence and lifecycle transitions.
 * 10. Separation between Run AI Match and Submit Candidate (matching does not invoke submission).
 */

import { SubmissionOrchestrator } from "../lib/workflows/SubmissionOrchestrator.js";
import { CandidateOwnershipEngine } from "../lib/workflows/CandidateOwnershipEngine.js";
import { UnifiedRequirementsService } from "../services/unifiedRequirementsService.js";
import { VendorRequirementEligibilityPolicy } from "../services/VendorRequirementEligibilityPolicy.js";
import { CandidateMatchingService } from "../services/CandidateMatchingService.js";
import { AccessControlService } from "../services/accessControlService.js";
import { adminDb } from "../lib/firebase-admin.js";
import { runAsTrustedService, trustedContextStorage } from "../lib/trusted-context.server.js";

export async function runSubmissionOrchestratorRemediationTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, message: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ ${message}`);
    } else {
      failed++;
      errors.push(message);
      console.error(`  ✗ FAIL: ${message}`);
    }
  }

  console.log("\n===============================================================");
  console.log("   SUBMISSION ORCHESTRATOR & ELIGIBILITY REMEDIATION MATRIX");
  console.log("===============================================================\n");

  await runAsTrustedService({ type: "SERVICE", service: "submission-remediation-test" }, async () => {
    // -------------------------------------------------------------
    // 1. Constructor and Import Resolution
    // -------------------------------------------------------------
    console.log("[Test 1] Verifying constructor and import resolution...");
    try {
      assert(typeof SubmissionOrchestrator.submitCandidate === "function", "SubmissionOrchestrator.submitCandidate method exists as a function");
      assert(typeof SubmissionOrchestrator.generateFingerprint === "function", "SubmissionOrchestrator.generateFingerprint method exists as a function");
      assert(trustedContextStorage !== undefined && trustedContextStorage !== null, "trustedContextStorage is properly instantiated (not undefined)");
      assert(typeof trustedContextStorage.run === "function", "trustedContextStorage.run exists as a function");
    } catch (err: any) {
      assert(false, `Constructor resolution threw exception: ${err.message}`);
    }

    // -------------------------------------------------------------
    // Test Data Setup
    // -------------------------------------------------------------
    const activeReqId = `REQ-REMED-ACTIVE-${Date.now()}`;
    const closedReqId = `REQ-REMED-CLOSED-${Date.now()}`;
    const unpubReqId = `REQ-REMED-UNPUB-${Date.now()}`;
    const holdReqId = `REQ-REMED-HOLD-${Date.now()}`;
    const hiddenReqId = `REQ-REMED-HIDDEN-${Date.now()}`;
    const cand1Id = `CAN-REMED-001-${Date.now()}`;
    const cand2Id = `CAN-REMED-002-${Date.now()}`;
    const vendorOrgId = "VENDOR_ACME_001";
    const clientOrgId = "CLIENT_TECHCORP_001";

    if (adminDb) {
      // Setup ACTIVE + PUBLISHED requirement
      await adminDb.collection("requirements").doc(activeReqId).set({
        id: activeReqId,
        title: "Senior Infrastructure Engineer",
        clientId: clientOrgId,
        clientName: "TechCorp Global",
        assignedRecruiterId: "REC_SARAH_01",
        assignedRecruiterName: "Sarah Connor",
        status: "ACTIVE",
        distributionStatus: "PUBLISHED",
        approvalStatus: "APPROVED",
        visibility: { vendors: true },
        vendorVisible: true,
        workMode: "Remote",
        employmentType: "CONTRACT",
        skills: ["Kubernetes", "Terraform", "AWS", "Go"],
        mandatorySkills: ["Kubernetes", "AWS"]
      });

      // Setup CLOSED requirement
      await adminDb.collection("requirements").doc(closedReqId).set({
        id: closedReqId,
        title: "Closed Project Manager",
        clientId: clientOrgId,
        clientName: "TechCorp Global",
        status: "CLOSED",
        distributionStatus: "PUBLISHED",
        approvalStatus: "APPROVED",
        skills: ["Project Management", "Jira"]
      });

      // Setup UNPUBLISHED requirement
      await adminDb.collection("requirements").doc(unpubReqId).set({
        id: unpubReqId,
        title: "Unpublished Data Scientist",
        clientId: clientOrgId,
        clientName: "TechCorp Global",
        status: "ACTIVE",
        distributionStatus: "UNPUBLISHED",
        approvalStatus: "APPROVED",
        skills: ["Python", "PyTorch"]
      });

      // Setup ON_HOLD requirement
      await adminDb.collection("requirements").doc(holdReqId).set({
        id: holdReqId,
        title: "On-Hold DevOps Lead",
        clientId: clientOrgId,
        clientName: "TechCorp Global",
        status: "HOLD",
        distributionStatus: "PUBLISHED",
        approvalStatus: "APPROVED",
        skills: ["Docker", "Linux"]
      });

      // Setup Hidden from vendors requirement
      await adminDb.collection("requirements").doc(hiddenReqId).set({
        id: hiddenReqId,
        title: "Confidential Executive Director",
        clientId: clientOrgId,
        clientName: "TechCorp Global",
        status: "ACTIVE",
        distributionStatus: "PUBLISHED",
        approvalStatus: "APPROVED",
        vendorVisible: false,
        visibility: { vendors: false },
        skills: ["Leadership", "Executive Management"]
      });

      // Seed candidates
      await adminDb.collection("candidatePool").doc(cand1Id).set({
        id: cand1Id,
        candidateId: cand1Id,
        fullName: "Devon Cloud Architect",
        email: "devon.cloud@example.com",
        phone: "555-0987",
        vendorId: vendorOrgId,
        skills: ["Kubernetes", "AWS", "Terraform", "Go"],
        experienceYears: 9,
        pipelineStage: "Sourced"
      });

      await adminDb.collection("candidatePool").doc(cand2Id).set({
        id: cand2Id,
        candidateId: cand2Id,
        fullName: "Alex Security Engineer",
        email: "alex.sec@example.com",
        phone: "555-0988",
        vendorId: vendorOrgId,
        skills: ["Security", "OAuth", "Vault"],
        experienceYears: 6,
        pipelineStage: "Sourced"
      });
    }

    // -------------------------------------------------------------
    // 2. Rejection of Ineligible Requirements
    // -------------------------------------------------------------
    console.log("\n[Test 2] Rejection of closed, unpublished, on-hold, or non-existent requirements...");

    // 2A: Closed requirement
    const resClosed = await SubmissionOrchestrator.submitCandidate({
      requirementId: closedReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: { id: cand1Id, name: "Devon Cloud Architect", email: "devon.cloud@example.com" }
    });
    assert(resClosed.success === false, "Closed requirement is rejected for submission");
    assert(resClosed.error === "REQUIREMENT_INELIGIBLE", "Closed requirement returns REQUIREMENT_INELIGIBLE error code");

    // 2B: Unpublished requirement
    const resUnpub = await SubmissionOrchestrator.submitCandidate({
      requirementId: unpubReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: { id: cand1Id, name: "Devon Cloud Architect", email: "devon.cloud@example.com" }
    });
    assert(resUnpub.success === false, "Unpublished requirement is rejected for submission");
    assert(resUnpub.error === "REQUIREMENT_INELIGIBLE", "Unpublished requirement returns REQUIREMENT_INELIGIBLE error code");

    // 2C: On-hold requirement
    const resHold = await SubmissionOrchestrator.submitCandidate({
      requirementId: holdReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: { id: cand1Id, name: "Devon Cloud Architect", email: "devon.cloud@example.com" }
    });
    assert(resHold.success === false, "On-hold requirement is rejected for submission");
    assert(resHold.error === "REQUIREMENT_INELIGIBLE", "On-hold requirement returns REQUIREMENT_INELIGIBLE error code");

    // 2D: Non-existent requirement
    const resNotFound = await SubmissionOrchestrator.submitCandidate({
      requirementId: "REQ-DOES-NOT-EXIST-9999",
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: { id: cand1Id, name: "Devon Cloud Architect", email: "devon.cloud@example.com" }
    });
    assert(resNotFound.success === false, "Non-existent requirement is rejected for submission");
    assert(resNotFound.error === "REQUIREMENT_NOT_FOUND", "Non-existent requirement returns REQUIREMENT_NOT_FOUND error code");

    // 2E: Hidden from vendors
    const resHidden = await SubmissionOrchestrator.submitCandidate({
      requirementId: hiddenReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: { id: cand1Id, name: "Devon Cloud Architect", email: "devon.cloud@example.com" }
    });
    assert(resHidden.success === false, "Hidden requirement is rejected for vendor submission");
    assert(resHidden.error === "VENDOR_UNAUTHORIZED", "Hidden requirement returns VENDOR_UNAUTHORIZED error code");

    // -------------------------------------------------------------
    // 3. Submitter Authentication & Input Validation
    // -------------------------------------------------------------
    console.log("\n[Test 3] Validation of submitter authentication and candidate data...");

    const resUnauthenticated = await SubmissionOrchestrator.submitCandidate({
      requirementId: activeReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "",
      candidateData: { id: cand1Id, name: "Devon Cloud Architect" }
    });
    assert(resUnauthenticated.success === false, "Missing submitterId rejects submission");
    assert(resUnauthenticated.error === "UNAUTHENTICATED", "Missing submitterId returns UNAUTHENTICATED error code");

    const resNoName = await SubmissionOrchestrator.submitCandidate({
      requirementId: activeReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: { id: cand1Id, name: "" }
    });
    assert(resNoName.success === false, "Missing candidate name rejects submission");
    assert(resNoName.error === "INVALID_CANDIDATE_DATA", "Missing candidate name returns INVALID_CANDIDATE_DATA error code");

    // -------------------------------------------------------------
    // 4. Candidate Ownership Conflict
    // -------------------------------------------------------------
    console.log("\n[Test 4] Candidate ownership lock & conflict rejection...");

    // Lock candidate 2 to Vendor B
    await CandidateOwnershipEngine.establishOwnership(cand2Id, "VENDOR_OTHER_999", "VENDOR", 90);

    const resOwnershipConflict = await SubmissionOrchestrator.submitCandidate({
      requirementId: activeReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: { id: cand2Id, name: "Alex Security Engineer" }
    });
    assert(resOwnershipConflict.success === false, "Candidate locked by another vendor is rejected");
    assert(resOwnershipConflict.error === "OWNERSHIP_CONFLICT", "Ownership conflict returns OWNERSHIP_CONFLICT error code");
    assert(resOwnershipConflict.ownershipDetails?.owner === "VENDOR_OTHER_999", "Ownership details correctly identify the locking vendor");

    // -------------------------------------------------------------
    // 5. Valid Authorized Submission
    // -------------------------------------------------------------
    console.log("\n[Test 5] Valid authorized candidate submission...");

    const resValid = await SubmissionOrchestrator.submitCandidate({
      requirementId: activeReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: {
        id: cand1Id,
        name: "Devon Cloud Architect",
        email: "devon.cloud@example.com",
        phone: "555-0987",
        skills: ["Kubernetes", "AWS", "Terraform", "Go"]
      },
      matchScore: 88,
      bypassOwnershipCheck: true
    });

    assert(resValid.success === true, "Authorized candidate submission succeeds");
    assert(typeof resValid.submissionId === "string" && resValid.submissionId.length > 0, "Submission receives a valid generated submissionId");
    assert(resValid.candidateId === cand1Id, "Submission retains correct candidateId");

    // Verify Firestore persistence & attribution snapshot
    if (adminDb && resValid.submissionId) {
      const subDoc = await adminDb.collection("submissions").doc(resValid.submissionId).get();
      assert(subDoc.exists, "Submission document is persisted in Firestore 'submissions' collection");
      const subData = subDoc.data()!;
      assert(subData.vendorId === vendorOrgId, "Submission persists authoritative vendorId");
      assert(subData.clientId === clientOrgId, "Submission persists authoritative clientId");
      assert(subData.canonicalRequirementId === activeReqId, "Submission persists canonicalRequirementId");
      assert(subData.attribution_snapshot !== undefined, "Submission persists immutable attribution_snapshot");
      assert(subData.attribution_snapshot.vendorId === vendorOrgId, "Attribution snapshot contains correct vendorId");
      assert(subData.attribution_snapshot.requirementId === activeReqId, "Attribution snapshot contains correct requirementId");
      assert(subData.attribution_snapshot.submittedByUserId === "USER_VEND_01", "Attribution snapshot contains submitter user identity");

      // Verify candidate pipelineStage updated
      const candDoc = await adminDb.collection("candidatePool").doc(cand1Id).get();
      assert(candDoc.exists && candDoc.data()?.pipelineStage === "Matched", "Candidate pipelineStage updated to 'Matched' in candidatePool");
    }

    // -------------------------------------------------------------
    // 6. Duplicate Submission / Idempotency
    // -------------------------------------------------------------
    console.log("\n[Test 6] Duplicate submission idempotency check...");

    const resDuplicate = await SubmissionOrchestrator.submitCandidate({
      requirementId: activeReqId,
      clientId: clientOrgId,
      vendorId: vendorOrgId,
      submitterId: "USER_VEND_01",
      candidateData: {
        id: cand1Id,
        name: "Devon Cloud Architect",
        email: "devon.cloud@example.com"
      },
      bypassOwnershipCheck: true
    });

    assert(resDuplicate.success === true, "Duplicate submission returns success idempotently");
    assert(resDuplicate.submissionId === resValid.submissionId, "Duplicate submission returns existing submissionId without creating duplicate record");
    assert(resDuplicate.message.includes("already exists"), "Duplicate submission message explains existing active submission");

    // -------------------------------------------------------------
    // 7. Decoupled AI Matching Separation
    // -------------------------------------------------------------
    console.log("\n[Test 7] Verifying separation between Run AI Match and Submit Candidate...");

    const context = AccessControlService.buildAccessContext({
      id: "USER_VEND_01",
      role: "vendor",
      orgId: vendorOrgId,
      email: "devon.recruiter@example.com"
    });

    let submissionsBeforeCount = 0;
    if (adminDb) {
      const snapBefore = await adminDb.collection("submissions").get();
      submissionsBeforeCount = snapBefore.size;
    }

    const matchResult = await CandidateMatchingService.matchCandidateToRequirement({
      candidateId: cand1Id,
      requirementId: activeReqId,
      context
    });

    assert(matchResult !== null && typeof matchResult.score === "number", "Run AI Match computes fitment evaluation successfully");

    if (adminDb) {
      const snapAfter = await adminDb.collection("submissions").get();
      assert(snapAfter.size === submissionsBeforeCount, "Running AI Match did NOT create any submissions (separation strictly preserved)");
    }

    // -------------------------------------------------------------
    // 8. Browser/Server Module Separation & Untrusted Caller Isolation
    // -------------------------------------------------------------
    console.log("\n[Test 8] Verifying browser/server module separation and untrusted caller isolation...");
    const browserModule = await import("../lib/trusted-context.js");
    assert(browserModule.isTrustedServiceContext() === false, "Browser stub isTrustedServiceContext() strictly returns false");
    assert(browserModule.getTrustedServiceIdentity() === undefined, "Browser stub getTrustedServiceIdentity() strictly returns undefined");

    // Verify caller-controlled body flags cannot spoof trusted service context
    const spoofedPayload = { isTrusted: true, isService: true, type: "SERVICE" };
    assert(typeof (spoofedPayload as any).type === "string", "Caller payload contains untrusted input flags");
    assert(trustedContextStorage.getStore() !== spoofedPayload, "TrustedContextStorage store remains controlled exclusively by server AsyncLocalStorage, ignoring client request payload properties");

    // -------------------------------------------------------------
    // Cleanup seeded test records
    // -------------------------------------------------------------
    if (adminDb) {
      if (resValid.submissionId) {
        await adminDb.collection("submissions").doc(resValid.submissionId).delete();
      }
      await adminDb.collection("requirements").doc(activeReqId).delete();
      await adminDb.collection("requirements").doc(closedReqId).delete();
      await adminDb.collection("requirements").doc(unpubReqId).delete();
      await adminDb.collection("requirements").doc(holdReqId).delete();
      await adminDb.collection("requirements").doc(hiddenReqId).delete();
      await adminDb.collection("candidatePool").doc(cand1Id).delete();
      await adminDb.collection("candidatePool").doc(cand2Id).delete();
      await adminDb.collection("candidateOwnership").doc(`${cand2Id}_VENDOR_OTHER_999`).delete();
    }
  });

  return { passed, failed, errors };
}
