import { describe, it } from "node:test";
import assert from "node:assert";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

describe("Firebase Admin & jwks-rsa / jose CommonJS Compatibility Test", () => {
  it("should successfully require jwks-rsa without ERR_REQUIRE_ESM failure", () => {
    let jwks: any = null;
    assert.doesNotThrow(() => {
      jwks = require("jwks-rsa");
    }, "Requiring jwks-rsa must not throw ERR_REQUIRE_ESM");

    assert.ok(jwks, "jwks-rsa module should be loaded");
    assert.strictEqual(typeof jwks, "function", "jwks-rsa default export should be a function");
  });

  it("should initialize firebase-admin without throwing CommonJS module errors", async () => {
    const admin = require("firebase-admin");
    assert.ok(admin, "firebase-admin module should be loaded");
  });

  it("should maintain LiveKit server SDK token generation with jose v5", async () => {
    const { AccessToken } = await import("livekit-server-sdk");
    const testApiKey = "APIKEY_TEST_123456789";
    const testApiSecret = "SECRET_TEST_987654321_ABCDEF_GHIJKL_MNOPQR";

    const at = new AccessToken(testApiKey, testApiSecret, {
      identity: "test_candidate_jose_compat",
      ttl: 1800
    });

    at.addGrant({
      roomJoin: true,
      room: "compat_test_room"
    });

    const jwt = await at.toJwt();
    assert.ok(jwt, "LiveKit AccessToken JWT should be generated");
    assert.strictEqual(typeof jwt, "string", "JWT should be a string");
  });
});
