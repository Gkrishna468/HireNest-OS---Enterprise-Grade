import {
  ClientService,
  CRMService,
  RequirementService,
  Candidate360Service,
  SubmissionService,
  InterviewService,
  OfferService,
  PlacementService,
  SLAService,
  BudgetService,
  PerformanceService,
} from "../core/services";
import { AccountIntelligenceService, CandidateMatchingService } from "../core/intelligence";
import { HireNestAccessContext, CoreAuthorizationError } from "../core/types";
import { getPermissionsForRole } from "../lib/rbac";

export async function runEndToEndBusinessLifecycleTest(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
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

  console.log("================================================================================");
  console.log("🏛️  HIRENEST WORKFORCE: END-TO-END BUSINESS LIFECYCLE & INTEGRATION AUDIT  🏛️");
  console.log("================================================================================");

  // Authoritative Contexts for the 7 Roles
  const platformCtx: HireNestAccessContext = {
    uid: "usr-platform-001",
    email: "platform.chief@hirenest.os",
    role: "PLATFORM_AUTHORITY",
    organizationId: "ORG-GLOBAL-HQ",
    permissions: getPermissionsForRole("PLATFORM_AUTHORITY"),
    isAdminEquivalent: true,
    status: "ACTIVE",
  };

  const bizOpsCtx: HireNestAccessContext = {
    uid: "usr-bizops-001",
    email: "bizops.lead@hirenest.os",
    role: "BUSINESS_OPERATIONS",
    organizationId: "ORG-GLOBAL-HQ",
    permissions: getPermissionsForRole("BUSINESS_OPERATIONS"),
    isAdminEquivalent: true,
    status: "ACTIVE",
  };

  const clientAdminCtx: HireNestAccessContext = {
    uid: "usr-client-admin-001",
    email: "admin@acmeglobal.com",
    role: "CLIENT_ADMIN",
    organizationId: "CLIENT-ACME-GLOBAL",
    clientId: "CLIENT-ACME-GLOBAL",
    permissions: getPermissionsForRole("CLIENT_ADMIN"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const clientFinanceCtx: HireNestAccessContext = {
    uid: "usr-client-fin-001",
    email: "finance@acmeglobal.com",
    role: "CLIENT_FINANCE",
    organizationId: "CLIENT-ACME-GLOBAL",
    clientId: "CLIENT-ACME-GLOBAL",
    permissions: getPermissionsForRole("CLIENT_FINANCE"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const vendorAdminCtx: HireNestAccessContext = {
    uid: "usr-vendor-admin-001",
    email: "admin@apexstaffing.com",
    role: "VENDOR_ADMIN",
    organizationId: "VENDOR-APEX-SOLUTIONS",
    vendorId: "VENDOR-APEX-SOLUTIONS",
    permissions: getPermissionsForRole("VENDOR_ADMIN"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const vendorRecruiterCtx: HireNestAccessContext = {
    uid: "usr-vendor-rec-001",
    email: "recruiter.raj@apexstaffing.com",
    role: "VENDOR_RECRUITER",
    organizationId: "VENDOR-APEX-SOLUTIONS",
    vendorId: "VENDOR-APEX-SOLUTIONS",
    permissions: getPermissionsForRole("VENDOR_RECRUITER"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  const otherVendorRecruiterCtx: HireNestAccessContext = {
    uid: "usr-other-rec-001",
    email: "recruiter@competingstaffing.com",
    role: "VENDOR_RECRUITER",
    organizationId: "VENDOR-COMPETITOR",
    vendorId: "VENDOR-COMPETITOR",
    permissions: getPermissionsForRole("VENDOR_RECRUITER"),
    isAdminEquivalent: false,
    status: "ACTIVE",
  };

  // -------------------------------------------------------------------------
  // STEP 1: CRM - Create Client Account via Core ClientService
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 1: CRM - Account Provisioning via Core ClientService");
  let clientId = "CLIENT-ACME-GLOBAL";
  try {
    const client = await ClientService.createClient(bizOpsCtx, {
      name: "Acme Global Technologies",
      industry: "Enterprise SaaS",
      tier: "TIER_1_ENTERPRISE",
      primaryEmail: "admin@acmeglobal.com",
      status: "ACTIVE",
    });
    clientId = client.id;
    assert(client.id.startsWith("CLIENT-"), "1. Client created in Core SSOT with authoritative ID");
    assert(client.tier === "TIER_1_ENTERPRISE", "2. Client assigned Enterprise SLA Tier 1");
  } catch (e: any) {
    assert(false, `1-2. Client creation failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 2: CRM - Create Commercial Opportunity
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 2: CRM - Commercial Opportunity Creation");
  let opportunityId = "";
  try {
    const opp = await CRMService.createOrUpdateOpportunity(bizOpsCtx, {
      clientId,
      clientName: "Acme Global Technologies",
      title: "10x Distributed Systems & Cloud Platform Pod",
      stage: "DISCOVERY",
      dealValue: 240000,
      probability: 75,
      positionsCount: 3,
      targetRoles: ["Go", "Kubernetes", "TypeScript", "Distributed Systems"],
    });
    opportunityId = opp.id;
    assert(opp.id.startsWith("OPP-"), "3. Commercial Opportunity created with OPP- ID");
    assert(opp.expectedRevenue === 180000, "4. Expected Revenue calculated deterministically ($240k * 75% = $180k)");
    assert(opp.stage === "DISCOVERY", "5. Opportunity stage is DISCOVERY");
  } catch (e: any) {
    assert(false, `3-5. Opportunity creation failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 3: Intelligence Core - AI Account Intelligence & Health Score
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 3: Intelligence Core - Account Health & Intelligence");
  try {
    const accountHealth = await AccountIntelligenceService.analyzeAccountHealth(bizOpsCtx, clientId);
    assert(accountHealth.clientId === clientId, "6. Account intelligence correctly bound to clientId");
    assert(accountHealth.healthScore >= 70, "7. Account health score evaluated as Healthy Enterprise (>70)");
    assert(accountHealth.meta.kind === "ANALYZE", "8. AI Metadata adheres to read-only 'ANALYZE' contract");
  } catch (e: any) {
    assert(false, `6-8. Account analysis failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 4: AI SDR Outreach Draft & Human-in-the-Loop Governance Gate
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 4: CRM / AI SDR - Outreach Draft with Human-in-the-Loop Gate");
  let sdrDraftId = "";
  try {
    const draft = await CRMService.generateSDRDraft(bizOpsCtx, {
      clientId,
      clientName: "Acme Global Technologies",
      opportunityId,
      contactName: "Sarah Connor",
      contactEmail: "s.connor@acmeglobal.com",
      targetTech: ["Go", "Kubernetes", "TypeScript"],
    });
    sdrDraftId = draft.id;
    assert(draft.approvalStatus === "PENDING_REVIEW", "9. AI SDR Draft strictly initialized in PENDING_REVIEW");
    assert(draft.meta.requiresHumanApproval === true, "10. AI SDR Draft contract enforces requiresHumanApproval: true");

    // Human operator review gate
    const approvedDraft = await CRMService.approveOutreachDraft(bizOpsCtx, sdrDraftId, "APPROVE");
    assert(approvedDraft.approvalStatus === "APPROVED", "11. Human Operator explicitly approved SDR outreach");
    assert(approvedDraft.approvedBy === bizOpsCtx.uid, "12. Audit ledger attributed to human approver UID");
  } catch (e: any) {
    assert(false, `9-12. AI SDR flow failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 5: CRM-to-Core Delivery Handoff -> Authoritative Requirement Creation
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 5: Core Handoff - Opportunity to Authoritative Requirement");
  let requirementId = "";
  try {
    // Advance opp to CLOSED_WON first
    await CRMService.createOrUpdateOpportunity(bizOpsCtx, {
      id: opportunityId,
      stage: "CLOSED_WON",
      probability: 100,
    });

    const handoff = await CRMService.handoffToDeliveryRequirement(bizOpsCtx, opportunityId);
    requirementId = handoff.requirementId;

    assert(handoff.opportunity.stage === "DELIVERY_HANDOFF", "13. Opportunity transitioned to DELIVERY_HANDOFF");
    assert(requirementId.startsWith("HN-REQ-"), "14. Core Requirement created with HN-REQ- ID in Firestore SSOT");
    assert(handoff.opportunity.linkedRequirementId === requirementId, "15. Opportunity linked bi-directionally to Requirement");
  } catch (e: any) {
    assert(false, `13-15. Delivery handoff failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 6: OS - Authoritative Requirement Inspection & Distribution
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 6: OS - Requirement Verification & Distribution");
  try {
    const req = await RequirementService.getRequirement(platformCtx, requirementId);
    assert(req.id === requirementId, "16. OS successfully accesses authoritative Requirement");
    assert(req.clientId === clientId, "17. Requirement scoped strictly to target Client");
    assert(req.status === "ACTIVE", "18. Requirement is ACTIVE in OS delivery pipeline");
  } catch (e: any) {
    assert(false, `16-18. Requirement verification failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 7: Candidate 360 - Registration & ABAC Privacy Masking
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 7: Candidate 360 - Registration & Cross-Vendor Privacy Masking");
  let candidateId = "";
  try {
    const candidate = await Candidate360Service.createCandidate(vendorRecruiterCtx, {
      name: "Alex Rivera",
      directEmail: "alex.rivera@gmail.com",
      directPhone: "+1-555-0199",
      primarySkills: ["Go", "Kubernetes", "TypeScript", "Distributed Systems"],
      totalExperienceYears: 6,
      currentCtc: 120000,
      expectedCtc: 140000,
      currency: "USD",
      noticePeriodDays: 15,
      currentCompany: "CloudScale Inc",
    });
    candidateId = candidate.id;
    assert(candidate.id.startsWith("CAND-"), "19. Candidate created in Candidate 360 SSOT");
    assert(candidate.vendorId === "VENDOR-APEX-SOLUTIONS", "20. Candidate ownership bound to VENDOR-APEX-SOLUTIONS");

    // Masking check for competing vendor
    const maskedView = await Candidate360Service.getCandidate(otherVendorRecruiterCtx, candidateId);
    assert(maskedView.directEmail === "[PROTECTED_VENDOR_DATA]", "21. Competing vendor receives redacted directEmail");
    assert(maskedView.directPhone === "[PROTECTED_VENDOR_DATA]", "22. Competing vendor receives redacted directPhone");

    // Non-masked check for owning recruiter
    const owningView = await Candidate360Service.getCandidate(vendorRecruiterCtx, candidateId);
    assert(owningView.directEmail === "alex.rivera@gmail.com", "23. Owning vendor recruiter retains unmasked candidate PII");
  } catch (e: any) {
    assert(false, `19-23. Candidate 360 flow failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 8: Intelligence Core - Layer 1 Deterministic Matching
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 8: Intelligence Core - Layer 1 Deterministic Sourcing Match");
  try {
    const match = await CandidateMatchingService.calculateMatch(
      vendorRecruiterCtx,
      candidateId,
      requirementId
    );
    assert(match.candidateId === candidateId, "24. Match calculated for target candidate");
    assert(match.requirementId === requirementId, "25. Match calculated for target requirement");
    assert(match.overallScore >= 80, "26. High deterministic skill overlap yields overallScore >= 80");
    assert(match.meta.kind === "SCORE", "27. Match metadata conforms to AI scoring contract");
  } catch (e: any) {
    assert(false, `24-27. Candidate matching failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 9: OS - Submission Lifecycle via Core SubmissionService
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 9: OS - Submission Lifecycle & Fulfillment Telemetry");
  let submissionId = "";
  try {
    const submission = await SubmissionService.createSubmission(vendorRecruiterCtx, {
      requirementId,
      candidateId,
      candidateName: "Alex Rivera",
      aiMatchScore: 92,
      expectedRate: 140000,
    });
    submissionId = submission.id;
    assert(submission.id.startsWith("SUB-"), "28. Candidate submission registered in OS");
    assert(submission.stage === "SUBMITTED", "29. Initial submission stage is SUBMITTED");
    assert(submission.vendorId === "VENDOR-APEX-SOLUTIONS", "30. Submission attributed to submitting Vendor");
  } catch (e: any) {
    assert(false, `28-30. Submission creation failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 10: OS - Interview Orchestration via Core InterviewService
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 10: OS - Interview Scheduling & Stage Advancement");
  let interviewId = "";
  try {
    const interview = await InterviewService.scheduleInterview(clientAdminCtx, {
      submissionId,
      requirementId,
      candidateId,
      candidateName: "Alex Rivera",
      vendorId: "VENDOR-APEX-SOLUTIONS",
      clientId,
      roundName: "Technical Deep Dive (Go & Distributed Systems)",
      scheduledAt: new Date(Date.now() + 86400000 * 2).toISOString(),
      interviewerEmail: "eng-lead@acmeglobal.com",
    });
    interviewId = interview.id;
    assert(interview.id.startsWith("INT-"), "31. Interview scheduled in Core InterviewService");
    assert(interview.status === "SCHEDULED", "32. Interview status is SCHEDULED");

    const updatedSub = await SubmissionService.getSubmission(clientAdminCtx, submissionId);
    assert(updatedSub.stage === "INTERVIEW_SCHEDULED", "33. Submission stage auto-advanced to INTERVIEW_SCHEDULED");
  } catch (e: any) {
    assert(false, `31-33. Interview scheduling failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 11: OS - Offer Orchestration via Core OfferService
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 11: OS - Offer Extension & Stage Advancement");
  let offerId = "";
  try {
    const offer = await OfferService.extendOffer(clientAdminCtx, {
      submissionId,
      requirementId,
      candidateId,
      candidateName: "Alex Rivera",
      vendorId: "VENDOR-APEX-SOLUTIONS",
      clientId,
      offeredAnnualCtc: 145000,
      currency: "USD",
      joiningDate: new Date(Date.now() + 86400000 * 14).toISOString(),
    });
    offerId = offer.id;
    assert(offer.id.startsWith("OFFER-"), "34. Offer extended via Core OfferService");
    assert(offer.offeredAnnualCtc === 145000, "35. Offered CTC recorded ($145,000)");

    const updatedSub = await SubmissionService.getSubmission(clientAdminCtx, submissionId);
    assert(updatedSub.stage === "OFFER_EXTENDED", "36. Submission stage auto-advanced to OFFER_EXTENDED");
  } catch (e: any) {
    assert(false, `34-36. Offer extension failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 12: OS - Placement Orchestration via Core PlacementService
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 12: OS - Placement Closure & Stage Advancement");
  let placementId = "";
  try {
    const placement = await PlacementService.recordPlacement(clientAdminCtx, {
      offerId,
      submissionId,
      requirementId,
      candidateId,
      candidateName: "Alex Rivera",
      vendorId: "VENDOR-APEX-SOLUTIONS",
      clientId,
      placementFee: 29000, // 20% placement fee
      currency: "USD",
      joinedDate: new Date().toISOString(),
      guaranteePeriodDays: 90,
    });
    placementId = placement.id;
    assert(placement.id.startsWith("PLACE-"), "37. Placement recorded in Core PlacementService");
    assert(placement.placementFee === 29000, "38. Placement Fee recorded ($29,000)");

    const placedSub = await SubmissionService.getSubmission(clientAdminCtx, submissionId);
    assert(placedSub.stage === "PLACED", "39. Submission stage auto-advanced to final PLACED state");
  } catch (e: any) {
    assert(false, `37-39. Placement recording failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 13: Core - SLA, Budget & Performance Telemetry
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 13: Core Telemetry - SLA, Client Budget & Vendor Performance");
  try {
    // 13.1 SLA
    const sla = await SLAService.setRequirementSLA(bizOpsCtx, {
      requirementId,
      clientId,
      fulfillmentTargetDays: 20,
    });
    assert(sla.fulfillmentTargetDays === 20, "40. SLA Target set to 20 days");
    assert(sla.breachStatus === "ON_TRACK", "41. SLA Status is ON_TRACK");

    // 13.2 Client Budget
    const budget = await BudgetService.getClientBudget(clientFinanceCtx, clientId);
    assert(budget !== null, "42. Client Budget retrieved for Finance Authority");
    assert(budget?.clientId === clientId, "43. Budget scoped to target Client");

    // 13.3 Vendor Performance
    const perf = await PerformanceService.getVendorPerformance(vendorAdminCtx, "VENDOR-APEX-SOLUTIONS");
    assert(perf !== null, "44. Vendor Performance metrics retrieved");
    assert(perf?.offerToPlacementRate! > 80, "45. Vendor Placement rate exceeds 80%");
  } catch (e: any) {
    assert(false, `40-45. Telemetry checks failed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // STEP 14: CRM - Feedback Loop & Final Revenue Synchronization
  // -------------------------------------------------------------------------
  console.log("\n▶ Step 14: CRM - Feedback Loop & Delivery Status Synchronization");
  try {
    const opps = await CRMService.listOpportunities(bizOpsCtx, clientId);
    const completedOpp = opps.find((o) => o.id === opportunityId);
    assert(completedOpp !== undefined, "46. CRM Opportunity retrieved from SSOT");
    assert(completedOpp?.stage === "DELIVERY_HANDOFF", "47. CRM Opportunity accurately reflects DELIVERY_HANDOFF stage");
    assert(completedOpp?.linkedRequirementId === requirementId, "48. CRM Opportunity link to Core Requirement preserved");

    // Verify Requirement telemetry feedback
    const finalReq = await RequirementService.getRequirement(bizOpsCtx, requirementId);
    assert(finalReq.fulfillmentStats.submissionsCount >= 1, "49. Requirement submissions telemetry recorded");
    assert(finalReq.fulfillmentStats.placementsCount >= 1, "50. Requirement placements telemetry recorded in SSOT");
  } catch (e: any) {
    assert(false, `46-50. CRM feedback loop failed: ${e.message}`);
  }

  console.log("================================================================================");
  console.log(`🏛️  AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED  🏛️`);
  console.log("================================================================================");

  return { passed, failed, errors };
}

// Auto-run if executed in tsx/node environment
if (typeof process !== "undefined" && process.argv && process.argv[1]?.includes("complete-business-lifecycle")) {
  runEndToEndBusinessLifecycleTest().then((res) => {
    process.exit(res.failed > 0 ? 1 : 0);
  });
}
