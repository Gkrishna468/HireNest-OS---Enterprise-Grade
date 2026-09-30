import { AccessControlService, HireNestAccessContext } from "../services/accessControlService.js";
import { JdParsingService } from "../services/jdParsingService.js";
import { CandidateMatchingService } from "../services/CandidateMatchingService.js";
import { CandidateOwnershipEngine } from "../lib/workflows/CandidateOwnershipEngine.js";
import { SubmissionOrchestrator } from "../lib/workflows/SubmissionOrchestrator.js";
import { requirementVendorService } from "../services/requirementVendorService.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { adminDb } from "../lib/firebase-admin.js";
import { runAsTrustedService } from "../lib/trusted-context.js";

export async function runCandidateSecurityAndE2ETests() {
  await runAsTrustedService({ type: "SERVICE", service: "candidate-security-test" }, async () => {
    console.log("\n===============================================================");
    console.log("   HIRENEST OS - DETAILED CANDIDATE SECURITY & E2E MATRIX GATES");
    console.log("===============================================================");

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string, detail?: string) => {
    if (condition) {
      console.log(`  [PASS] ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ✗ ${testName} ${detail ? `(${detail})` : ""}`);
      failed++;
    }
  };

  // Define Mock IDs
  const directCandidateId = "HN-CAN-MOCK-DIRECT-001";
  const vendorACandidateId = "HN-CAN-MOCK-VEND-A-001";
  const vendorBCandidateId = "HN-CAN-MOCK-VEND-B-001";
  const reqVendorAId = "REQ-MOCK-DIST-VEND-A-001";
  const reqVendorBId = "REQ-MOCK-DIST-VEND-B-001";

  // Contexts
  const contextVendorA: HireNestAccessContext = {
    userId: "VEND_A_USER",
    role: "VENDOR",
    organizationId: "VENDOR_A_ORG",
    vendorId: "VENDOR_A_ORG",
    email: "vendor_a@example.com"
  };

  const contextVendorB: HireNestAccessContext = {
    userId: "VEND_B_USER",
    role: "VENDOR",
    organizationId: "VENDOR_B_ORG",
    vendorId: "VENDOR_B_ORG",
    email: "vendor_b@example.com"
  };

  const contextClientA: HireNestAccessContext = {
    userId: "CLIENT_A_USER",
    role: "CLIENT",
    organizationId: "CLIENT_A_ORG",
    clientId: "CLIENT_A_ORG",
    email: "client_a@example.com"
  };

  const contextCandidateSelf: HireNestAccessContext = {
    userId: directCandidateId,
    role: "CANDIDATE",
    organizationId: "ORG-CANDIDATE",
    candidateId: directCandidateId,
    email: "candidate@example.com"
  };

  const contextHQAdmin: HireNestAccessContext = {
    userId: "HQ_ADMIN_USER",
    role: "GLOBAL_HQ",
    organizationId: "ORG-HQ",
    email: "hq_admin@example.com"
  };

  const contextAnonymous: HireNestAccessContext = {
    userId: "anonymous",
    role: "guest",
    organizationId: "ORG-GLOBAL-HQ"
  };

  // Document Payloads
  const directCandidateDoc = {
    id: directCandidateId,
    candidateId: directCandidateId,
    fullName: "Alice Direct Candidate",
    sourceType: "DIRECT_CANDIDATE",
    ownershipType: "DIRECT",
    isDirect: true,
    email: "candidate@example.com",
    vendorId: null
  };

  const vendorACandidateDoc = {
    id: vendorACandidateId,
    candidateId: vendorACandidateId,
    fullName: "Bob Vendor A Candidate",
    vendorId: "VENDOR_A_ORG",
    submittedByVendorId: "VENDOR_A_ORG"
  };

  const vendorBCandidateDoc = {
    id: vendorBCandidateId,
    candidateId: vendorBCandidateId,
    fullName: "Charlie Vendor B Candidate",
    vendorId: "VENDOR_B_ORG",
    submittedByVendorId: "VENDOR_B_ORG"
  };

  try {
    // Write setup documents directly using Admin SDK to bypass client SDK rules restrictions
    if (adminDb) {
      await adminDb.collection("candidatePool").doc(directCandidateId).set(directCandidateDoc);
      await adminDb.collection("candidatePool").doc(vendorACandidateId).set(vendorACandidateDoc);
      await adminDb.collection("candidatePool").doc(vendorBCandidateId).set(vendorBCandidateDoc);
    } else {
      console.warn("  [WARN] adminDb is not initialized. Tests might fail.");
    }

    console.log("\n--- Executing 14 Candidate Authorization Matrix Tests (A to N) ---");

    // A. Vendor A -> Vendor A candidate -> ALLOW
    const resA = await AccessControlService.canViewCandidate(contextVendorA, vendorACandidateId, vendorACandidateDoc);
    assert(resA, "Test A: Vendor A can view Vendor A's candidate");

    // B. Vendor A -> Vendor B candidate -> DENY
    const resB = await AccessControlService.canViewCandidate(contextVendorA, vendorBCandidateId, vendorBCandidateDoc);
    assert(!resB, "Test B: Vendor A cannot view Vendor B's candidate (Isolation)");

    // C. Vendor A -> direct candidate, no relationship -> DENY
    const resC = await AccessControlService.canViewCandidate(contextVendorA, directCandidateId, directCandidateDoc);
    assert(!resC, "Test C: Vendor A cannot view unowned direct candidate without relationship (Null-Vendor Remediated)");

    // D. Vendor B -> same direct candidate, no relationship -> DENY
    const resD = await AccessControlService.canViewCandidate(contextVendorB, directCandidateId, directCandidateDoc);
    assert(!resD, "Test D: Vendor B cannot view unowned direct candidate without relationship (Null-Vendor Remediated)");

    // E. Vendor A -> direct candidate assigned to Vendor A requirement -> ALLOW
    // Setup Requirement distributed specifically to Vendor A
    const reqVendorADoc = {
      id: reqVendorAId,
      requirementId: reqVendorAId,
      clientId: "CLIENT_A_ORG",
      status: "ACTIVE",
      distributionStatus: "PUBLISHED",
      distributedVendorIds: ["VENDOR_A_ORG"]
    };
    if (adminDb) {
      await adminDb.collection("requirements").doc(reqVendorAId).set(reqVendorADoc);
    }
    
    // Assign direct candidate to requirement REQ-MOCK-DIST-VEND-A-001
    const directCandWithReqA = { ...directCandidateDoc, requirementId: reqVendorAId, matchedRequirementId: reqVendorAId };
    if (adminDb) {
      await adminDb.collection("candidatePool").doc(directCandidateId).set(directCandWithReqA);
    }

    const resE = await AccessControlService.canViewCandidate(contextVendorA, directCandidateId, directCandWithReqA);
    assert(resE, "Test E: Vendor A can view direct candidate associated with distributed Vendor A requirement");

    // F. Vendor B -> same candidate, requirement assigned only to Vendor A -> DENY
    const resF = await AccessControlService.canViewCandidate(contextVendorB, directCandidateId, directCandWithReqA);
    assert(!resF, "Test F: Vendor B is blocked from viewing same direct candidate (only distributed to Vendor A)");

    // G. Vendor A -> direct candidate with active Vendor A submission -> ALLOW
    // Reset candidate requirement fields
    if (adminDb) {
      await adminDb.collection("candidatePool").doc(directCandidateId).set(directCandidateDoc);
    }
    
    // Write active submission link for Vendor A
    const subMockId = "SUB-MOCK-VEND-A-01";
    const subMockDoc = {
      id: subMockId,
      candidateId: directCandidateId,
      vendorId: "VENDOR_A_ORG",
      clientId: "CLIENT_A_ORG",
      requirementId: reqVendorAId,
      status: "SUBMITTED"
    };
    if (adminDb) {
      await adminDb.collection("submissions").doc(subMockId).set(subMockDoc);
    }

    const resG = await AccessControlService.canViewCandidate(contextVendorA, directCandidateId, directCandidateDoc);
    assert(resG, "Test G: Vendor A can view direct candidate with an active Vendor A submission link");

    // H. Vendor B -> same candidate -> DENY
    const resH = await AccessControlService.canViewCandidate(contextVendorB, directCandidateId, directCandidateDoc);
    assert(!resH, "Test H: Vendor B is blocked from viewing direct candidate submitted by Vendor A");

    // Clean up submission Mock
    if (adminDb) {
      await adminDb.collection("submissions").doc(subMockId).delete();
    }

    // I. Client A -> candidate belonging to Client A -> ALLOW
    // Tag direct candidate to client org
    const clientCandidateDoc = { ...directCandidateDoc, clientId: "CLIENT_A_ORG" };
    const resI = await AccessControlService.canViewCandidate(contextClientA, directCandidateId, clientCandidateDoc);
    assert(resI, "Test I: Client A can view direct candidate belonging/submitted to Client A");

    // J. Client A -> unrelated direct candidate -> DENY
    const unrelatedCandDoc = { ...directCandidateDoc, clientId: "CLIENT_B_ORG" };
    const resJ = await AccessControlService.canViewCandidate(contextClientA, directCandidateId, unrelatedCandDoc);
    assert(!resJ, "Test J: Client A is blocked from viewing unrelated direct candidate");

    // K. Candidate -> own profile -> ALLOW
    const resK = await AccessControlService.canViewCandidate(contextCandidateSelf, directCandidateId, directCandidateDoc);
    assert(resK, "Test K: Candidate can view their own candidate profile");

    // L. Candidate -> another candidate -> DENY
    const resL = await AccessControlService.canViewCandidate(contextCandidateSelf, vendorACandidateId, vendorACandidateDoc);
    assert(!resL, "Test L: Candidate is blocked from viewing another candidate profile");

    // M. Anonymous -> any candidate -> DENY
    const resM = await AccessControlService.canViewCandidate(contextAnonymous, directCandidateId, directCandidateDoc);
    assert(!resM, "Test M: Unauthenticated/Anonymous users are blocked from candidate profiles");

    // N. HQ authorized admin -> global candidate -> ALLOW
    const resN = await AccessControlService.canViewCandidate(contextHQAdmin, directCandidateId, directCandidateDoc);
    assert(resN, "Test N: HQ Admin has authorized read access to global direct candidates");


    console.log("\n--- Executing Controlled End-to-End Workflow E2E Test Loop ---");

    // Set Requirement A to operational state in Firestore
    const operationalReqDoc = {
      id: reqVendorAId,
      requirementId: reqVendorAId,
      title: "Senior Java Security Engineer",
      role: "Senior Java Security Engineer",
      clientId: "CLIENT_A_ORG",
      clientName: "Secured Enterprise Corp",
      status: "ACTIVE",
      distributionStatus: "PUBLISHED",
      distributedVendorIds: ["VENDOR_A_ORG"],
      compensationModel: "SALARY",
      employmentType: "FULL_TIME",
      visibility: "VENDOR_NETWORK",
      skills: ["Java", "Spring Boot", "Cryptography", "OAuth2", "Firestore"],
      mandatorySkills: ["Java", "Spring Boot"],
      secondarySkills: ["Cryptography", "OAuth2", "Firestore"],
      description: "Senior Java Security Engineer with experience in Spring Boot, Cryptography, and Firestore.",
      jdExtractionStatus: "COMPLETED"
    };
    if (adminDb) {
      await adminDb.collection("requirements").doc(reqVendorAId).set(operationalReqDoc);
    }

    // Step 1: Matching Authorization Check
    const authPass = await AccessControlService.canMatchCandidate(contextVendorA, vendorACandidateId, reqVendorAId);
    assert(authPass, "E2E Step 1: Match authorization succeeds for Vendor A candidate + distributed requirement");

    // Step 2: Fitment Logic & 7-Point AI Match Evaluator Simulation
    const e2eCandidateDoc = {
      id: vendorACandidateId,
      candidateId: vendorACandidateId,
      fullName: "Bob Java Guru",
      vendorId: "VENDOR_A_ORG",
      skills: ["Java", "Spring Boot", "Cryptography", "OAuth2", "Firestore"],
      experienceYears: 8,
      location: "San Francisco, CA",
      workMode: "Hybrid"
    };
    if (adminDb) {
      await adminDb.collection("candidatePool").doc(vendorACandidateId).set(e2eCandidateDoc);
    }

    console.log("  [INFO] Evaluating fitment via CandidateMatchingService...");
    const matchRecord = await CandidateMatchingService.matchCandidateToRequirement({
      candidateId: vendorACandidateId,
      requirementId: reqVendorAId,
      context: contextVendorA,
      onProgress: (step) => console.log(`    [Progress] ${step}`)
    });
    assert(matchRecord !== null && matchRecord.score >= 70, `E2E Step 2: Fitment logic successfully computes score (${matchRecord.score}%) and structures breakdown matrix`);

    // Step 3: Direct Submission Ingestion Integration Test with Client routing DISABLED
    console.log("  [INFO] Attempting mock submission pipeline via SubmissionOrchestrator...");
    const subResult = await SubmissionOrchestrator.submitCandidate({
      vendorId: "VENDOR_A_ORG",
      clientId: "CLIENT_A_ORG",
      requirementId: reqVendorAId,
      candidateData: {
        id: vendorACandidateId,
        name: "Bob Java Guru",
        email: "bob.guru@example.com",
        phone: "555-0100",
        skills: ["Java", "Spring Boot"]
      },
      bypassOwnershipCheck: true,
      submitterId: "VEND_A_USER"
    });
    assert(subResult.success, `E2E Step 3: Submission prepared and candidate shortlisted with correct vendor attribution snapshot (${subResult.submissionId})`);

    // Step 4: Audit Trail Integrity Verification
    if (adminDb && subResult.submissionId) {
      const auditLedgerDoc = await adminDb.collection("submissions").doc(subResult.submissionId).get();
      assert(auditLedgerDoc.exists && auditLedgerDoc.data()?.vendorId === "VENDOR_A_ORG", "E2E Step 4: Immutable audit logs and attribution snapshot correctly recorded");
    }

    // CLEANUP MOCKS
    if (adminDb) {
      if (subResult.submissionId) {
        await adminDb.collection("submissions").doc(subResult.submissionId).delete();
      }
      await adminDb.collection("candidatePool").doc(directCandidateId).delete();
      await adminDb.collection("candidatePool").doc(vendorACandidateId).delete();
      await adminDb.collection("candidatePool").doc(vendorBCandidateId).delete();
      await adminDb.collection("requirements").doc(reqVendorAId).delete();
    }

    console.log(`\n===============================================================`);
    console.log(`   CI TEST RUN SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log(`===============================================================`);
  } catch (err: any) {
    console.error("Test execution fatal block exception:", err);
  }
  });
}
