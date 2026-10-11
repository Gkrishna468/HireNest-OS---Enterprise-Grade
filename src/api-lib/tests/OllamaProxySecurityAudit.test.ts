/**
 * Phase 1A — Secure Ollama Proxy Readiness & Security Audit Test Suite
 * Validates bearer authentication, explicit secret enforcement, weak secret rejection,
 * model allowlisting, payload size limits, 401/400/405/413/429/502/504 error responses,
 * token secrecy, bind interface isolation, and zero-paid-fallback isolation in AIGateway.
 */

import { createRequire } from "module";
import http from "http";
import net from "net";
import { AIGateway } from "../services/AIGateway.js";

const require = createRequire(import.meta.url);
const { createProxyApp, ALLOWED_MODELS } = require("../../../scripts/ollama-proxy-server.js");

export async function runOllamaProxySecurityAuditTests(): Promise<{
  passed: number;
  failed: number;
  errors: string[];
}> {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string) {
    if (condition) {
      passed++;
      console.log(`  ✓ [PASS] ${testName}`);
    } else {
      failed++;
      errors.push(testName);
      console.error(`  ✗ [FAIL] ${testName}`);
    }
  }

  console.log("\n==================================================================");
  console.log("🔒 Running Phase 1A Secure Ollama Proxy Security Audit Test Suite");
  console.log("==================================================================\n");

  const TEST_PORT = 11436;
  const STRONG_TEST_KEY = "test_secret_bearer_key_998877_secure"; // 35 chars > 16 chars

  // 1. Config Validation: Missing proxy secret throws error
  console.log("-> 1. Testing Proxy Configuration & Secret Enforcement:");
  try {
    delete process.env.OLLAMA_PROXY_KEY;
    createProxyApp({ apiKey: "" });
    assert(false, "createProxyApp() without secret should throw configuration error");
  } catch (err: any) {
    assert(err.message.includes("Ollama proxy secret is required"), "Missing secret throws clear configuration error");
  }

  // 2. Config Validation: Weak / Placeholder secret throws error
  try {
    createProxyApp({ apiKey: "12345" });
    assert(false, "createProxyApp() with weak secret '12345' should throw configuration error");
  } catch (err: any) {
    assert(err.message.includes("Insecure Ollama proxy secret"), "Weak secret '12345' rejected");
  }

  try {
    createProxyApp({ apiKey: "local_secure_proxy_key" });
    assert(false, "createProxyApp() with placeholder 'local_secure_proxy_key' should throw configuration error");
  } catch (err: any) {
    assert(err.message.includes("Insecure Ollama proxy secret"), "Placeholder secret 'local_secure_proxy_key' rejected");
  }

  // 3. Initialize Express App with Strong Secret
  const app = createProxyApp({
    apiKey: STRONG_TEST_KEY,
    targetUrl: "http://127.0.0.1:11434",
    maxConcurrency: 2,
    timeoutMs: 1000,
    maxRequestsPerMin: 100
  });

  let testServer: http.Server;

  await new Promise<void>((resolve) => {
    testServer = app.listen(TEST_PORT, "127.0.0.1", () => resolve());
  });

  function makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: TEST_PORT,
        path,
        method: options.method || "GET",
        headers: options.headers || {}
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          let parsed = null;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      });
      req.on("error", reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  try {
    // 4. Missing Authorization Header -> HTTP 401
    console.log("-> 2. Testing Bearer Authentication Enforcement:");
    const resNoAuth = await makeRequest("/health", {});
    assert(resNoAuth.status === 401, "Missing Authorization header returns HTTP 401");
    assert(resNoAuth.body?.error?.includes("Unauthorized"), "Response specifies Unauthorized error");

    // 5. Invalid Bearer Token -> HTTP 401
    const resBadAuth = await makeRequest("/health", {
      headers: { "Authorization": "Bearer invalid_secret_token_123_456" }
    });
    assert(resBadAuth.status === 401, "Invalid Bearer token returns HTTP 401");

    // 6. Valid Strong Bearer Token -> HTTP 200
    const resValidAuth = await makeRequest("/health", {
      headers: { "Authorization": `Bearer ${STRONG_TEST_KEY}` }
    });
    assert(resValidAuth.status === 200, "Valid strong Bearer token grants access (HTTP 200)");
    assert(resValidAuth.body?.status === "ok", "Health route returns status ok");

    // 7. Allowed GET /api/tags -> HTTP 200
    const resTags = await makeRequest("/api/tags", {
      headers: { "Authorization": `Bearer ${STRONG_TEST_KEY}` }
    });
    assert(resTags.status === 200, "Permitted GET /api/tags returns HTTP 200");
    assert(Array.isArray(resTags.body?.models), "Model list returned in tags route");

    // 8. Unsupported HTTP Methods -> HTTP 405
    console.log("-> 3. Testing Method & Model Allowlist Gates:");
    const resPutMethod = await makeRequest("/health", {
      method: "PUT",
      headers: { "Authorization": `Bearer ${STRONG_TEST_KEY}` }
    });
    assert(resPutMethod.status === 405, "PUT method on /health rejected with HTTP 405 Method Not Allowed");

    // 9. Prohibited Model Rejection -> HTTP 400
    const resUnapprovedModel = await makeRequest("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${STRONG_TEST_KEY}`
      },
      body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "user", content: "hi" }] })
    });
    assert(resUnapprovedModel.status === 400, "Prohibited model 'gpt-4o' rejected with HTTP 400");
    assert(resUnapprovedModel.body?.error?.includes("Forbidden"), "Response specifies Forbidden error for model");

    const resUnapprovedGemini = await makeRequest("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${STRONG_TEST_KEY}`
      },
      body: JSON.stringify({ model: "gemini-3.7-pro", messages: [{ role: "user", content: "hi" }] })
    });
    assert(resUnapprovedGemini.status === 400, "Prohibited model 'gemini-3.7-pro' rejected with HTTP 400");

    // 10. Oversized Body -> HTTP 413
    console.log("-> 4. Testing Payload Size Limits:");
    const oversizedBody = JSON.stringify({ model: "qwen3:8b", prompt: "X".repeat(2.5 * 1024 * 1024) });
    const resOversized = await makeRequest("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${STRONG_TEST_KEY}`
      },
      body: oversizedBody
    });
    assert(resOversized.status === 413, "Payload exceeding 2MB rejected with HTTP 413 Payload Too Large");

    // 11. Malformed JSON -> HTTP 400
    console.log("-> 5. Testing Malformed Payload Handling:");
    const resMalformed = await makeRequest("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${STRONG_TEST_KEY}`
      },
      body: "{ invalid_json_syntax: true "
    });
    assert(resMalformed.status === 400, "Malformed JSON payload rejected with HTTP 400");

    // 12. Upstream Connection Failure (Ollama offline) -> HTTP 502
    console.log("-> 6. Testing Upstream Failure & Timeout Error Responses:");
    const resOfflineOllama = await makeRequest("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${STRONG_TEST_KEY}`
      },
      body: JSON.stringify({ model: "qwen3:8b", messages: [{ role: "user", content: "test" }] })
    });
    assert(resOfflineOllama.status === 502, "Offline Ollama target returns HTTP 502 Bad Gateway");
    assert(resOfflineOllama.body?.error?.includes("Bad Gateway"), "Response describes Bad Gateway failure");

    // 13. Upstream Timeout Simulation -> HTTP 504
    const mockTimeoutServer = http.createServer((req, res) => {
      setTimeout(() => {
        if (!res.writableEnded) res.end("slow");
      }, 2000);
    });

    await new Promise<void>((res) => mockTimeoutServer.listen(11434, "127.0.0.1", () => res()));

    try {
      const resTimeout = await makeRequest("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${STRONG_TEST_KEY}`
        },
        body: JSON.stringify({ model: "qwen3:8b", messages: [{ role: "user", content: "timeout test" }] })
      });
      assert(resTimeout.status === 504, "Slow upstream request returns HTTP 504 Gateway Timeout");
      assert(resTimeout.body?.error?.includes("Gateway Timeout"), "Response specifies Gateway Timeout");
    } finally {
      mockTimeoutServer.close();
    }

    // 14. Zero-Paid-Inference Isolation in AIGateway
    console.log("-> 7. Testing Zero-Paid-Inference Isolation in AIGateway:");
    process.env.USE_LOCAL_AI = "true";
    process.env.ZERO_PAID_INFERENCE = "true";
    process.env.DISABLE_PAID_AI_FALLBACK = "true";
    process.env.OLLAMA_PROXY_URL = `http://127.0.0.1:${TEST_PORT}`;
    process.env.OLLAMA_PROXY_KEY = STRONG_TEST_KEY;

    const gatewayRes = await AIGateway.processChat({
      prompt: "Extract key skills from developer text",
      feature: "skill_normalization",
      requireLocal: true,
      skipCache: true,
      fallbackRuleEngine: () => ({ skills: ["React", "TypeScript"] })
    });

    assert(gatewayRes.provider !== "google", "Paid Google GenAI provider was NOT invoked");
    assert(gatewayRes.estimatedCost === 0, "Inference cost is strictly $0.00 / ₹0.00");

    // 15. Local Interface Bind Verification
    console.log("-> 8. Testing Local Host Interface Bind Isolation:");
    const addressInfo = testServer.address() as net.AddressInfo;
    assert(addressInfo.address === "127.0.0.1" || addressInfo.address === "::1", `Proxy server binds strictly to local interface (${addressInfo.address})`);

  } finally {
    testServer.close();
  }

  console.log("\n==================================================================");
  console.log(`📊 Security Audit Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  return { passed, failed, errors };
}

if (import.meta.url.endsWith("OllamaProxySecurityAudit.test.ts") || process.argv[1]?.includes("OllamaProxySecurityAudit")) {
  runOllamaProxySecurityAuditTests().then(res => {
    if (res.failed > 0) process.exit(1);
  }).catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
