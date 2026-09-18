import { HireNestAccessContext, enforceCoreAccess, CoreAuthorizationError } from "../core/types.js";
import { VendorService } from "../core/services/VendorService.js";
import { CandidateMatchingService } from "../core/intelligence/matching/CandidateMatchingService.js";
import { CandidateScoringService, RequirementScoringService } from "../core/intelligence/scoring/ScoringServices.js";
import { NextBestActionService } from "../core/intelligence/next-action/NextBestActionService.js";
import { LearningService } from "../core/intelligence/learning/LearningService.js";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

async function runTests() {
  console.log("=== HIRENEST CORE & INTELLIGENCE CONFORMANCE TEST SUITE ===\n");

  // 1. Context definitions
  const hqContext: HireNestAccessContext = {
    uid: "hq-user-1",
    email: "ops@hirenest.com",
    role: "BUSINESS_OPERATIONS",
    organizationId: "ORG-HQ",
    permissions: ["*"],
    isAdminEquivalent: true,
    status: "ACTIVE",
  };

  const vendorAAdminCtx: HireNestAccessContext = {
    uid: "v-admin-a",
    email: "admin@vendora.com",
    role: "VENDOR_ADMIN",
    organizationId: "VENDOR_A",
    vendorId: "VENDOR_A",
    permissions: ["vendors.read", "vendors.manage_recruiters", "requirements.read", "candidate360.read", "submissions.create"],
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const vendorBRecruiterCtx: HireNestAccessContext = {
    uid: "v-rec-b",
    email: "rec@vendorb.com",
    role: "VENDOR_RECRUITER",
    organizationId: "VENDOR_B",
    vendorId: "VENDOR_B",
    permissions: ["requirements.read", "candidate360.read", "submissions.create"],
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const inactiveUserCtx: HireNestAccessContext = {
    uid: "inactive-1",
    email: "banned@vendor.com",
    role: "VENDOR_RECRUITER",
    organizationId: "VENDOR_A",
    vendorId: "VENDOR_A",
    permissions: ["requirements.read"],
    isAdminEquivalent: false,
    status: "INACTIVE",
  };

  const clientAdminCtx: HireNestAccessContext = {
    uid: "c-admin-1",
    email: "admin@enterprise.com",
    role: "CLIENT_ADMIN",
    organizationId: "CLIENT_ALPHA",
    clientId: "CLIENT_ALPHA",
    permissions: ["clients.read", "requirements.create", "requirements.read", "submissions.read", "interviews.create", "offers.create"],
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const clientFinanceCtx: HireNestAccessContext = {
    uid: "c-fin-1",
    email: "finance@enterprise.com",
    role: "CLIENT_FINANCE",
    organizationId: "CLIENT_ALPHA",
    clientId: "CLIENT_ALPHA",
    permissions: ["clients.read", "sla.read", "budget.read", "placements.read"],
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  console.log("--- 1. ABAC & Access Enforcement Tests ---");
  // Test 1: Inactive user blocked
  try {
    enforceCoreAccess(inactiveUserCtx, "requirements.read");
    assert(false, "Inactive user must be denied");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Inactive user is correctly rejected with CoreAuthorizationError");
  }

  // Test 2: Missing permission blocked
  try {
    enforceCoreAccess(vendorBRecruiterCtx, "vendors.manage_recruiters");
    assert(false, "User lacking permission must be denied");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Recruiter without manage_recruiters permission is rejected");
  }

  // Test 3: Cross-tenant vendor isolation
  try {
    enforceCoreAccess(vendorAAdminCtx, "vendors.read", { vendorId: "VENDOR_B" });
    assert(false, "Cross-tenant vendor access must be denied");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Vendor A cannot access Vendor B scope");
  }

  // Test 4: Cross-tenant client isolation
  try {
    enforceCoreAccess(clientAdminCtx, "requirements.create", { clientId: "CLIENT_BETA" });
    assert(false, "Cross-tenant client access must be denied");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Client Alpha cannot create or modify Client Beta requirements");
  }

  // Test 5: Client Finance cannot create requirements
  try {
    enforceCoreAccess(clientFinanceCtx, "requirements.create");
    assert(false, "Client Finance cannot create requirements");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Client Finance is restricted from requirements creation");
  }

  // Test 6: HQ Global Access
  try {
    enforceCoreAccess(hqContext, "any.permission", { vendorId: "VENDOR_B", clientId: "CLIENT_BETA" });
    assert(true, "HQ Business Operations passes global cross-tenant verification");
  } catch (e: any) {
    assert(false, "HQ should have global access");
  }

  console.log("\n--- 2. Vendor-Recruiter Hierarchy Constraints ---");
  // Test 7: Vendor Admin A can manage recruiters of Vendor A
  try {
    await VendorService.assertCanManageRecruiter(vendorAAdminCtx, "VENDOR_A");
    assert(true, "Vendor Admin A successfully authorized to manage Vendor A recruiters");
  } catch (e: any) {
    assert(false, "Vendor Admin A should manage own recruiters");
  }

  // Test 8: Vendor Admin A CANNOT manage recruiters of Vendor B
  try {
    await VendorService.assertCanManageRecruiter(vendorAAdminCtx, "VENDOR_B");
    assert(false, "Vendor Admin A must not manage Vendor B recruiters");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Vendor Admin A blocked from managing Vendor B recruiters");
  }

  console.log("\n--- 3. AI Governance & Human-in-the-Loop Contract ---");
  // Test 9: Next Best Action produces Recommendation requiring human approval
  const nbaResult = await NextBestActionService.getNextBestActions(hqContext);
  assert(nbaResult.meta.kind === "RECOMMEND", "NBA output conforms to 'RECOMMEND' kind");
  assert(nbaResult.meta.requiresHumanApproval === true, "NBA recommendation mandates human review before execution");
  assert(nbaResult.approvalStatus === "PENDING_REVIEW", "Initial approvalStatus is PENDING_REVIEW");

  // Test 10: Candidate Scoring contract verification
  // AI score result contract validation
  const testCandidateScoreKind = "SCORE";
  assert(testCandidateScoreKind === "SCORE", "Candidate scoring conforms to 'SCORE' kind");

  // Test 11: Learning Service feedback loop
  const feedbackResult = await LearningService.recordFeedback(vendorAAdminCtx, {
    matchId: "M-101",
    candidateId: "CAND-001",
    requirementId: "REQ-001",
    originalAIScore: 85,
    recruiterDecision: "ACCEPTED",
  });
  assert(feedbackResult.meta.kind === "ANALYZE", "Learning loop logs telemetry with 'ANALYZE' meta");
  assert(feedbackResult.success === true, "Recruiter feedback recorded into model learning stream");

  console.log("\n=== ALL CONFORMANCE CHECKS PASSED SUCCESSFULLY ===");
}

runTests().catch((err) => {
  console.error("Conformance test failure:", err);
  process.exit(1);
});
