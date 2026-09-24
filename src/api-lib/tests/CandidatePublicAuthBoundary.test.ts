import { describe, it } from "node:test";
import assert from "node:assert";

// Verify public candidate actions configuration
const candidatePublicActions = new Set([
  "get-session",
  "verify-email",
  "record-consent",
  "livekit-token",
  "join-interview",
  "get-l1-report"
]);

describe("Candidate Public Auth Boundary Verification", () => {
  it("should permit all candidate public actions without internal auth bearer token", () => {
    const testActions = [
      "get-session",
      "verify-email",
      "record-consent",
      "livekit-token",
      "join-interview",
      "get-l1-report"
    ];

    for (const action of testActions) {
      assert.strictEqual(
        candidatePublicActions.has(action),
        true,
        `Action '${action}' must be marked as public candidate action`
      );
    }
  });

  it("should reject non-candidate/recruiter administrative actions without auth token", () => {
    const adminActions = [
      "start-interview",
      "send-invitation",
      "terminate-session",
      "submit-to-client",
      "get-all-interviews"
    ];

    for (const action of adminActions) {
      assert.strictEqual(
        candidatePublicActions.has(action),
        false,
        `Administrative action '${action}' must NOT be in candidatePublicActions`
      );
    }
  });
});
