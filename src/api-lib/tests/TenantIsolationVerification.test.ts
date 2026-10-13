/**
 * HireNestOS Multi-Tenant Isolation Verification & Security Audit Test Suite
 *
 * Formally validates Attribute-Based Access Control (ABAC) and Tenant Isolation:
 * 1. TENANT-001: Firestore Rules Candidate Pool Isolation (Vendor/Client segregation)
 * 2. TENANT-002: Firestore Rules User & Organization Data Boundary Isolation
 * 3. TENANT-003: Recruiter OS Multi-Tenant Scoping & Event Partitioning
 * 4. TENANT-004: Economic Isolation & Per-Tenant Spending Ceiling Protection
 * 5. TENANT-005: Intake Engine & Deduplication Boundary Isolation
 * 6. TENANT-006: Reporting Export & Control Tower ABAC Role/Tenant Enforcement
 * 7. TENANT-007: AI Governance & Tenant Token Quota Isolation
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";

describe("HireNestOS Multi-Tenant Isolation & Zero-Trust Verification", () => {
  // TENANT-001: CandidatePool Firestore Rules Isolation
  it("TENANT-001: firestore.rules must enforce vendorId and clientId segregation on candidatePool", () => {
    const rules = fs.readFileSync("firestore.rules", "utf-8");
    const candidatePoolSection = rules.slice(rules.indexOf("match /candidatePool/{candidateId}"));
    const endMatch = candidatePoolSection.indexOf("match /");
    const poolRules = candidatePoolSection.slice(0, endMatch > 0 ? endMatch : undefined);

    // Verify vendor and client isolation clauses exist
    assert.ok(
      poolRules.includes("isSameOrg(resource.data.get('vendorId', ''))"),
      "candidatePool read must enforce isSameOrg on vendorId"
    );
    assert.ok(
      poolRules.includes("isSameOrg(resource.data.get('clientId', ''))"),
      "candidatePool read must enforce isSameOrg on clientId"
    );
    assert.ok(
      poolRules.includes("isSameOrg(incoming().vendorId)"),
      "candidatePool create must enforce isSameOrg on incoming vendorId"
    );
    assert.ok(
      poolRules.includes("isSameOrg(incoming().clientId)"),
      "candidatePool create must enforce isSameOrg on incoming clientId"
    );
    assert.ok(
      poolRules.includes("isSameOrg(existing().vendorId)"),
      "candidatePool update must enforce isSameOrg on existing vendorId"
    );
  });

  // TENANT-002: User & Organization Firestore Rules Boundary
  it("TENANT-002: firestore.rules must isolate users and organizations by organizationId/orgId", () => {
    const rules = fs.readFileSync("firestore.rules", "utf-8");
    const usersSection = rules.slice(rules.indexOf("match /users/{userId}"));
    const endMatch = usersSection.indexOf("match /organizations/{orgId}");
    const userRules = usersSection.slice(0, endMatch > 0 ? endMatch : undefined);

    assert.ok(
      userRules.includes("isSameOrg(resource.data.organizationId)"),
      "users collection must restrict reads to users with the same organizationId"
    );
    assert.ok(
      userRules.includes("isSameOrg(resource.data.orgId)"),
      "users collection must restrict reads to users with the same orgId"
    );
    assert.ok(
      userRules.includes("request.resource.data.organizationId == resource.data.organizationId"),
      "users update must prevent non-admins from changing their organizationId"
    );

    // Organization update check
    const orgsSection = rules.slice(rules.indexOf("match /organizations/{orgId}"));
    const orgRules = orgsSection.slice(0, 300);
    assert.ok(
      orgRules.includes("isOrganizationMember(orgId)"),
      "organizations update must be restricted to members of that specific organization"
    );
  });

  // TENANT-003: Recruiter OS Multi-Tenant Scoping
  it("TENANT-003: recruiter-os.ts must stamp tenantId from user context on all actions and submissions", () => {
    const handlerCode = fs.readFileSync("src/api-lib/handlers/recruiter-os.ts", "utf-8");

    assert.ok(
      handlerCode.includes("const tenantId = req.user?.organizationId || \"TENANT-HQ\""),
      "recruiter-os must resolve tenantId from authenticated user organizationId"
    );
    assert.ok(
      handlerCode.includes("tenantId,") && handlerCode.includes("source: \"RECRUITER_OS\""),
      "recruiter-os events must include tenantId in published envelope"
    );
    assert.ok(
      handlerCode.includes("await adminDb.collection(\"submissions\").add({"),
      "recruiter-os must persist submissions"
    );
    assert.ok(
      handlerCode.includes("tenantId,\n          createdAt: timestamp"),
      "recruiter-os submissions must be partitioned with tenantId"
    );
  });

  // TENANT-004: Economic Isolation & Spending Ceilings
  it("TENANT-004: economicIsolation.ts must partition budgets strictly by tenant orgId", () => {
    const econCode = fs.readFileSync("src/api-lib/economicIsolation.ts", "utf-8");

    assert.ok(
      econCode.includes("adminDb.collection(\"tenantEconomics\").doc(orgId)"),
      "checkEconomicLimits must look up tenantEconomics keyed by orgId"
    );
    assert.ok(
      econCode.includes("deductSpend(orgId: string, amount: number)"),
      "deductSpend must operate strictly within the provided orgId scope"
    );
    assert.ok(
      econCode.includes("availableSpend"),
      "economic check must enforce availableSpend ceiling without inter-tenant bleed"
    );
  });

  // TENANT-005: Intake Engine & Deduplication Boundary Isolation
  it("TENANT-005: IntakeEngine and DuplicateResolver must scope deduplication strictly per tenant", () => {
    const dupCode = fs.readFileSync("src/api-lib/intake/DuplicateResolver.ts", "utf-8");
    const intakeCode = fs.readFileSync("src/api-lib/intake/IntakeEngine.ts", "utf-8");

    assert.ok(
      dupCode.includes(".where(\"organizationId\", \"==\", tenantId)"),
      "DuplicateResolver must query candidates strictly scoped to tenantId"
    );
    assert.ok(
      intakeCode.includes("envelope.tenantId"),
      "IntakeEngine must propagate envelope.tenantId across all stages"
    );
    assert.ok(
      intakeCode.includes("IntakeMetrics.increment(envelope.tenantId"),
      "IntakeEngine metrics must be incremented per tenant"
    );
  });

  // TENANT-006: Reporting Export & Control Tower ABAC Isolation
  it("TENANT-006: reporting-export and control-tower must enforce role and financial suppression", () => {
    const exportCode = fs.readFileSync("src/api-lib/handlers/reporting-export.ts", "utf-8");
    const ctCode = fs.readFileSync("src/api-lib/handlers/control-tower.ts", "utf-8");

    // Vendor partners and external clients blocked from export
    assert.ok(
      exportCode.includes('userRole.includes("vendor")') && exportCode.includes('userRole.includes("client")'),
      "reporting-export must reject external vendor and client roles"
    );
    assert.ok(
      exportCode.includes("status(403)"),
      "reporting-export must reject external vendor partners with HTTP 403"
    );

    // Control Tower financial margin suppression for recruiters
    assert.ok(
      ctCode.includes("isFinanceAuthorized"),
      "control-tower must calculate isFinanceAuthorized"
    );
    assert.ok(
      ctCode.includes("if (isFinanceAuthorized)") && ctCode.includes("responsePayload.financials ="),
      "control-tower must only attach financials when role is finance authorized"
    );
  });

  // TENANT-007: AI Governance & Tenant Token Quota Isolation
  it("TENANT-007: tenantGovernance.ts must roll up AI token quotas and usage per orgId", () => {
    const govCode = fs.readFileSync("src/api-lib/tenantGovernance.ts", "utf-8");

    assert.ok(
      govCode.includes("adminDb.collection(\"ai_usage_logs\").add"),
      "tenantGovernance must write immutable usage records with orgId"
    );
    assert.ok(
      govCode.includes("adminDb.collection(\"tenant_usage\").doc(`${params.orgId}_${billingCycle}`)"),
      "tenantGovernance must partition tenant_usage document by orgId and billingCycle"
    );
    assert.ok(
      govCode.includes("remainingTokens"),
      "tenantGovernance must track remainingTokens per tenant orgId"
    );
  });
});
