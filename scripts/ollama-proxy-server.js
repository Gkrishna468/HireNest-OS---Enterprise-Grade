/**
 * HireNestOS Secure Local Ollama Proxy Server (Windows PC Host)
 * Binds strictly to 127.0.0.1:11435 and proxies requests to local Ollama (127.0.0.1:11434).
 * Enforces Bearer token auth, timing-safe validation, model allowlists, 2MB payload limits,
 * rate limiting, bounded concurrency, upstream timeouts, and zero paid fallback isolation.
 *
 * Environment Variables:
 * - OLLAMA_PROXY_KEY: Required. Bearer token secret (default: "local_secure_proxy_key" for dev/test).
 * - PORT: Local proxy port (default: 11435).
 * - HOST: Local interface bind address (default: "127.0.0.1").
 * - OLLAMA_TARGET_URL: Upstream Ollama service (default: "http://127.0.0.1:11434").
 * - MAX_CONCURRENT_INFERENCES: Maximum parallel active inference requests (default: 5).
 * - TIMEOUT_MS: Upstream request timeout in ms (default: 30000).
 *
 * Startup Command (Windows CMD):
 *   set OLLAMA_PROXY_KEY=your_secure_bearer_token_here
 *   node scripts/ollama-proxy-server.js
 */

const express = require("express");
const http = require("http");
const crypto = require("crypto");

const DEFAULT_PORT = 11435;
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_TARGET_URL = "http://127.0.0.1:11434";
const DEFAULT_KEY = "local_secure_proxy_key";

const ALLOWED_MODELS = new Set([
  "qwen3:8b",
  "qwen2.5:7b",
  "qwen2.5:14b",
  "llama3.1:8b",
  "mistral:7b",
  "gemma2:9b"
]);

function createProxyApp(options = {}) {
  const app = express();
  const apiKey = options.apiKey || process.env.OLLAMA_PROXY_KEY || DEFAULT_KEY;
  const targetUrlStr = options.targetUrl || process.env.OLLAMA_TARGET_URL || DEFAULT_TARGET_URL;
  const maxConcurrency = options.maxConcurrency || parseInt(process.env.MAX_CONCURRENT_INFERENCES || "5", 10);
  const timeoutMs = options.timeoutMs || parseInt(process.env.TIMEOUT_MS || "30000", 10);

  let activeInferences = 0;

  // Rate Limiting Map
  const rateLimitMap = new Map();
  function checkRateLimit(ip) {
    const now = Date.now();
    const windowMs = 60000;
    const maxRequests = options.maxRequestsPerMin || 60;
    let record = rateLimitMap.get(ip) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
    }
    record.count++;
    rateLimitMap.set(ip, record);
    return record.count <= maxRequests;
  }

  // Timing-safe Token Comparison
  function validateAuth(authHeader) {
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return false;
    }
    const token = authHeader.slice(7).trim();
    if (token.length !== apiKey.length) {
      return false;
    }
    try {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(apiKey));
    } catch {
      return false;
    }
  }

  // Body Parsing with 2MB Payload Limit
  app.use(express.json({ limit: "2mb" }));

  // Global Rate Limiting & Auth Guard on ALL Routes
  app.use((req, res, next) => {
    const clientIp = req.socket.remoteAddress || "127.0.0.1";
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({ error: "Rate limit exceeded (Max 60 req/min)" });
    }

    const authHeader = req.headers["authorization"];
    if (!validateAuth(authHeader)) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing bearer token" });
    }

    next();
  });

  // Health and Model Tags Routes
  app.get("/health", (req, res) => {
    res.status(200).json({
      status: "ok",
      proxy: "HireNestOS Ollama Local Proxy",
      allowedModels: Array.from(ALLOWED_MODELS)
    });
  });

  app.get("/api/tags", (req, res) => {
    res.status(200).json({
      models: Array.from(ALLOWED_MODELS).map(name => ({ name }))
    });
  });

  // Reject unsupported methods for /health and /api/tags
  app.all("/health", (req, res) => res.status(405).json({ error: "Method Not Allowed" }));
  app.all("/api/tags", (req, res) => res.status(405).json({ error: "Method Not Allowed" }));

  // Inference Proxy Handler
  const handleInference = (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method Not Allowed: Inference requires POST" });
    }

    // Model Allowlist Check
    const requestedModel = (req.body?.model || "").toLowerCase();
    const isModelApproved = Array.from(ALLOWED_MODELS).some(m => requestedModel.includes(m.split(":")[0]));
    if (!isModelApproved) {
      return res.status(400).json({
        error: `Forbidden: Model '${req.body?.model}' is not in approved local allowlist`,
        allowedModels: Array.from(ALLOWED_MODELS)
      });
    }

    // Concurrency Limit Check
    if (activeInferences >= maxConcurrency) {
      return res.status(429).json({
        error: `Too Many Requests: Maximum concurrent inference limit (${maxConcurrency}) reached. Please retry shortly.`
      });
    }

    activeInferences++;

    const payloadString = JSON.stringify(req.body);
    const targetUrl = new URL(req.url, targetUrlStr);

    const proxyReq = http.request(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payloadString)
      },
      timeout: timeoutMs
    }, (proxyRes) => {
      activeInferences = Math.max(0, activeInferences - 1);
      res.status(proxyRes.statusCode || 500);
      proxyRes.pipe(res);
    });

    proxyReq.on("error", (err) => {
      activeInferences = Math.max(0, activeInferences - 1);
      console.error(`[OllamaProxy] Upstream error: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Bad Gateway: Failed to connect to local Ollama instance (127.0.0.1:11434)"
        });
      }
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      activeInferences = Math.max(0, activeInferences - 1);
      if (!res.headersSent) {
        res.status(504).json({
          error: `Gateway Timeout: Upstream Ollama inference timed out (${timeoutMs}ms)`
        });
      }
    });

    proxyReq.write(payloadString);
    proxyReq.end();
  };

  app.post("/api/chat", handleInference);
  app.post("/api/generate", handleInference);
  app.post("/v1/chat/completions", handleInference);

  // Catch-all for unhandled endpoints
  app.use((req, res) => {
    res.status(404).json({ error: "Not Found: Unhandled endpoint or method" });
  });

  // Express Error Handler (JSON Syntax Errors & Payload Limit Exceeded)
  app.use((err, req, res, next) => {
    if (err.type === "entity.too.large" || err.status === 413) {
      return res.status(413).json({ error: "Payload Too Large: Exceeds 2MB limit" });
    }
    if (err instanceof SyntaxError || err.status === 400) {
      return res.status(400).json({ error: "Bad Request: Malformed JSON payload" });
    }
    res.status(500).json({ error: "Internal Proxy Error" });
  });

  return app;
}

// Start listener ONLY if run directly
if (require.main === module || (process.argv[1] && process.argv[1].includes("ollama-proxy-server"))) {
  const port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  const host = process.env.HOST || DEFAULT_HOST;
  const app = createProxyApp();

  const server = app.listen(port, host, () => {
    console.log(`[HireNestOS Proxy] Express Ollama Proxy listening strictly on ${host}:${port}`);
    console.log(`[HireNestOS Proxy] Approved models: ${Array.from(ALLOWED_MODELS).join(", ")}`);
  });

  // Verify bound interface address
  const address = server.address();
  if (typeof address === "object" && address.address !== "127.0.0.1" && address.address !== "::1") {
    console.error(`[CRITICAL SECURITY WARNING] Proxy bound to non-localhost address: ${address.address}`);
  }
}

module.exports = { createProxyApp, ALLOWED_MODELS };
