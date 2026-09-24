import crypto from "node:crypto";
import { AccessToken } from "livekit-server-sdk";

export interface LiveKitConfigStatus {
  status: "LIVEKIT_CONFIG_OK" | "LIVEKIT_CONFIG_MISSING" | "LIVEKIT_TOKEN_GENERATION_FAILED" | "LIVEKIT_TOKEN_REJECTED" | "LIVEKIT_ENDPOINT_UNREACHABLE";
  message: string;
  details?: {
    wsUrl?: string;
    httpUrl?: string;
    apiKeyPrefix?: string;
    apiKeySuffix?: string;
    secretLength?: number;
    secretSha256Prefix?: string;
    httpStatusCode?: number;
  };
}

export function normalizeLiveKitWebSocketUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim().replace(/\/+$/, "");
  if (clean.startsWith("http://")) return "ws://" + clean.slice(7);
  if (clean.startsWith("https://")) return "wss://" + clean.slice(8);
  if (!clean.startsWith("wss://") && !clean.startsWith("ws://")) return "wss://" + clean;
  return clean;
}

export function normalizeLiveKitHttpUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim().replace(/\/+$/, "");
  if (clean.startsWith("wss://")) return "https://" + clean.slice(6);
  if (clean.startsWith("ws://")) return "http://" + clean.slice(5);
  if (!clean.startsWith("https://") && !clean.startsWith("http://")) return "https://" + clean;
  return clean;
}

export async function verifyLiveKitConfiguration(): Promise<LiveKitConfigStatus> {
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
  const rawUrl = (process.env.LIVEKIT_URL || "").trim();

  if (!apiKey || !apiSecret || !rawUrl) {
    return {
      status: "LIVEKIT_CONFIG_MISSING",
      message: "One or more required LiveKit environment variables (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET) are missing."
    };
  }

  const wsUrl = normalizeLiveKitWebSocketUrl(rawUrl);
  const httpUrl = normalizeLiveKitHttpUrl(rawUrl);
  const apiKeyPrefix = apiKey.slice(0, 4);
  const apiKeySuffix = apiKey.slice(-4);
  const secretSha256Prefix = crypto.createHash("sha256").update(apiSecret).digest("hex").slice(0, 12);

  const testRoom = "healthcheck_room_" + Date.now();
  const testIdentity = "healthcheck_user_" + Date.now();

  let jwt = "";
  try {
    const at = new AccessToken(apiKey, apiSecret, {
      identity: testIdentity,
      ttl: 300
    });
    at.addGrant({
      roomJoin: true,
      room: testRoom,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true
    });
    jwt = await at.toJwt();
  } catch (err: any) {
    return {
      status: "LIVEKIT_TOKEN_GENERATION_FAILED",
      message: "AccessToken JWT generation failed: " + err.message,
      details: { wsUrl, httpUrl, apiKeyPrefix, apiKeySuffix, secretLength: apiSecret.length, secretSha256Prefix }
    };
  }

  // Verify JWT claims server-side
  try {
    const payloadBase64 = jwt.split(".")[1];
    const payload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString("utf-8"));
    const nowSeconds = Math.floor(Date.now() / 1000);

    if (payload.iss !== apiKey || payload.sub !== testIdentity || payload.exp <= nowSeconds) {
      return {
        status: "LIVEKIT_TOKEN_GENERATION_FAILED",
        message: "Generated LiveKit token failed internal claims verification.",
        details: { wsUrl, httpUrl, apiKeyPrefix, apiKeySuffix, secretLength: apiSecret.length, secretSha256Prefix }
      };
    }
  } catch (e: any) {
    return {
      status: "LIVEKIT_TOKEN_GENERATION_FAILED",
      message: "Failed to parse generated LiveKit token payload: " + e.message
    };
  }

  // Ping LiveKit validation endpoint /rtc/validate
  try {
    const res = await fetch(`${httpUrl}/rtc/validate?access_token=${jwt}`);

    if (res.status === 401) {
      return {
        status: "LIVEKIT_TOKEN_REJECTED",
        message: "LiveKit Cloud rejected access token authorization on /rtc/validate (401 Unauthorized). Check API Key / Secret alignment with LiveKit Cloud Project.",
        details: { wsUrl, httpUrl, apiKeyPrefix, apiKeySuffix, secretLength: apiSecret.length, secretSha256Prefix, httpStatusCode: 401 }
      };
    }

    if (!res.ok) {
      return {
        status: "LIVEKIT_ENDPOINT_UNREACHABLE",
        message: `LiveKit validation endpoint returned unexpected HTTP status: ${res.status}`,
        details: { wsUrl, httpUrl, apiKeyPrefix, apiKeySuffix, secretLength: apiSecret.length, secretSha256Prefix, httpStatusCode: res.status }
      };
    }

    return {
      status: "LIVEKIT_CONFIG_OK",
      message: "LiveKit credentials and endpoint verification succeeded.",
      details: { wsUrl, httpUrl, apiKeyPrefix, apiKeySuffix, secretLength: apiSecret.length, secretSha256Prefix, httpStatusCode: 200 }
    };
  } catch (netErr: any) {
    return {
      status: "LIVEKIT_ENDPOINT_UNREACHABLE",
      message: "Failed to connect to LiveKit endpoint: " + netErr.message,
      details: { wsUrl, httpUrl, apiKeyPrefix, apiKeySuffix, secretLength: apiSecret.length, secretSha256Prefix }
    };
  }
}
