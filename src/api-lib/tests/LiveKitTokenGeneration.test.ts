import { describe, it } from "node:test";
import assert from "node:assert";
import { AccessToken } from "livekit-server-sdk";

describe("LiveKit AccessToken JWT Generation & Runtime Compatibility", () => {
  const testApiKey = "APIKEY_TEST_123456789";
  const testApiSecret = "SECRET_TEST_987654321_ABCDEF_GHIJKL_MNOPQR";
  const testRoom = "session_test_room_001";
  const testIdentity = "candidate_test_user_001";

  it("should successfully generate a valid JWT using numeric TTL (1800s) without duration parsing error", async () => {
    const at = new AccessToken(testApiKey, testApiSecret, {
      identity: testIdentity,
      ttl: 1800
    });

    at.addGrant({
      roomJoin: true,
      room: testRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });

    const jwt = await at.toJwt();
    assert.ok(jwt, "JWT string should be generated");
    assert.strictEqual(typeof jwt, "string", "JWT should be a string");
    assert.strictEqual(jwt.split(".").length, 3, "JWT should consist of 3 base64 url-encoded parts");

    // Decode payload (middle segment)
    const payloadBase64 = jwt.split(".")[1];
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    // Verify JWT Claims
    assert.strictEqual(payload.iss, testApiKey, "iss claim should match API Key");
    assert.strictEqual(payload.sub, testIdentity, "sub claim should match participant identity");
    assert.ok(payload.exp, "exp claim must exist");
    assert.ok(payload.nbf, "nbf claim must exist");
    assert.ok(payload.exp > payload.nbf, "exp should be strictly greater than nbf");

    // Verify Video Grants
    assert.ok(payload.video, "video grant object must exist");
    assert.strictEqual(payload.video.roomJoin, true, "video.roomJoin must be true");
    assert.strictEqual(payload.video.room, testRoom, "video.room must match expected room");
    assert.strictEqual(payload.video.canPublish, true, "video.canPublish must be true");
    assert.strictEqual(payload.video.canSubscribe, true, "video.canSubscribe must be true");
  });

  it("should be compatible with Vercel/Node ESM runtime without jose time format errors", async () => {
    // Test multiple numeric TTLs (e.g. 300s for dispatch, 1800s for room token)
    for (const ttlSeconds of [300, 1800, 3600]) {
      const at = new AccessToken(testApiKey, testApiSecret, {
        identity: `test_${ttlSeconds}`,
        ttl: ttlSeconds
      });
      at.addGrant({ roomJoin: true, room: testRoom });
      const jwt = await at.toJwt();
      assert.ok(jwt.length > 50, `Token for TTL ${ttlSeconds}s must be a valid JWT`);
    }
  });
});
