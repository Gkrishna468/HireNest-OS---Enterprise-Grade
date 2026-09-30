import { runCandidateSecurityAndE2ETests } from "../src/tests/candidateSecurityAndE2E.test.js";

async function run() {
  console.log("Starting Candidate Security Audit and E2E tests...");
  try {
    await runCandidateSecurityAndE2ETests();
    console.log("Candidate Security and E2E test run complete.");
    process.exit(0);
  } catch (e: any) {
    console.error("Test runner crashed:", e);
    process.exit(1);
  }
}

run();
