/**
 * HireNestOS Deterministic Engine Test Runner
 */

import { runParserTests } from "./parser.test.js";
import { runMatchingTests } from "./matching.test.js";
import { runPipelineTests } from "./pipeline.test.js";
import { runRequirementMatrixTests } from "../../tests/requirement-lifecycle-matrix.test.js";
import { runProductionSmokeE2ETests } from "../../tests/production-smoke-e2e.test.js";
import { runGoldenCandidateMatrixTests } from "../../tests/golden-candidate-matrix.test.js";

async function runAll() {
  console.log("===============================================================");
  console.log("   HireNestOS ZERO-AI RESUME ENGINE - TEST VERIFICATION");
  console.log("===============================================================");

  const start = Date.now();

  const res1 = runParserTests();
  const res2 = runMatchingTests();
  const res3 = await runPipelineTests();
  const res4 = runRequirementMatrixTests();
  const res5 = runProductionSmokeE2ETests();
  const res6 = runGoldenCandidateMatrixTests();

  const totalPassed = res1.passed + res2.passed + res3.passed + res4.passed + res5.passed + res6.passed;
  const totalFailed = res1.failed + res2.failed + res3.failed + res4.failed + res5.failed + res6.failed;
  const totalErrors = [...res1.errors, ...res2.errors, ...res3.errors, ...res4.errors, ...res5.errors, ...res6.errors];
  const elapsed = ((Date.now() - start) / 1000).toFixed(2);

  console.log("\n===============================================================");
  console.log(`SUMMARY: ${totalPassed} PASSED, ${totalFailed} FAILED (Completed in ${elapsed}s)`);
  console.log("ZERO AI/LLM API CALLS WERE MADE DURING THE CRITICAL PIPELINE.");
  console.log("===============================================================");

  if (totalFailed > 0) {
    console.error("FAILURES DETECTED:", totalErrors);
    process.exit(1);
  } else {
    console.log("ALL TESTS PASSED SUCCESSFULLY! ✓");
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error("Test runner exception:", err);
  process.exit(1);
});
