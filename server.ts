import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";

// Import our core services
import { initializeFirebase, checkFirestoreHealth } from "./src/lib/firebase.ts";
import { RuntimeKernel } from "./src/api-lib/services/RuntimeKernel.ts";
import { EventBus } from "./src/api-lib/services/EventBus.ts";
import { MailOSService } from "./src/api-lib/services/MailOSService.ts";
import { AIGateway } from "./src/api-lib/services/AIGateway.ts";

const PORT = 3000;
const VERSION = "1.0.1";
const startTime = Date.now();

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  console.log("--------------------------------------------------");
  console.log("       HireNestOS Production Kernel Startup       ");
  console.log("--------------------------------------------------");

  // 1. FAST INITIALIZATION (Blocking but lightweight)
  const eventBus = EventBus.getInstance();
  eventBus.start();

  const mailOS = MailOSService.getInstance();
  mailOS.start();

  const aiGateway = AIGateway.getInstance();
  // Safe lazy client init
  aiGateway.initClient();

  // Initialize Firebase Admin configuration (using Application Default Credentials)
  initializeFirebase();

  // 2. REGISTER API ENDPOINTS FIRST
  
  // Health diagnostics check
  app.get("/api/health", async (_req, res) => {
    const isFirestoreHealthy = await checkFirestoreHealth();
    
    res.json({
      server: "healthy",
      firestore: isFirestoreHealthy ? "connected" : "disconnected",
      runtimeKernel: RuntimeKernel.getInstance().getStatus(),
      eventBus: eventBus.getStatus(),
      mailOS: mailOS.getStatus(),
      aiGateway: aiGateway.getStatus(),
      uptime: Math.round((Date.now() - startTime) / 1000),
      version: VERSION,
      timestamp: new Date().toISOString()
    });
  });

  // Simple Ping Pong check
  app.get("/api/ping", (_req, res) => {
    res.json({ status: "ok", message: "pong" });
  });

  // AI Prompt generation endpoint
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        res.status(400).json({ error: "Prompt is required" });
        return;
      }
      const response = await aiGateway.generateText(prompt);
      res.json({ response });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "AI Analysis failed" });
    }
  });

  // 3. INTEGRATE FRONTEND (Vite middleware in dev, static files in production)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // 4. BIND PORT IMMEDIATELY FOR RESPONSIVENESS
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`HireNestOS Server listening at http://0.0.0.0:${PORT}`);
    
    // 5. DEFER ASYNC AND LONG RUNNING PROCESSES (Non-blocking background run)
    setImmediate(() => {
      console.log("Triggering asynchronous service boots...");
      try {
        const kernel = RuntimeKernel.getInstance();
        kernel.start();
        console.log("Asynchronous bootstrap sequence finished successfully.");
      } catch (err) {
        console.error("Failed to execute background bootstrap tasks:", err);
      }
    });
  });

  return server;
}

startServer().catch((err) => {
  console.error("FATAL: Failed to boot HireNestOS server:", err);
  process.exit(1);
});
