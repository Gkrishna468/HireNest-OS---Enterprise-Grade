
import { execSync } from 'child_process';
import assert from 'assert';

console.log("Running regression test: Client Firebase SDK fail-closed guard...");

// We expect this to throw an error if it hits the production guard
try {
  // Simulate test environment targeting production project without emulator
  execSync('NODE_ENV=test FIRESTORE_EMULATOR_HOST= IS_STAGING=false FIREBASE_PROJECT_ID=hirenest-os tsx -e "import { db } from \'./src/lib/firebase.js\'; console.log(db);"', {
    stdio: 'pipe',
  });
  console.error("FAIL: Firebase SDK allowed targeting production project without emulator!");
  process.exit(1);
} catch (err: any) {
  if (err.stderr.toString().includes("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED")) {
    console.log("SUCCESS: Guard triggered as expected!");
    process.exit(0);
  } else {
    console.error("FAIL: Unexpected error:", err.stderr.toString());
    process.exit(1);
  }
}
