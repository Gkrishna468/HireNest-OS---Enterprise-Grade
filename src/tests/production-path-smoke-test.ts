import {
  HireNestAccessContext,
  CoreAuthorizationError,
  RequirementPayload,
  CandidatePayload,
  SubmissionPayload,
  InterviewPayload,
  OfferPayload,
  PlacementPayload,
  enforceCoreAccess,
} from "../core/types.js";
import {
  RequirementService,
  Candidate360Service,
  SubmissionService,
  InterviewService,
  OfferPlacementService,
  SLABudgetPerformanceService,
  VendorService,
  ClientService,
} from "../core/services/index.js";
import {
  AUTHORITATIVE_ROLES,
  normalizeRole,
  isRoleAdminEquivalent,
  getPermissionsForRole,
  canActorAssignRole,
} from "../lib/rbac.js";
import {
  CandidateScoringService,
  NextBestActionService,
  HiringSignalService,
  LearningService,
} from "../core/intelligence/index.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`[PASS] ${message}`);
}

async function runProductionPathSmokeTest() {
  console.log("=== HIRENEST OS PHASE 4 PRODUCTION-PATH SMOKE TEST ===\n");

  // 1. Session Context & 7-Role Resolution
  console.log("--- 1. Identity & 7-Role Matrix Verification ---");
  const verifiedRoles = AUTHORITATIVE_ROLES;
  assert(verifiedRoles.length === 7, "Exactly 7 Authoritative Roles defined");

  // Define mock contexts for all 7 roles
  const platformAuthorityCtx: HireNestAccessContext = {
    uid: "usr-platform-auth",
    email: "authority@hirenest.os",
    role: "PLATFORM_AUTHORITY",
    organizationId: "ORG-GLOBAL-HQ",
    permissions: getPermissionsForRole("PLATFORM_AUTHORITY"),
    isAdminEquivalent: true,
    status: "ACTIVE",
  };

  const bizOpsCtx: HireNestAccessContext = {
    uid: "usr-biz-ops",
    email: "ops@hirenest.os",
    role: "BUSINESS_OPERATIONS",
    organizationId: "ORG-GLOBAL-HQ",
    permissions: getPermissionsForRole("BUSINESS_OPERATIONS"),
    isAdminEquivalent: true,
    status: "ACTIVE",
  };

  const clientAdminCtx: HireNestAccessContext = {
    uid: "usr-client-admin",
    email: "admin@acme.corp",
    role: "CLIENT_ADMIN",
    organizationId: "CLIENT_ACME",
    clientId: "CLIENT_ACME",
    permissions: getPermissionsForRole("CLIENT_ADMIN"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const clientHmCtx: HireNestAccessContext = {
    uid: "usr-client-hm",
    email: "hm@acme.corp",
    role: "CLIENT_HM",
    organizationId: "CLIENT_ACME",
    clientId: "CLIENT_ACME",
    permissions: getPermissionsForRole("CLIENT_HM"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const clientFinanceCtx: HireNestAccessContext = {
    uid: "usr-client-fin",
    email: "finance@acme.corp",
    role: "CLIENT_FINANCE",
    organizationId: "CLIENT_ACME",
    clientId: "CLIENT_ACME",
    permissions: getPermissionsForRole("CLIENT_FINANCE"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const vendorAdminCtx: HireNestAccessContext = {
    uid: "usr-vendor-admin-a",
    email: "admin@talentcraft.io",
    role: "VENDOR_ADMIN",
    organizationId: "VENDOR_ALPHA",
    vendorId: "VENDOR_ALPHA",
    permissions: getPermissionsForRole("VENDOR_ADMIN"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const vendorRecruiterCtx: HireNestAccessContext = {
    uid: "usr-vendor-recruiter-a1",
    email: "recruiter1@talentcraft.io",
    role: "VENDOR_RECRUITER",
    organizationId: "VENDOR_ALPHA",
    vendorId: "VENDOR_ALPHA",
    permissions: getPermissionsForRole("VENDOR_RECRUITER"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const inactiveUserCtx: HireNestAccessContext = {
    uid: "usr-deactivated",
    email: "inactive@hirenest.os",
    role: "VENDOR_RECRUITER",
    organizationId: "VENDOR_ALPHA",
    vendorId: "VENDOR_ALPHA",
    permissions: getPermissionsForRole("VENDOR_RECRUITER"),
    isAdminEquivalent: false,
    status: "INACTIVE",
  };

  // Check Inactive User Rejection
  try {
    enforceCoreAccess(inactiveUserCtx, "requirements.read");
    assert(false, "Inactive user must be blocked");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Inactive user correctly blocked from all operations");
  }

  // 2. User Administration & Role Assignment Governance
  console.log("\n--- 2. User Administration & RBAC Assignment ---");
  assert(canActorAssignRole("PLATFORM_AUTHORITY", "BUSINESS_OPERATIONS") === true, "Platform Authority can assign Business Operations");
  assert(canActorAssignRole("BUSINESS_OPERATIONS", "CLIENT_ADMIN") === true, "Business Operations can assign Client Admin");
  assert(canActorAssignRole("VENDOR_ADMIN", "VENDOR_RECRUITER") === true, "Vendor Admin can assign Vendor Recruiter");
  assert(canActorAssignRole("VENDOR_ADMIN", "CLIENT_ADMIN") === false, "Vendor Admin CANNOT assign Client Admin (Deliberate 403)");
  assert(canActorAssignRole("CLIENT_ADMIN", "VENDOR_ADMIN") === false, "Client Admin CANNOT assign Vendor Admin (Deliberate 403)");
  assert(canActorAssignRole("VENDOR_RECRUITER", "VENDOR_ADMIN") === false, "Vendor Recruiter CANNOT assign roles (Deliberate 403)");

  // 3. Vendor Recruiter Management Hierarchy
  console.log("\n--- 3. Vendor Recruiter Hierarchy & Tenant Isolation ---");
  try {
    await VendorService.assertCanManageRecruiter(vendorAdminCtx, "VENDOR_ALPHA");
    assert(true, "Vendor Admin Alpha can manage Recruiters within VENDOR_ALPHA");
  } catch (e) {
    assert(false, "Vendor Admin Alpha should manage own recruiters");
  }

  try {
    await VendorService.assertCanManageRecruiter(vendorAdminCtx, "VENDOR_BETA");
    assert(false, "Vendor Admin Alpha must be blocked from VENDOR_BETA");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Vendor Admin Alpha blocked from managing VENDOR_BETA recruiters (Cross-tenant ABAC Blocked)");
  }

  // 4. Requirements Lifecycle & Distribution Tiers
  console.log("\n--- 4. Requirements Lifecycle & Tiers ---");
  // Client Admin can create requirement for own organization
  const reqPayload: RequirementPayload = {
    title: "Senior Full Stack Engineer",
    clientId: "CLIENT_ACME",
    clientName: "Acme Corp",
    requiredSkills: ["React", "TypeScript", "Node.js"],
    minExperienceYears: 5,
    budgetMin: 120000,
    budgetMax: 160000,
    currency: "USD",
    location: "Remote",
    distributionTier: "TIER_1_EXCLUSIVE",
    status: "ACTIVE",
  };

  // Vendor Recruiter CANNOT create requirement (Forbidden operation)
  try {
    enforceCoreAccess(vendorRecruiterCtx, "requirements.create", { clientId: "CLIENT_ACME" });
    assert(false, "Vendor Recruiter must not have requirements.create permission");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Vendor Recruiter forbidden from creating requirements");
  }

  // Client Admin CANNOT create requirement for another client (Cross-client boundary)
  try {
    enforceCoreAccess(clientAdminCtx, "requirements.create", { clientId: "CLIENT_OTHER" });
    assert(false, "Client Admin must not create requirement for CLIENT_OTHER");
  } catch (e: any) {
    assert(e instanceof CoreAuthorizationError, "Client Admin blocked from creating requirement for non-owned client");
  }

  // Client Admin can create for own client
  try {
    enforceCoreAccess(clientAdminCtx, "requirements.create", { clientId: "CLIENT_ACME" });
    assert(true, "Client Admin allowed to create requirements for CLIENT_ACME");
  } catch (e) {
    assert(false, "Client Admin should be allowed for own client");
  }

  // 5. Candidate 360 Privacy & Contact Redaction
  console.log("\n--- 5. Candidate 360 Privacy & Masking ---");
  const testCandidate = {
    id: "CAND-001",
    name: "Jane Doe",
    email: "jane.doe@example.com",
    phone: "+1-555-0199",
    skills: ["React", "Node.js"],
    experienceYears: 6,
    vendorId: "VENDOR_ALPHA",
    status: "AVAILABLE",
  };

  // Vendor Alpha sees full candidate data
  const ownView = Candidate360Service.redactCandidateForViewer(vendorRecruiterCtx, testCandidate);
  assert(ownView.email === "jane.doe@example.com", "Owning vendor recruiter sees candidate direct email");

  // Other vendor recruiter sees redacted contact details
  const vendorBetaRecruiterCtx: HireNestAccessContext = {
    uid: "usr-vendor-recruiter-b1",
    email: "recruiter@betastaffing.com",
    role: "VENDOR_RECRUITER",
    organizationId: "VENDOR_BETA",
    vendorId: "VENDOR_BETA",
    permissions: getPermissionsForRole("VENDOR_RECRUITER"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };
  const otherView = Candidate360Service.redactCandidateForViewer(vendorBetaRecruiterCtx, testCandidate);
  assert(otherView.email === undefined || otherView.email === "[PROTECTED / VENDOR_MASKED]", "Non-owning vendor recruiter receives redacted contact info");
  assert(otherView.phone === undefined || otherView.phone === "[PROTECTED / VENDOR_MASKED]", "Non-owning vendor recruiter receives redacted phone");

  // 6. Submissions & Stage Progression
  console.log("\n--- 6. Submissions, Interviews, Offers & Placements ---");
  // Vendor Recruiter can create submission with permission
  assert(vendorRecruiterCtx.permissions.includes("submissions.create"), "Vendor Recruiter has submissions.create permission");
  
  // Client Finance CANNOT create submissions or schedule interviews
  assert(!clientFinanceCtx.permissions.includes("submissions.create"), "Client Finance cannot create submissions");
  assert(!clientFinanceCtx.permissions.includes("interviews.create"), "Client Finance cannot create interviews");
  assert(clientFinanceCtx.permissions.includes("budgets.manage"), "Client Finance has budgets.manage permission");
  assert(clientFinanceCtx.permissions.includes("commercials.read"), "Client Finance has commercials.read permission");

  // 7. AI Advisory Governance (Human in the Loop)
  console.log("\n--- 7. AI Advisory Contracts & Human Approval ---");
  const signals = await HiringSignalService.detectHiringSignals(bizOpsCtx, "Acme Corp");
  assert(signals.meta.kind === "ANALYZE", "Signals output conforms to 'ANALYZE' metadata kind");
  assert(signals.meta.requiresHumanApproval === false, "Read-only signal analysis does not require mutation approval");

  const nba = await NextBestActionService.getNextBestActions(bizOpsCtx);
  assert(nba.meta.kind === "RECOMMEND", "Next Best Action conforms to 'RECOMMEND' metadata kind");
  assert(nba.meta.requiresHumanApproval === true, "Operational recommendation explicitly mandates human approval gate");
  assert(nba.approvalStatus === "PENDING_REVIEW", "Initial recommendation status is PENDING_REVIEW (No direct autonomous mutation)");

  console.log("\n=== ALL PRODUCTION PATH SMOKE TESTS COMPLETED SUCCESSFULLY ===");
}

runProductionPathSmokeTest().catch((err) => {
  console.error("SMOKE TEST FAILED:", err);
  process.exit(1);
});
