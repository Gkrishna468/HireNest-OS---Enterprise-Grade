/**
 * Phase 1A — Secure Ollama Proxy Readiness & Security Audit Test Suite
 * Validates bearer authentication, explicit secret enforcement, weak secret rejection,
 * model allowlisting, payload size limits, 401/400/405/413/429/502/504 error responses,
 * token secrecy, bind interface isolation, and zero-paid-fallback isolation in AIGateway.
 *
 * Uses ephemeral ports (port 0) for mock upstream servers to prevent port collisions (EADDRINUSE)
 * when a real Ollama service is running on 127.0.0.1:11434.
 */

import { createRequire } from "module";
import http from "http";
import net from "net";
import { AIGateway } from "../services/AIGateway.js";

const require = createRequire(import.meta.url);
const { createProxyApp, startServer } = require("../../../scripts/ollama-proxy-server.cjs");

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

  const STRONG_TEST_KEY = "test_secret_bearer_key_998877_secure"; // 35 chars (> 16 chars)

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

  // Setup Mock Active Upstream Ollama Server on Ephemeral Port (Port 0)
  const mockUpstreamServer = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: { content: "Mock Ollama Response OK" } }));
  });
  mockUpstreamServer.on("error", (err) => console.warn("[Test Mock Upstream Warning]:", err.message));

  await new Promise<void>((resolve) => {
    mockUpstreamServer.listen(0, "127.0.0.1", () => resolve());
  });

  const mockUpstreamPort = (mockUpstreamServer.address() as net.AddressInfo).port;
  const mockUpstreamUrl = `http://127.0.0.1:${mockUpstreamPort}`;

  // Initialize Primary Test Proxy App
  const app = createProxyApp({
    apiKey: STRONG_TEST_KEY,
    targetUrl: mockUpstreamUrl,
    maxConcurrency: 2,
    timeoutMs: 1000,
    maxRequestsPerMin: 100
  });

  let testProxyServer: http.Server;
  await new Promise<void>((resolve) => {
    testProxyServer = app.listen(0, "127.0.0.1", () => resolve());
  });

  testProxyServer.on("error", (err) => console.warn("[Test Proxy Server Warning]:", err.message));

  const testProxyPort = (testProxyServer.address() as net.AddressInfo).port;

  function makeRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: string }): Promise<{ status: number; body: any }> {
    return new Promise((resolve, reject) => {
      const req = http.request({
        hostname: "127.0.0.1",
        port: testProxyPort,
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
      req.on("error", (err) => {
        // Prevent unhandled request error crash
        resolve({ status: 500, body: { error: err.message } });
      });
      if (options.body) req.write(options.body);
      req.end();
    });
  }

  try {
    // 3. Missing Authorization Header -> HTTP 401
    console.log("-> 2. Testing Bearer Authentication Enforcement:");
    const resNoAuth = await makeRequest("/health", {});
    assert(resNoAuth.status === 401, "Missing Authorization header returns HTTP 401");
    assert(resNoAuth.body?.error?.includes("Unauthorized"), "Response specifies Unauthorized error");

    // 4. Invalid Bearer Token -> HTTP 401
    const resBadAuth = await makeRequest("/health", {
      headers: { "Authorization": "Bearer invalid_secret_token_123_456" }
    });
    assert(resBadAuth.status === 401, "Invalid Bearer token returns HTTP 401");

    // 5. Valid Strong Bearer Token -> HTTP 200
    const resValidAuth = await makeRequest("/health", {
      headers: { "Authorization": `Bearer ${STRONG_TEST_KEY}` }
    });
    assert(resValidAuth.status === 200, "Valid strong Bearer token grants access (HTTP 200)");
    assert(resValidAuth.body?.status === "ok", "Health route returns status ok");

    // 6. Allowed GET /api/tags -> HTTP 200
    const resTags = await makeRequest("/api/tags", {
      headers: { "Authorization": `Bearer ${STRONG_TEST_KEY}` }
    });
    assert(resTags.status === 200, "Permitted GET /api/tags returns HTTP 200");
    assert(Array.isArray(resTags.body?.models), "Model list returned in tags route");

    // 7. Unsupported HTTP Methods -> HTTP 405
    console.log("-> 3. Testing Method & Model Allowlist Gates:");
    const resPutMethod = await makeRequest("/health", {
      method: "PUT",
      headers: { "Authorization": `Bearer ${STRONG_TEST_KEY}` }
    });
    assert(resPutMethod.status === 405, "PUT method on /health rejected with HTTP 405 Method Not Allowed");

    // 8. Prohibited Model Rejection -> HTTP 400
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

    // 9. Oversized Body -> HTTP 413
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

    // 10. Malformed JSON -> HTTP 400
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

    // 11. Upstream Connection Failure (Offline Target) -> HTTP 502
    console.log("-> 6. Testing Upstream Failure & Timeout Error Responses:");
    // Create a known closed port on localhost
    const dummyServer = net.createServer();
    await new Promise<void>((resolve) => dummyServer.listen(0, "127.0.0.1", () => resolve()));
    const closedPort = (dummyServer.address() as net.AddressInfo).port;
    await new Promise<void>((resolve) => dummyServer.close(() => resolve()));

    const offlineProxyApp = createProxyApp({
      apiKey: STRONG_TEST_KEY,
      targetUrl: `http://127.0.0.1:${closedPort}`,
      timeoutMs: 1000
    });

    let offlineProxyServer: http.Server;
    await new Promise<void>((resolve) => {
      offlineProxyServer = offlineProxyApp.listen(0, "127.0.0.1", () => resolve());
    });
    offlineProxyServer.on("error", (err) => console.warn("[Offline Proxy Warning]:", err.message));

    const offlineProxyPort = (offlineProxyServer.address() as net.AddressInfo).port;

    try {
      const resOffline = await new Promise<{ status: number; body: any }>((resolve) => {
        const req = http.request({
          hostname: "127.0.0.1",
          port: offlineProxyPort,
          path: "/api/chat",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${STRONG_TEST_KEY}`
          }
        }, (res) => {
          let data = "";
          res.on("data", chunk => data += chunk);
          res.on("end", () => {
            let parsed = null;
            try { parsed = JSON.parse(data); } catch { parsed = data; }
            resolve({ status: res.statusCode || 500, body: parsed });
          });
        });
        req.on("error", (err) => resolve({ status: 500, body: { error: err.message } }));
        req.write(JSON.stringify({ model: "qwen3:8b", messages: [{ role: "user", content: "test" }] }));
        req.end();
      });

      assert(resOffline.status === 502, "Offline upstream target returns HTTP 502 Bad Gateway");
      assert(resOffline.body?.error?.includes("Bad Gateway"), "Response describes Bad Gateway failure");
    } finally {
      offlineProxyServer.close();
    }

    // 12. Upstream Timeout & Slow CPU Inference Simulation
    console.log("-> 6. Testing Upstream Slow CPU Inference & Timeout Handling:");

    // 12a. Successful Slow Inference Within Timeout Window
    const mockSlowServer = http.createServer((req, res) => {
      // Delay 200ms to simulate slow CPU inference
      setTimeout(() => {
        if (!res.writableEnded) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ response: "HIRENEST_LOCAL_AI_OK", model: "qwen3:8b" }));
        }
      }, 200);
    });
    mockSlowServer.on("error", (err) => console.warn("[Slow Server Warning]:", err.message));
    await new Promise<void>((res) => mockSlowServer.listen(0, "127.0.0.1", () => res()));
    const mockSlowPort = (mockSlowServer.address() as net.AddressInfo).port;

    const slowProxyApp = createProxyApp({
      apiKey: STRONG_TEST_KEY,
      targetUrl: `http://127.0.0.1:${mockSlowPort}`,
      timeoutMs: 1000 // 1000ms > 200ms delay
    });

    let slowProxyServer: http.Server;
    await new Promise<void>((resolve) => {
      slowProxyServer = slowProxyApp.listen(0, "127.0.0.1", () => resolve());
    });
    slowProxyServer.on("error", (err) => console.warn("[Slow Proxy Warning]:", err.message));
    const slowProxyPort = (slowProxyServer.address() as net.AddressInfo).port;

    try {
      // Fast /health check on slow proxy app (should not wait for upstream model)
      const startHealth = Date.now();
      const resHealthFast = await new Promise<{ status: number; body: any }>((resolve) => {
        const req = http.request({
          hostname: "127.0.0.1",
          port: slowProxyPort,
          path: "/health",
          method: "GET",
          headers: { "Authorization": `Bearer ${STRONG_TEST_KEY}` }
        }, (res) => {
          let data = "";
          res.on("data", chunk => data += chunk);
          res.on("end", () => {
            let parsed = null;
            try { parsed = JSON.parse(data); } catch { parsed = data; }
            resolve({ status: res.statusCode || 500, body: parsed });
          });
        });
        req.end();
      });
      const healthDuration = Date.now() - startHealth;
      assert(resHealthFast.status === 200, "GET /health responds with HTTP 200");
      assert(healthDuration < 100, `GET /health responds immediately (${healthDuration}ms) without invoking model`);

      // POST /api/generate slow CPU inference test
      const resSlowInference = await new Promise<{ status: number; body: any }>((resolve) => {
        const req = http.request({
          hostname: "127.0.0.1",
          port: slowProxyPort,
          path: "/api/generate",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${STRONG_TEST_KEY}`
          }
        }, (res) => {
          let data = "";
          res.on("data", chunk => data += chunk);
          res.on("end", () => {
            let parsed = null;
            try { parsed = JSON.parse(data); } catch { parsed = data; }
            resolve({ status: res.statusCode || 500, body: parsed });
          });
        });
        req.on("error", (err) => resolve({ status: 500, body: { error: err.message } }));
        req.write(JSON.stringify({ model: "qwen3:8b", prompt: "Reply with HIRENEST_LOCAL_AI_OK" }));
        req.end();
      });

      assert(resSlowInference.status === 200, "Slow local CPU inference within timeout window succeeds (HTTP 200)");
      assert(resSlowInference.body?.response === "HIRENEST_LOCAL_AI_OK", "Slow inference returns expected Ollama payload");
    } finally {
      slowProxyServer.close();
      mockSlowServer.close();
    }

    // 12b. Genuine Timeout Simulation Beyond Configured TIMEOUT_MS -> HTTP 504
    const mockTimeoutServer = http.createServer((req, res) => {
      // Delay response past 300ms timeout
      setTimeout(() => {
        if (!res.writableEnded) res.end("slow");
      }, 1500);
    });
    mockTimeoutServer.on("error", (err) => console.warn("[Timeout Server Warning]:", err.message));

    await new Promise<void>((res) => mockTimeoutServer.listen(0, "127.0.0.1", () => res()));
    const mockTimeoutPort = (mockTimeoutServer.address() as net.AddressInfo).port;

    const timeoutProxyApp = createProxyApp({
      apiKey: STRONG_TEST_KEY,
      targetUrl: `http://127.0.0.1:${mockTimeoutPort}`,
      timeoutMs: 300
    });

    let timeoutProxyServer: http.Server;
    await new Promise<void>((resolve) => {
      timeoutProxyServer = timeoutProxyApp.listen(0, "127.0.0.1", () => resolve());
    });
    timeoutProxyServer.on("error", (err) => console.warn("[Timeout Proxy Warning]:", err.message));

    const timeoutProxyPort = (timeoutProxyServer.address() as net.AddressInfo).port;

    try {
      const resTimeout = await new Promise<{ status: number; body: any }>((resolve) => {
        const req = http.request({
          hostname: "127.0.0.1",
          port: timeoutProxyPort,
          path: "/api/chat",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${STRONG_TEST_KEY}`
          }
        }, (res) => {
          let data = "";
          res.on("data", chunk => data += chunk);
          res.on("end", () => {
            let parsed = null;
            try { parsed = JSON.parse(data); } catch { parsed = data; }
            resolve({ status: res.statusCode || 500, body: parsed });
          });
        });
        req.on("error", (err) => resolve({ status: 500, body: { error: err.message } }));
        req.write(JSON.stringify({ model: "qwen3:8b", messages: [{ role: "user", content: "timeout test" }] }));
        req.end();
      });

      assert(resTimeout.status === 504, "Genuine timeout beyond TIMEOUT_MS returns HTTP 504 Gateway Timeout");
      assert(resTimeout.body?.error?.includes("Gateway Timeout"), "Response specifies Gateway Timeout error");
    } finally {
      timeoutProxyServer.close();
      mockTimeoutServer.close();
    }

    // 13. Zero-Paid-Inference Isolation in AIGateway
    console.log("-> 7. Testing Zero-Paid-Inference Isolation in AIGateway:");
    process.env.USE_LOCAL_AI = "true";
    process.env.ZERO_PAID_INFERENCE = "true";
    process.env.DISABLE_PAID_AI_FALLBACK = "true";
    process.env.OLLAMA_PROXY_URL = `http://127.0.0.1:${testProxyPort}`;
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

    // 14. Local Interface Bind Verification & Async startServer Test
    console.log("-> 8. Testing Local Host Interface Bind Isolation:");
    const addressInfo = testProxyServer.address() as net.AddressInfo;
    assert(addressInfo.address === "127.0.0.1" || addressInfo.address === "::1", `Proxy server binds strictly to local interface (${addressInfo.address})`);

    const asyncStartedServer = await startServer({
      port: 0,
      host: "127.0.0.1",
      apiKey: STRONG_TEST_KEY
    });
    const asyncAddr = asyncStartedServer.address() as net.AddressInfo;
    assert(asyncAddr.address === "127.0.0.1" || asyncAddr.address === "::1", "Async startServer succeeds and verifies loopback bind address");
    await new Promise<void>((res) => asyncStartedServer.close(() => res()));

  } finally {
    testProxyServer.close();
    mockUpstreamServer.close();
  }

  console.log("\n==================================================================");
  console.log(`📊 Security Audit Summary: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================================\n");

  return { passed, failed, errors };
}

if (process.argv[1] && process.argv[1].includes("OllamaProxySecurityAudit")) {
  runOllamaProxySecurityAuditTests().then(res => {
    if (res.failed > 0) process.exit(1);
  }).catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
}
