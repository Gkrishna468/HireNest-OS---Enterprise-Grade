import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { normalizeRole, canUserPerformAction } from "../../lib/rbac.js";
import { sanitizeAuthError } from "../../lib/authErrorSanitizer.js";

describe("Security Audit Remediation P0 & P1 Automated Test Suite", () => {
  it("BUG-010: should verify dev-mode fallback is eliminated from api/index.ts", () => {
    const apiIndex = fs.readFileSync("api/index.ts", "utf-8");
    assert.strictEqual(apiIndex.includes("req.user = { uid: 'dev-mode' }"), false, "dev-mode auth fallback must NOT exist in api/index.ts");
    assert.ok(apiIndex.includes("Authentication service is offline"), "api/index.ts must return 503 when adminAuth is offline");
  });

  it("BUG-010: should verify firebase-admin.ts proxy throws error when adminAuth is offline", async () => {
    const fbAdmin = fs.readFileSync("src/lib/firebase-admin.ts", "utf-8");
    assert.strictEqual(fbAdmin.includes('uid: "dummy-user"'), false, "dummy-user fallback must NOT exist in firebase-admin.ts");
    assert.ok(fbAdmin.includes("FIREBASE_ADMIN_AUTH_UNAVAILABLE"), "firebase-admin.ts must throw FIREBASE_ADMIN_AUTH_UNAVAILABLE");
  });

  it("BUG-004 & BUG-005: should verify firestore.rules protects organizationId/role and restricts user reads", () => {
    const rules = fs.readFileSync("firestore.rules", "utf-8");
    assert.ok(rules.includes("request.resource.data.organizationId == resource.data.organizationId"), "firestore.rules must enforce organizationId immutability for user updates");
    assert.ok(rules.includes("request.resource.data.role == resource.data.role"), "firestore.rules must enforce role immutability for non-admin user updates");
    assert.ok(rules.includes("isOwner(userId) ||"), "firestore.rules users read rule must restrict access to owner/admin/same-org");
  });

  it("BUG-007: should fail closed on unknown/invalid roles", () => {
    const unknownRole1 = normalizeRole("hacker_admin");
    const unknownRole2 = normalizeRole("malicious_role_xyz");
    const emptyRole = normalizeRole("");

    assert.strictEqual(unknownRole1, "GUEST", "Unknown role must normalize to GUEST");
    assert.strictEqual(unknownRole2, "GUEST", "Unknown role must normalize to GUEST");
    assert.strictEqual(emptyRole, "GUEST", "Empty role must normalize to GUEST");

    const accessCheck = canUserPerformAction({
      uid: "test_user_1",
      role: "GUEST",
      organizationId: "ORG_TEST",
      permissions: [],
      status: "ACTIVE"
    }, "requirements.read");

    assert.strictEqual(accessCheck.allowed, false, "GUEST role must be denied access");
  });

  it("BUG-002: should preserve VENDOR_RECRUITER normalization", () => {
    const norm = normalizeRole("VENDOR_RECRUITER");
    assert.strictEqual(norm, "VENDOR_RECRUITER", "VENDOR_RECRUITER must normalize to VENDOR_RECRUITER");
  });

  it("BUG-003 & BUG-009: should verify finalize-onboarding handler logic in user.ts and admin.ts", () => {
    const userHandler = fs.readFileSync("src/api-lib/handlers/user.ts", "utf-8");
    const adminHandler = fs.readFileSync("src/api-lib/handlers/admin.ts", "utf-8");

    assert.ok(userHandler.includes("existingUserSnap"), "user.ts finalize-onboarding must check existing user document for idempotency");
    assert.ok(adminHandler.includes("existingUserSnap"), "admin.ts finalize-onboarding must check existing user document for idempotency");
    assert.ok(userHandler.includes("chosenRole"), "user.ts finalize-onboarding must preserve chosenRole");
    assert.ok(adminHandler.includes("chosenRole"), "admin.ts finalize-onboarding must preserve chosenRole");
  });

  it("BUG-001: should verify sendEmailVerification is invoked and Auth user is NOT deleted on resume parser failure", () => {
    const onboarding = fs.readFileSync("src/views/Onboarding.tsx", "utf-8");
    const candidateModal = fs.readFileSync("src/components/CandidateRegisterModal.tsx", "utf-8");
    const directApply = fs.readFileSync("src/views/DirectCandidateApplyPage.tsx", "utf-8");

    assert.ok(onboarding.includes("sendEmailVerification("), "Onboarding.tsx must call sendEmailVerification");
    assert.ok(candidateModal.includes("sendEmailVerification("), "CandidateRegisterModal.tsx must call sendEmailVerification");
    assert.ok(directApply.includes("sendEmailVerification("), "DirectCandidateApplyPage.tsx must call sendEmailVerification");

    assert.strictEqual(candidateModal.includes("user.delete()"), false, "CandidateRegisterModal.tsx must NOT call user.delete() on parser/profile setup failure");
    assert.strictEqual(directApply.includes("activeUser.delete()"), false, "DirectCandidateApplyPage.tsx must NOT call activeUser.delete() on parser/profile setup failure");
  });

  it("BUG-006: should verify App.tsx handles PENDING_APPROVAL status without onboarding loop", () => {
    const appContent = fs.readFileSync("src/App.tsx", "utf-8");
    assert.ok(appContent.includes('userData?.status === "PENDING_APPROVAL"'), "App.tsx must check for PENDING_APPROVAL status");
    assert.ok(appContent.includes("Account Pending Approval"), "App.tsx must render Pending Approval view");
  });
  it("BUG-008: should sanitize raw Firebase auth error messages", () => {
    const rawError1 = { code: "auth/invalid-credential", message: "Firebase: Error (auth/invalid-credential)." };
    const rawError2 = { code: "auth/email-already-in-use", message: "Firebase: Error (auth/email-already-in-use)." };
    const rawError3 = { code: "auth/too-many-requests", message: "Firebase: Error (auth/too-many-requests)." };

    const sanitized1 = sanitizeAuthError(rawError1);
    const sanitized2 = sanitizeAuthError(rawError2);
    const sanitized3 = sanitizeAuthError(rawError3);

    assert.strictEqual(sanitized1, "Invalid email address or password. Please check your credentials and try again.");
    assert.strictEqual(sanitized2, "An account with this email address already exists. Please sign in or reset your password.");
    assert.ok(sanitized3.includes("Too many failed attempts"));
  });
});
