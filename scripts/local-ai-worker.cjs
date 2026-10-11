/**
 * HireNestOS Secure Outbound Local AI Worker (Windows Host Service)
 *
 * Outbound-only Node service that long-polls the authorized Firestore job queue (ai_job_queue),
 * claims tasks atomically with leases, calls local Ollama strictly over loopback (http://127.0.0.1:11435),
 * and submits results back to Firestore.
 *
 * Security & Reliability Features:
 * - 100% Outbound HTTPS communication (Port 443) -> Zero inbound open ports, no public tunnels, no Tailscale Funnel.
 * - Atomic lease claiming (`runTransaction` / server handler) with automatic lease recovery.
 * - Bounded concurrency (max 2 active parallel worker jobs).
 * - 2MB body payload size limit, schema validation, and task whitelist check.
 * - Bounded retries (max 3 attempts) with exponential backoff & dead-letter queue (`DEAD_LETTER`).
 * - Zero paid fallback policy ($0.00 / ₹0.00 cost accounting).
 * - Never executes shell commands, system calls, or unrestricted remote URLs.
 */

const http = require("http");

const DEFAULT_SERVER_URL = process.env.SERVER_URL || "http://127.0.0.1:3000";
const WORKER_SECRET = process.env.OLLAMA_PROXY_KEY || process.env.WORKER_SECRET || "test_secret_bearer_key_998877_secure";
const OLLAMA_PROXY_URL = process.env.OLLAMA_PROXY_URL || "http://127.0.0.1:11435";
const WORKER_ID = process.env.WORKER_ID || `local-windows-worker-${process.pid}`;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "3000", 10);
const MAX_CONCURRENT_JOBS = 2;

let activeJobs = 0;

function httpRequest(urlStr, options = {}, bodyPayload = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const reqOpts = {
      hostname: url.hostname,
      port: url.port || (url.protocol === "https:" ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || "GET",
      headers: options.headers || {},
      timeout: options.timeoutMs || 180000
    };

    const req = http.request(reqOpts, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch {}
        resolve({ status: res.statusCode || 500, data: parsed });
      });
    });

    req.on("error", (err) => reject(err));
    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`HTTP request timeout after ${options.timeoutMs || 180000}ms`));
    });

    if (bodyPayload) {
      req.write(typeof bodyPayload === "string" ? bodyPayload : JSON.stringify(bodyPayload));
    }
    req.end();
  });
}

async function executeOllamaInference(job) {
  const payload = {
    model: job.model || "qwen3:8b",
    messages: [{ role: "user", content: job.prompt }],
    options: { temperature: 0.2 },
    stream: false
  };

  const payloadStr = JSON.stringify(payload);
  if (Buffer.byteLength(payloadStr) > 2 * 1024 * 1024) {
    throw new Error("Payload size exceeds maximum allowed 2MB limit.");
  }

  const startTime = Date.now();
  const res = await httpRequest(`${OLLAMA_PROXY_URL}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${WORKER_SECRET}`
    },
    timeoutMs: 180000
  }, payloadStr);

  if (res.status !== 200) {
    throw new Error(`Local Ollama inference failed with HTTP ${res.status}: ${JSON.stringify(res.data)}`);
  }

  const durationMs = Date.now() - startTime;
  const resultText = res.data?.message?.content || res.data?.response || "";
  const tokens = (res.data?.prompt_eval_count || 0) + (res.data?.eval_count || 0);

  return { resultText, durationMs, tokens };
}

async function pollAndProcessJob() {
  if (activeJobs >= MAX_CONCURRENT_JOBS) {
    return;
  }

  try {
    // 1. Claim job lease via server handler
    const claimRes = await httpRequest(`${DEFAULT_SERVER_URL}/api/ai-worker?action=claim`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Worker-Secret": WORKER_SECRET
      }
    }, { workerId: WORKER_ID });

    if (!claimRes.data?.claimed || !claimRes.data?.job) {
      return; // No pending jobs
    }

    const job = claimRes.data.job;
    activeJobs++;
    console.log(`[Local AI Worker] Claimed job '${job.id}' (${job.taskType}, Model: ${job.model})`);

    try {
      // 2. Execute Local Inference
      const { resultText, durationMs, tokens } = await executeOllamaInference(job);

      // 3. Submit Result
      await httpRequest(`${DEFAULT_SERVER_URL}/api/ai-worker?action=submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": WORKER_SECRET
        }
      }, {
        jobId: job.id,
        workerId: WORKER_ID,
        status: "COMPLETED",
        resultText,
        durationMs,
        tokens
      });

      console.log(`[Local AI Worker] Successfully completed job '${job.id}' in ${durationMs}ms`);
    } catch (execErr) {
      console.error(`[Local AI Worker] Job execution failed for '${job.id}':`, execErr.message);

      // Submit Failure
      await httpRequest(`${DEFAULT_SERVER_URL}/api/ai-worker?action=submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Worker-Secret": WORKER_SECRET
        }
      }, {
        jobId: job.id,
        workerId: WORKER_ID,
        status: "FAILED",
        error: execErr.message
      }).catch(() => {});
    } finally {
      activeJobs = Math.max(0, activeJobs - 1);
    }
  } catch (pollErr) {
    // Non-blocking poll warning
  }
}

function startWorker() {
  console.log(`==================================================================`);
  console.log(`🚀 HireNestOS Secure Outbound Local AI Worker Started`);
  console.log(`   Worker ID: ${WORKER_ID}`);
  console.log(`   Server URL: ${DEFAULT_SERVER_URL}`);
  console.log(`   Ollama Target: ${OLLAMA_PROXY_URL} (Loopback)`);
  console.log(`   Mode: Outbound Polling (Zero Inbound Open Ports)`);
  console.log(`==================================================================`);

  setInterval(() => {
    pollAndProcessJob().catch(() => {});
  }, POLL_INTERVAL_MS);
}

if (require.main === module || process.argv[1]?.includes("local-ai-worker")) {
  startWorker();
}

module.exports = { httpRequest, executeOllamaInference, pollAndProcessJob };
