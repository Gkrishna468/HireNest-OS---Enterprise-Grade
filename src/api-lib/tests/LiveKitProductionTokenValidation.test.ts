import { describe, it } from "node:test";
import assert from "node:assert";
import { AccessToken } from "livekit-server-sdk";
import {
  normalizeLiveKitWebSocketUrl,
  normalizeLiveKitHttpUrl,
  verifyLiveKitConfiguration
} from "../../services/livekitConfigurationService.js";

describe("LiveKit Production Token Validation & Configuration Audit", () => {
  it("should correctly normalize raw LiveKit URLs for WebSocket and HTTP transports", () => {
    const rawVariants = [
      "https://hirenest-os-4yez98b9.livekit.cloud/",
      "wss://hirenest-os-4yez98b9.livekit.cloud",
      "hirenest-os-4yez98b9.livekit.cloud/",
      " http://localhost:7880/ "
    ];

    const expectedWs = [
      "wss://hirenest-os-4yez98b9.livekit.cloud",
      "wss://hirenest-os-4yez98b9.livekit.cloud",
      "wss://hirenest-os-4yez98b9.livekit.cloud",
      "ws://localhost:7880"
    ];

    const expectedHttp = [
      "https://hirenest-os-4yez98b9.livekit.cloud",
      "https://hirenest-os-4yez98b9.livekit.cloud",
      "https://hirenest-os-4yez98b9.livekit.cloud",
      "http://localhost:7880"
    ];

    for (let i = 0; i < rawVariants.length; i++) {
      assert.strictEqual(
        normalizeLiveKitWebSocketUrl(rawVariants[i]),
        expectedWs[i],
        `WebSocket URL normalization failed for ${rawVariants[i]}`
      );
      assert.strictEqual(
        normalizeLiveKitHttpUrl(rawVariants[i]),
        expectedHttp[i],
        `HTTP URL normalization failed for ${rawVariants[i]}`
      );
    }
  });

  it("should generate a JWT that satisfies all LiveKit Cloud claim requirements", async () => {
    const apiKey = "APIuTestKey123456";
    const apiSecret = "SecretTestKey987654321012345678901234567890";
    const identity = "candidate_session_test_401";
    const room = "room_session_test_401";

    const at = new AccessToken(apiKey, apiSecret, { identity, ttl: 1800 });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });

    const jwt = await at.toJwt();
    assert.ok(jwt, "Token should be generated");

    const payloadBase64 = jwt.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8"));
    const now = Math.floor(Date.now() / 1000);

    assert.strictEqual(payload.iss, apiKey);
    assert.strictEqual(payload.sub, identity);
    assert.ok(payload.exp > now);
    assert.ok(payload.nbf <= now);
    assert.strictEqual(payload.video.roomJoin, true);
    assert.strictEqual(payload.video.room, room);
    assert.strictEqual(payload.video.canPublish, true);
    assert.strictEqual(payload.video.canSubscribe, true);
  });

  it("should execute verifyLiveKitConfiguration and validate endpoint response", async () => {
    const result = await verifyLiveKitConfiguration();
    assert.ok(result, "verifyLiveKitConfiguration should return a status object");
    assert.ok(result.status, "Status should exist");
    assert.ok(["LIVEKIT_CONFIG_OK", "LIVEKIT_CONFIG_MISSING", "LIVEKIT_TOKEN_REJECTED", "LIVEKIT_ENDPOINT_UNREACHABLE"].includes(result.status));

    if (result.status === "LIVEKIT_CONFIG_OK") {
      assert.strictEqual(result.details?.httpStatusCode, 200, "HTTP Status should be 200 when status is LIVEKIT_CONFIG_OK");
    }
  });
});
