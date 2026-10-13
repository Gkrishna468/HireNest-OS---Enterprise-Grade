/**
 * Vendor Requirement Eligibility & Dual-Path Policy Separation Test
 * 
 * Verifies Phase 4 Universal Vendor Requirement Matching Remediation:
 * 1. Authorized Vendor Workspace Path (VendorRequirementEligibilityPolicy):
 *    - Allows REMOTE, HYBRID, ONSITE work modes
 *    - Allows CONTRACT, C2C, C2H, FTE employment types
 *    - Rejects inactive lifecycle states: CLOSED, ARCHIVED, HOLD, PAUSED, EXPIRED, DRAFT
 *    - Rejects UNPUBLISHED distribution states
 *    - Rejects explicitly hidden requirements (visibility.vendors === false)
 * 2. Public Candidate Feed Path (CandidateRequirementEligibilityPolicy):
 *    - Strictly preserves ONSITE, FTE-only restriction (Attack 13 & 14 boundary)
 */

import { VendorRequirementEligibilityPolicy } from "../services/VendorRequirementEligibilityPolicy.js";
import { CandidateRequirementEligibilityPolicy } from "../services/CandidateRequirementEligibilityPolicy.js";

interface PolicyTestCase {
  name: string;
  req: any;
  expectedVendorEligible: boolean;
  expectedCandidateEligible: boolean;
}

export function runVendorRequirementEligibilityTests(): { passed: number; failed: number; errors: string[] } {
  console.log("\n=======================================================");
  console.log("   VENDOR REQUIREMENT ELIGIBILITY DUAL-PATH MATRIX");
  console.log("   Public Feed (Onsite FTE) vs Vendor Workspace (Universal)");
  console.log("=======================================================");

  const testCases: PolicyTestCase[] = [
    {
      name: "1. Remote Contract Requirement => Vendor Eligible, Candidate Portal Rejected",
      req: {
        id: "req-remote-c2c",
        title: "Senior Cloud Engineer",
        status: "ACTIVE",
        distributionStatus: "PUBLISHED",
        workMode: "REMOTE",
        employmentType: "CONTRACT",
        candidatePublish: true,
        directApplyEnabled: true
      },
      expectedVendorEligible: true,
      expectedCandidateEligible: false
    },
    {
      name: "2. C2C Arrangement => Vendor Eligible, Candidate Portal Rejected",
      req: {
        id: "req-c2c",
        title: "Staff DevOps Architect",
        status: "ACTIVE",
        distributionStatus: "PUBLISHED",
        workMode: "HYBRID",
        employmentType: "C2C",
        candidatePublish: true,
        directApplyEnabled: true
      },
      expectedVendorEligible: true,
      expectedCandidateEligible: false
    },
    {
      name: "3. Onsite FTE Requirement => Both Vendor and Candidate Portal Eligible",
      req: {
        id: "req-onsite-fte",
        title: "Data Platform Lead",
        status: "ACTIVE",
        distributionStatus: "PUBLISHED",
        workMode: "ONSITE",
        employmentType: "FTE",
        candidatePublish: true,
        directApplyEnabled: true
      },
      expectedVendorEligible: true,
      expectedCandidateEligible: true
    },
    {
      name: "4. Closed Status => Rejection in BOTH paths",
      req: {
        id: "req-closed",
        title: "Archived Role",
        status: "CLOSED",
        distributionStatus: "PUBLISHED",
        workMode: "ONSITE",
        employmentType: "FTE",
        candidatePublish: true,
        directApplyEnabled: true
      },
      expectedVendorEligible: false,
      expectedCandidateEligible: false
    },
    {
      name: "5. Hold Status => Rejection in BOTH paths",
      req: {
        id: "req-hold",
        title: "Paused Role",
        status: "HOLD",
        distributionStatus: "PUBLISHED",
        workMode: "ONSITE",
        employmentType: "FTE",
        candidatePublish: true,
        directApplyEnabled: true
      },
      expectedVendorEligible: false,
      expectedCandidateEligible: false
    },
    {
      name: "6. Unpublished Distribution Status => Rejection in Vendor Workspace",
      req: {
        id: "req-unpub",
        title: "Draft Partner Role",
        status: "ACTIVE",
        distributionStatus: "UNPUBLISHED",
        workMode: "REMOTE",
        employmentType: "CONTRACT"
      },
      expectedVendorEligible: false,
      expectedCandidateEligible: false
    },
    {
      name: "7. Explicit Vendor Exclusion (visibility.vendors === false) => Rejected in Vendor Workspace",
      req: {
        id: "req-hidden-from-vendors",
        title: "Direct Internal Hire Only",
        status: "ACTIVE",
        distributionStatus: "PUBLISHED",
        workMode: "ONSITE",
        employmentType: "FTE",
        visibility: { vendors: false }
      },
      expectedVendorEligible: false,
      expectedCandidateEligible: true
    }
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const tc of testCases) {
    const isVendor = VendorRequirementEligibilityPolicy.isVendorEligible(tc.req);
    const isCandidate = CandidateRequirementEligibilityPolicy.isCandidateEligible(tc.req);

    const vendorOk = isVendor === tc.expectedVendorEligible;
    const candidateOk = isCandidate === tc.expectedCandidateEligible;

    if (vendorOk && candidateOk) {
      console.log(`  ✓ PASS: ${tc.name}`);
      passed++;
    } else {
      const err = `FAIL: ${tc.name} [Vendor: got ${isVendor}, expected ${tc.expectedVendorEligible}] [Candidate: got ${isCandidate}, expected ${tc.expectedCandidateEligible}]`;
      console.error(`  ✗ ${err}`);
      errors.push(err);
      failed++;
    }
  }

  console.log(`Dual-Path Policy Result: ${passed}/${testCases.length} assertions passed (${failed} failures).`);
  return { passed, failed, errors };
}
