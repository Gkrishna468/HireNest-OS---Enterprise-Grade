/**
 * Requirement Lifecycle & Distribution State Regression Matrix Test
 * 
 * Verifies the strict invariant:
 * ACTIVE + PUBLISHED + AUTHORIZED = OPERATIONAL
 * 
 * In particular:
 * - ACTIVE does NOT imply PUBLISHED
 * - HOLD + PUBLISHED => NOT OPERATIONAL
 * - PAUSED + PUBLISHED => NOT OPERATIONAL
 * - CLOSED + PUBLISHED => NOT OPERATIONAL
 * - EXPIRED + PUBLISHED => NOT OPERATIONAL
 * - ACTIVE + UNPUBLISHED => NOT OPERATIONAL
 * - ACTIVE + DRAFT => NOT OPERATIONAL
 * - Legacy boolean `published: true` without distributionStatus `PUBLISHED` => NOT OPERATIONAL
 */

import { UnifiedRequirementsService } from "../services/unifiedRequirementsService.js";

interface MatrixTestCase {
  name: string;
  req: {
    id: string;
    title: string;
    status?: string | null;
    distributionStatus?: string | null;
    published?: boolean;
  };
  expectedOperational: boolean;
}

export function runRequirementMatrixTests(): { passed: number; failed: number; errors: string[] } {
  console.log("\n=======================================================");
  console.log("   REQUIREMENT OPERATIONAL GATE REGRESSION MATRIX");
  console.log("   Invariant: ACTIVE + PUBLISHED + AUTHORIZED = OPERATIONAL");
  console.log("=======================================================");

  const testCases: MatrixTestCase[] = [
    {
      name: "1. ACTIVE + PUBLISHED => OPERATIONAL",
      req: { id: "req-1", title: "Cloud Architect", status: "ACTIVE", distributionStatus: "PUBLISHED" },
      expectedOperational: true,
    },
    {
      name: "2. ACTIVE + UNPUBLISHED => REJECTED (Active is not published)",
      req: { id: "req-2", title: "Data Engineer", status: "ACTIVE", distributionStatus: "UNPUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "3. HOLD + PUBLISHED => REJECTED (Hold overrides distribution)",
      req: { id: "req-3", title: "SAP Lead", status: "HOLD", distributionStatus: "PUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "4. HOLD + UNPUBLISHED => REJECTED",
      req: { id: "req-4", title: "SAP Lead", status: "HOLD", distributionStatus: "UNPUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "5. PAUSED + PUBLISHED => REJECTED (Paused overrides distribution)",
      req: { id: "req-5", title: "React Dev", status: "PAUSED", distributionStatus: "PUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "6. CLOSED + PUBLISHED => REJECTED (Closed lifecycle overrides distribution)",
      req: { id: "req-6", title: "DevOps Lead", status: "CLOSED", distributionStatus: "PUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "7. EXPIRED + PUBLISHED => REJECTED (Expired lifecycle overrides distribution)",
      req: { id: "req-7", title: "QA Analyst", status: "EXPIRED", distributionStatus: "PUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "8. ARCHIVED + PUBLISHED => REJECTED",
      req: { id: "req-8", title: "Product Mgr", status: "ARCHIVED", distributionStatus: "PUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "9. DRAFT + PUBLISHED => REJECTED (Draft lifecycle overrides distribution)",
      req: { id: "req-9", title: "Draft Role", status: "DRAFT", distributionStatus: "PUBLISHED" },
      expectedOperational: false,
    },
    {
      name: "10. ACTIVE + null distributionStatus => REJECTED (No silent default)",
      req: { id: "req-10", title: "Security Analyst", status: "ACTIVE", distributionStatus: null },
      expectedOperational: false,
    },
    {
      name: "11. ACTIVE + missing distributionStatus => REJECTED (No legacy fallback)",
      req: { id: "req-11", title: "DBA Specialist", status: "ACTIVE" },
      expectedOperational: false,
    },
    {
      name: "12. ACTIVE + legacy published: true boolean flag => REJECTED (Strict distributionStatus requirement)",
      req: { id: "req-12", title: "Legacy Job", status: "ACTIVE", published: true },
      expectedOperational: false,
    },
    {
      name: "13. Case Insensitive Check: active + published => OPERATIONAL",
      req: { id: "req-13", title: "Backend Engineer", status: "active", distributionStatus: "published" },
      expectedOperational: true,
    },
    {
      name: "14. Empty / Null requirement object => REJECTED",
      req: null as any,
      expectedOperational: false,
    },
  ];

  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const tc of testCases) {
    const isOp = UnifiedRequirementsService.isRequirementOperational(tc.req);
    if (isOp === tc.expectedOperational) {
      console.log(`  ✓ PASS: ${tc.name} -> result: ${isOp ? "OPERATIONAL" : "REJECTED"}`);
      passed++;
    } else {
      const err = `FAIL: ${tc.name} expected operational: ${tc.expectedOperational}, got: ${isOp}`;
      console.error(`  ✗ ${err}`);
      errors.push(err);
      failed++;
    }
  }

  console.log(`\nMatrix Result: ${passed}/${testCases.length} assertions passed (${failed} failures).`);
  return { passed, failed, errors };
}

// Direct execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const result = runRequirementMatrixTests();
  process.exit(result.failed > 0 ? 1 : 0);
}
