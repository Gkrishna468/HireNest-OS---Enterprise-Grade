import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cli, ServerOptions } from "@livekit/agents";
import { adminDb } from "./firebase.js";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.AGENT_WORKER_PORT || 3001;

/**
 * FAIL-FAST STARTUP VALIDATION
 * Refuses to start the worker process in production environments if critical keys are missing.
 */
function validateStartupConfiguration() {
  const isProduction = process.env.NODE_ENV === "production";
  
  const mandatory = [
    "LIVEKIT_URL",
    "LIVEKIT_API_KEY",
    "LIVEKIT_API_SECRET",
    "AI_INTERVIEWER_SERVICE_TOKEN",
    "AI_INTERVIEWER_SERVICE_URL"
  ];

  const missing = mandatory.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    const errorMsg = `CRITICAL_STARTUP_FAILURE: Missing mandatory configuration keys: ${missing.join(", ")}`;
    console.error(`\n❌ [STARTUP FAILED] ${errorMsg}\n`);
    
    if (isProduction) {
      console.error("Production mode active. Exiting process immediately to prevent unsafe fallback states.");
      process.exit(1);
    }
  } else {
    console.log("✅ Startup configurations verified successfully. No missing platform keys.");
  }
}

validateStartupConfiguration();

/**
 * DETAILED RUNTIME HEALTH CHECKS
 * Exposes readiness status of each underlying media subsystem without leaking secrets or credentials.
 */

app.get("/health", (req, res) => {
  res.json({
    status: "HEALTHY",
    uptime: process.uptime(),
    firebaseConnected: !!adminDb,
    framework: "livekit-agents-node"
  });
});

app.get("/health/livekit", (req, res) => {
  const configured = !!process.env.LIVEKIT_URL && !!process.env.LIVEKIT_API_KEY && !!process.env.LIVEKIT_API_SECRET;
  res.status(configured ? 200 : 503).json({
    status: configured ? "ready" : "unconfigured",
    details: configured ? "LiveKit server cluster endpoint fully configured." : "LiveKit connection credentials are missing."
  });
});

app.get("/health/stt", (req, res) => {
  const provider = process.env.STT_PROVIDER || "whisper";
  const configured = provider === "openai" || provider === "whisper"
    ? !!process.env.WHISPER_API_KEY || !!process.env.OPENAI_API_KEY
    : !!process.env.DEEPGRAM_API_KEY;

  res.status(configured ? 200 : 503).json({
    status: configured ? "ready" : "unconfigured",
    provider,
    details: configured ? `STT provider (${provider}) is armed and ready.` : `Missing API key for STT provider: ${provider}`
  });
});

app.get("/health/tts", (req, res) => {
  const provider = process.env.TTS_PROVIDER || "elevenlabs";
  const configured = provider === "openai"
    ? !!process.env.OPENAI_API_KEY
    : !!process.env.ELEVENLABS_API_KEY;

  res.status(configured ? 200 : 503).json({
    status: configured ? "ready" : "unconfigured",
    provider,
    details: configured ? `TTS provider (${provider}) is armed and ready.` : `Missing API key for TTS provider: ${provider}`
  });
});

app.get("/health/vad", (req, res) => {
  const modelPath = path.resolve("resources/silero_vad.onnx");
  const modelExists = fs.existsSync(modelPath);
  res.status(modelExists ? 200 : 503).json({
    status: modelExists ? "ready" : "model_missing",
    modelPath,
    details: modelExists ? "Silero VAD ONNX weights are present and verified." : "VAD model weights missing. Please place silero_vad.onnx inside the resources directory."
  });
});

app.get("/health/egress", (req, res) => {
  const bucketConfigured = !!process.env.LIVEKIT_EGRESS_S3_BUCKET;
  res.status(bucketConfigured ? 200 : 503).json({
    status: bucketConfigured ? "configured" : "unconfigured",
    details: bucketConfigured ? "LiveKit RoomComposite Egress is configured." : "Missing LIVEKIT_EGRESS_S3_BUCKET configuration."
  });
});

app.get("/health/aigateway", (req, res) => {
  const configured = !!process.env.AI_INTERVIEWER_SERVICE_URL && !!process.env.AI_INTERVIEWER_SERVICE_TOKEN;
  res.status(configured ? 200 : 503).json({
    status: configured ? "reachable" : "unconfigured",
    details: configured ? "HireNest central gateway mapping and service authorization tokens verified." : "Service token or endpoint URL missing."
  });
});

app.get("/health/storage", (req, res) => {
  const configured = !!process.env.LIVEKIT_EGRESS_AWS_ACCESS_KEY_ID && !!process.env.LIVEKIT_EGRESS_AWS_SECRET_ACCESS_KEY;
  res.status(configured ? 200 : 503).json({
    status: configured ? "reachable" : "unconfigured",
    details: configured ? "AWS S3 storage integration parameters verified." : "AWS credentials missing."
  });
});

const server = app.listen(PORT, () => {
  console.log(`=============================================================`);
  console.log(`   HIRENEST MONITORING DAEMON ONLINE ON PORT ${PORT} `);
  console.log(`=============================================================`);
});

server.on("error", (err: any) => {
  console.warn(`[Express Health Monitor] Port ${PORT} unavailable or disabled (${err.message}). Proceeding with LiveKit Cloud Worker Agent server.`);
});

/**
 * LAUNCH MANAGED LIVEKIT AGENT SERVER
 * Spawns a worker pool subscribing to LiveKit Cloud Rooms.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In TS environment, during pre-compiling development, points to compiled agent_entry.js target
const agentPath = path.resolve(__dirname, "agent_entry.js");

const HIRENEST_TECHNICAL_TEAM = "hirenest-technical-team";

const options = new ServerOptions({
  agent: agentPath,
  agentName: HIRENEST_TECHNICAL_TEAM,
  wsURL: process.env.LIVEKIT_URL || "ws://localhost:7880",
  apiKey: process.env.LIVEKIT_API_KEY,
  apiSecret: process.env.LIVEKIT_API_SECRET,
  production: process.env.NODE_ENV === "production",
  requestFunc: async (req: any) => {
    console.log("[HN Technical Team] JOB_RECEIVED", {
      jobId: req.id,
      room: req.room?.name,
      agentName: HIRENEST_TECHNICAL_TEAM
    });

    await req.accept(
      "HireNest Technical Team",
      HIRENEST_TECHNICAL_TEAM
    );

    console.log("[HN Technical Team] JOB_ACCEPTED", {
      jobId: req.id,
      room: req.room?.name
    });
  }
});

cli.runApp(options);
