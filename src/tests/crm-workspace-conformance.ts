import { CRMService, CRMOpportunityEntity, ClientService, RequirementService } from "../core/services/index.js";
import { HireNestAccessContext, CoreAuthorizationError } from "../core/types.js";
import { getPermissionsForRole } from "../lib/rbac.js";

export async function runCRMConformanceTests(): Promise<{ passed: number; failed: number; errors: string[] }> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      passed++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      failed++;
      errors.push(`Assertion failed: ${testName}`);
      console.error(`❌ [FAIL] ${testName}`);
    }
  };

  console.log("=================================================");
  console.log("⚡ RUNNING HIRENEST CRM CONFORMANCE TEST SUITE ⚡");
  console.log("=================================================");

  // Contexts for test
  const platformCtx: HireNestAccessContext = {
    uid: "usr-platform-01",
    email: "authority@hirenest.os",
    role: "PLATFORM_AUTHORITY",
    organizationId: "ORG-GLOBAL-HQ",
    permissions: getPermissionsForRole("PLATFORM_AUTHORITY"),
    isAdminEquivalent: true,
    status: "ACTIVE",
  };

  const bizOpsCtx: HireNestAccessContext = {
    uid: "usr-bizops-01",
    email: "bizops@hirenest.os",
    role: "BUSINESS_OPERATIONS",
    organizationId: "ORG-GLOBAL-HQ",
    permissions: getPermissionsForRole("BUSINESS_OPERATIONS"),
    isAdminEquivalent: true,
    status: "ACTIVE",
  };

  const vendorRecruiterCtx: HireNestAccessContext = {
    uid: "usr-vrec-01",
    email: "recruiter@apexstaffing.com",
    role: "VENDOR_RECRUITER",
    organizationId: "ORG-V-APEX",
    vendorId: "ORG-V-APEX",
    permissions: getPermissionsForRole("VENDOR_RECRUITER"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const clientAdminCtx: HireNestAccessContext = {
    uid: "usr-client-01",
    email: "admin@acmecloud.io",
    role: "CLIENT_ADMIN",
    organizationId: "CLIENT-ACME",
    clientId: "CLIENT-ACME",
    permissions: getPermissionsForRole("CLIENT_ADMIN"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  // 1. Create & Read Opportunity via Business Operations
  try {
    const createdOpp = await CRMService.createOrUpdateOpportunity(bizOpsCtx, {
      clientId: "CLIENT-ACME",
      clientName: "Acme Cloud Technologies",
      title: "10x Senior Full-Stack Pod",
      stage: "DISCOVERY",
      dealValue: 150000,
      probability: 70,
      targetRoles: ["React", "TypeScript", "Node.js"],
      positionsCount: 5,
    });

    assert(createdOpp.id.startsWith("OPP-"), "1. Opportunity ID correctly generated with OPP- prefix");
    assert(createdOpp.expectedRevenue === 105000, "2. Expected Revenue mathematically calculated (150000 * 70%)");
    assert(createdOpp.stage === "DISCOVERY", "3. Initial opportunity stage set to DISCOVERY");
  } catch (err: any) {
    assert(false, `1-3. Create opportunity failed: ${err.message}`);
  }

  // 2. Vendor RBAC Restriction on Commercials
  try {
    let denied = false;
    try {
      await CRMService.createOrUpdateOpportunity(vendorRecruiterCtx, {
        clientId: "CLIENT-ACME",
        title: "Unauthorized Opp",
        dealValue: 50000,
      });
    } catch (e: any) {
      if (e instanceof CoreAuthorizationError || e.code === "CORE_PERMISSION_DENIED") {
        denied = true;
      }
    }
    assert(denied, "4. Vendor Recruiter blocked from managing CRM Commercial Opportunities (RBAC isolated)");
  } catch (err: any) {
    assert(false, `4. Vendor restriction check failed: ${err.message}`);
  }

  // 3. Contacts Management
  try {
    const contact = await CRMService.createOrUpdateContact(bizOpsCtx, {
      clientId: "CLIENT-ACME",
      clientName: "Acme Cloud Technologies",
      name: "Sarah Jenkins",
      title: "VP of Engineering",
      email: "s.jenkins@acmecloud.io",
      decisionAuthority: "PRIMARY_DECISION_MAKER",
      sentiment: "CHAMPION",
    });

    assert(contact.id.startsWith("CTC-"), "5. CRM Contact ID created with CTC- prefix");
    assert(contact.decisionAuthority === "PRIMARY_DECISION_MAKER", "6. Decision authority schema correctly mapped");
  } catch (err: any) {
    assert(false, `5-6. Contact creation failed: ${err.message}`);
  }

  // 4. AI SDR Draft Generation (Human-in-the-Loop Governance)
  try {
    const sdrDraft = await CRMService.generateSDRDraft(bizOpsCtx, {
      clientId: "CLIENT-ACME",
      clientName: "Acme Cloud Technologies",
      contactName: "Sarah Jenkins",
      contactEmail: "s.jenkins@acmecloud.io",
      targetTech: ["React", "TypeScript", "Node.js"],
    });

    assert(sdrDraft.id.startsWith("OUT-"), "7. AI SDR Draft ID generated with OUT- prefix");
    assert(sdrDraft.approvalStatus === "PENDING_REVIEW", "8. AI SDR Draft requires Human-in-the-Loop approval (PENDING_REVIEW)");
    assert(sdrDraft.meta.requiresHumanApproval === true, "9. AI SDR Draft metadata enforces requiresHumanApproval: true");

    // Human Approval
    const approvedDraft = await CRMService.approveOutreachDraft(bizOpsCtx, sdrDraft.id, "APPROVE");
    assert(approvedDraft.approvalStatus === "APPROVED", "10. Human review successfully transitions draft to APPROVED");
    assert(approvedDraft.approvedBy === bizOpsCtx.uid, "11. Audit attribution logged with approver UID");
  } catch (err: any) {
    assert(false, `7-11. AI SDR flow failed: ${err.message}`);
  }

  // 5. CRM Opportunity to Core Requirement Delivery Handoff
  try {
    const oppToHandoff = await CRMService.createOrUpdateOpportunity(platformCtx, {
      clientId: "CLIENT-ACME",
      clientName: "Acme Cloud Technologies",
      title: "Closed Won Senior Tech Pod",
      stage: "CLOSED_WON",
      dealValue: 200000,
      positionsCount: 4,
      targetRoles: ["React", "Node.js"],
    });

    const handoffRes = await CRMService.handoffToDeliveryRequirement(platformCtx, oppToHandoff.id);
    assert(handoffRes.opportunity.stage === "DELIVERY_HANDOFF", "12. Opportunity transitioned to DELIVERY_HANDOFF");
    assert(handoffRes.requirementId.startsWith("HN-REQ-"), "13. Core Requirement created with HN-REQ- prefix");
    assert(handoffRes.opportunity.linkedRequirementId === handoffRes.requirementId, "14. Opportunity bi-directionally linked to Core Requirement");
  } catch (err: any) {
    assert(false, `12-14. Delivery handoff failed: ${err.message}`);
  }

  console.log("=================================================");
  console.log(`CRM CONFORMANCE RESULT: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================");

  return { passed, failed, errors };
}

// Auto-run if executed in tsx/node environment
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("crm-workspace-conformance")) {
  runCRMConformanceTests().then((res) => {
    if (res.failed > 0) {
      process.exit(1);
    }
  });
}
