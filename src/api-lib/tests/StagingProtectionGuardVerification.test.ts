/**
 * HireNestOS Staging Protection Guard & Adversarial Verification Test Suite
 *
 * Verifies that the production protection boundary is impenetrable:
 * 1. Prohibits ALLOW_PRODUCTION_WRITES bypass in non-production.
 * 2. Prohibits swallowing of guard exceptions during initialization.
 * 3. Enforces client SDK fail-closed target guard.
 * 4. Rejects unprovisioned 'hirenest-staging-db' without active local emulator.
 * 5. Enforces offline 'demo-hirenest-emulator' namespace when running with emulator.
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { execSync } from "node:child_process";

describe("HireNestOS Staging Protection Guard Verification", () => {
  // Test 1: Static Code Audit of firebase-admin.ts
  it("GUARD-001: firebase-admin.ts must NOT contain any ALLOW_PRODUCTION_WRITES bypass clause", () => {
    const adminContent = fs.readFileSync("src/lib/firebase-admin.ts", "utf-8");
    assert.ok(
      !adminContent.includes("!allowProdWrites"),
      "firebase-admin.ts must NOT allow !allowProdWrites to bypass the production guard"
    );
    assert.ok(
      adminContent.includes("ALLOW_PRODUCTION_WRITES is prohibited and rejected in non-production"),
      "firebase-admin.ts must log that ALLOW_PRODUCTION_WRITES is prohibited"
    );
    assert.ok(
      adminContent.includes("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED"),
      "firebase-admin.ts must throw FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED"
    );
    assert.ok(
      adminContent.includes("UNPROVISIONED_STAGING_TARGET_ERROR"),
      "firebase-admin.ts must throw UNPROVISIONED_STAGING_TARGET_ERROR for unprovisioned placeholder"
    );
  });

  // Test 2: Static Code Audit of firebase.ts (Client SDK)
  it("GUARD-002: client firebase.ts must contain Fail-Closed Target Guard and emulator connections", () => {
    const clientContent = fs.readFileSync("src/lib/firebase.ts", "utf-8");
    assert.ok(
      clientContent.includes("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED"),
      "Client firebase.ts must contain FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED"
    );
    assert.ok(
      clientContent.includes("UNPROVISIONED_STAGING_TARGET_ERROR"),
      "Client firebase.ts must contain UNPROVISIONED_STAGING_TARGET_ERROR"
    );
    assert.ok(
      clientContent.includes("connectFirestoreEmulator"),
      "Client firebase.ts must import and connect connectFirestoreEmulator"
    );
    assert.ok(
      clientContent.includes("connectAuthEmulator"),
      "Client firebase.ts must import and connect connectAuthEmulator"
    );
  });

  // Test 3: Adversarial test - Attempting to bypass guard with ALLOW_PRODUCTION_WRITES=true must FAIL CLOSED
  it("GUARD-003: Subprocess import of firebase-admin targeting hirenest-os with ALLOW_PRODUCTION_WRITES=true must hard throw", () => {
    try {
      const output = execSync(
        `NODE_ENV=test FIREBASE_PROJECT_ID=hirenest-os ALLOW_PRODUCTION_WRITES=true npx tsx -e "import('./src/lib/firebase-admin.ts')"`,
        { stdio: "pipe" }
      ).toString();
      assert.fail(`Import should have failed due to fail-closed guard, but succeeded: ${output}`);
    } catch (err: any) {
      const combinedOutput = (err.stdout?.toString() || "") + (err.stderr?.toString() || "");
      assert.ok(
        combinedOutput.includes("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED"),
        "Must trigger FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED even with ALLOW_PRODUCTION_WRITES=true"
      );
    }
  });

  // Test 4: Exception cannot be swallowed by try/catch in firebase-admin.ts
  it("GUARD-004: Guard error in firebase-admin must rethrow and never be swallowed into degraded/fallback state", () => {
    const adminContent = fs.readFileSync("src/lib/firebase-admin.ts", "utf-8");
    const catchIndex = adminContent.lastIndexOf("catch (globalInitError");
    const rethrowCheck = adminContent.slice(catchIndex);
    assert.ok(
      rethrowCheck.includes("throw globalInitError"),
      "firebase-admin catch block must re-throw security guard error to prevent swallowing"
    );
  });

  // Test 5: Client SDK fails closed if targeting hirenest-os in test mode without emulator
  it("GUARD-005: Client SDK must hard throw FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED when targeting hirenest-os in test mode", () => {
    try {
      const output = execSync(
        `NODE_ENV=test NEXT_PUBLIC_FIREBASE_PROJECT_ID=hirenest-os npx tsx -e "import('./src/lib/firebase.ts')"`,
        { stdio: "pipe" }
      ).toString();
      assert.fail(`Client SDK import should have failed due to fail-closed guard, but succeeded: ${output}`);
    } catch (err: any) {
      const combinedOutput = (err.stdout?.toString() || "") + (err.stderr?.toString() || "");
      assert.ok(
        combinedOutput.includes("FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED"),
        "Client SDK must trigger FAIL_CLOSED_PRODUCTION_PROTECTION_GUARD_TRIGGERED"
      );
    }
  });

  // Test 6: Rejection of unprovisioned placeholder 'hirenest-staging-db' without emulator
  it("GUARD-006: Targeting unprovisioned 'hirenest-staging-db' without emulator must throw UNPROVISIONED_STAGING_TARGET_ERROR", () => {
    try {
      const output = execSync(
        `NODE_ENV=test FIREBASE_PROJECT_ID=hirenest-staging-db npx tsx -e "import('./src/lib/firebase-admin.ts')"`,
        { stdio: "pipe" }
      ).toString();
      assert.fail(`Unprovisioned staging should have failed, but succeeded: ${output}`);
    } catch (err: any) {
      const combinedOutput = (err.stdout?.toString() || "") + (err.stderr?.toString() || "");
      assert.ok(
        combinedOutput.includes("UNPROVISIONED_STAGING_TARGET_ERROR"),
        "Must trigger UNPROVISIONED_STAGING_TARGET_ERROR for placeholder hirenest-staging-db"
      );
    }
  });

  // Test 7: Offline namespace enforcement in emulator mode
  it("GUARD-007: In emulator mode, project namespace is diverted to demo-hirenest-emulator", () => {
    const adminContent = fs.readFileSync("src/lib/firebase-admin.ts", "utf-8");
    assert.ok(
      adminContent.includes('projectId = "demo-hirenest-emulator"'),
      "firebase-admin.ts must divert emulator runs to demo-hirenest-emulator offline namespace"
    );

    const clientContent = fs.readFileSync("src/lib/firebase.ts", "utf-8");
    assert.ok(
      clientContent.includes('"demo-hirenest-emulator"'),
      "Client firebase.ts must divert emulator runs to demo-hirenest-emulator offline namespace"
    );
  });
});
