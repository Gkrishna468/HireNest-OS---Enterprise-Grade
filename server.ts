import "express-async-errors";
import express, { Request, Response, NextFunction } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
import mammoth from 'mammoth';
import nlp from 'compromise';
import natural from 'natural';
import admin from 'firebase-admin';

const require = createRequire(import.meta.url);

// --- Global Configuration ---
let globalProjectId: string = "hirenest-os"; // Default fallback

// Initial detection from environment
if (process.env.GOOGLE_CLOUD_PROJECT) {
  globalProjectId = process.env.GOOGLE_CLOUD_PROJECT;
} else if (process.env.PROJECT_ID) {
  globalProjectId = process.env.PROJECT_ID;
}

// Metadata fetch with timeout helper
async function fetchMetadata(path: string): Promise<string | null> {
  const url = `http://metadata.google.internal/computeMetadata/v1/${path}`;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout
    
    const response = await fetch(url, {
      headers: { "Metadata-Flavor": "Google" },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (response.ok) return (await response.text()).trim();
    return null;
  } catch (e) {
    return null;
  }
}

const AuditService = {
  log: async (userId: string, action: string, metadata: any = {}) => {
    try {
      if (admin.apps.length === 0) return;
      const db = admin.firestore();
      const logId = `LOG-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      console.log(`[ORCHESTRATOR] Logging Governance Event: ${action} for Node: ${userId}`);
      await db.collection("auditLogs").doc(logId).set({
        logId,
        userId,
        action,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        ...metadata,
        severity: metadata.severity || "INFO",
        outcome: metadata.outcome || "SUCCESS",
        systemId: "HireNest Global OS"
      });
    } catch (e) {
      console.warn("[AUDIT] Log persistent failure:", e);
    }
  }
};

// Initialize Firebase Admin with explicit project attribution
console.log(`[HQ CORE] Boot sequence initiated...`);

async function initializeGovernanceLayer() {
  try {
    // 1. Check for runtime project ID via metadata (highest priority in production)
    const runtimeId = await fetchMetadata("project/project-id");
    if (runtimeId) {
      globalProjectId = runtimeId;
      console.log(`[HQ CORE] Runtime Metadata Project ID: ${globalProjectId}`);
    }

    // 2. Load config file as secondary source/override
    const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(firebaseConfigPath)) {
      const config = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
      // Only override if we haven't detected a definite runtime ID or if we're in dev
      if (!runtimeId || process.env.NODE_ENV !== 'production') {
        globalProjectId = config.projectId || globalProjectId;
        console.log(`[HQ CORE] Config File Project ID: ${globalProjectId}`);
      }
    }

    // Ensure env vars are synced for SDKs that rely on them
    process.env.GOOGLE_CLOUD_PROJECT = globalProjectId;
    process.env.GOOGLE_CLOUD_QUOTA_PROJECT = globalProjectId;

    // 3. Initialize Admin SDK
    if (admin.apps.length === 0) {
      admin.initializeApp({
        projectId: globalProjectId,
        credential: admin.credential.applicationDefault()
      });
      const app = admin.app();
      console.log(`[HQ CORE] Governance layer established on project: ${app.options.projectId}`);
    }
  } catch (e: any) {
    console.error("[HQ CORE FATAL] Lifecycle failure during initialization:", e.message);
  }
}

// Invoke initialization
const initPromise = initializeGovernanceLayer();

const UsageService = {
  checkQuota: async (ownerId: string, type: string): Promise<boolean> => {
    try {
      const db = admin.firestore();
      const snap = await db.collection("quotas")
        .where("ownerId", "==", ownerId)
        .where("quotaType", "==", type)
        .limit(1)
        .get();
      
      if (snap.empty) return true; // Default allow if no quota set
      const quota = snap.docs[0].data();
      if (quota.current >= quota.limit) {
        if (new Date(quota.resetAt) < new Date()) {
          // Reset logic would go here in production
          return true;
        }
        return false;
      }
      return true;
    } catch (e) {
      return true; // Fail open for resilience, or fail closed for security? HireNest prefers resilience for now.
    }
  },
  increment: async (ownerId: string, type: string, amount: number = 1) => {
    try {
      const db = admin.firestore();
      const snap = await db.collection("quotas")
        .where("ownerId", "==", ownerId)
        .where("quotaType", "==", type)
        .limit(1)
        .get();
      
      if (!snap.empty) {
        await snap.docs[0].ref.update({
          current: admin.firestore.FieldValue.increment(amount)
        });
      }
    } catch (e) {}
  }
};

// --- Global Metadata & Paths ---
let currentDirname: string;
try {
  const _filename = fileURLToPath(import.meta.url);
  currentDirname = path.dirname(_filename);
} catch (e) {
  // CJS Fallback
  currentDirname = process.cwd();
}

// --- Security & Governance Infrastructure ---
console.log("[SERVER START] Booting HireNest Global OS Intelligence Layer...");

let pdfParse: any = null;
let pdfjsLib: any = null;

// --- Global Mock Database ---
const dbMock: any = {
  metrics: {
    revenue: 1450000,
    activeDeals: 42,
    placements: 18,
    margin: "18.2%",
    vendorQuality: 92,
    recruiterProductivity: 88,
  },
  organizations: [
    { id: "ORG-GLOBAL-HQ", name: "HireNest Global HQ", type: "admin", companyName: "HireNest Global", msaUploaded: true, ndaUploaded: true, rating: 5.0, status: "approved" },
    { id: "C-CLIENT-001", name: "HireNest Client A", type: "client", companyName: "Enterprise Solutions Inc", msaUploaded: true, ndaUploaded: true, rating: 4.8, status: "approved" },
    { id: "V-VENDOR-001", name: "HireNest Vendor B", type: "vendor", companyName: "Elite Staffing Group", msaUploaded: true, ndaUploaded: true, rating: 4.6, status: "approved" },
    { id: "C-8821", name: "Acme Corp", type: "client", companyName: "Acme Corp", msaUploaded: true, ndaUploaded: false, rating: 4.2, status: "approved" },
    { id: "V-2048", name: "ABC Staffing", type: "vendor", companyName: "ABC Staffing", msaUploaded: true, ndaUploaded: true, rating: 4.5, status: "approved" }
  ],
  users: [
    { id: "vetAu3RF2qYVmsCuB6cpEz9DDqA2", email: "gopal@hirenestworkforce.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() },
    { id: "gopal-2", email: "gopalkrishna0046@gmail.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() },
    { id: "client-node-1", email: "gopalkrishna.sv46@gmail.com", role: "client_hm", organizationId: "C-8821", createdAt: new Date().toISOString() },
    { id: "vendor-node-1", email: "founder.itconsulting@outlook.com", role: "vendor_agency", organizationId: "V-VENDOR-001", createdAt: new Date().toISOString() },
    { id: "user-client-1", email: "client@example.com", role: "client_hm", organizationId: "C-CLIENT-001", createdAt: new Date().toISOString() },
    { id: "user-vendor-1", email: "vendor@example.com", role: "vendor_agency", organizationId: "V-VENDOR-001", createdAt: new Date().toISOString() }
  ],
  requirements_public: [
    { 
      id: "REQ-001", clientId: "C-CLIENT-001", title: "Senior Cloud Architect (Onsite)", skills: ["AWS", "Kubernetes", "Terraform"], 
      status: "PUBLISHED", rate: "$120/hr", submissions: 8, createdAt: new Date().toISOString(),
      description: "Looking for an experienced Cloud Architect to join our onsite team. Requires deep knowledge of AWS and IAC. Full cycle deployment experience is a must.",
      financials: { clientBudget: 150, platformProfit: 30, vendorPayout: 120, marginConfig: { type: 'FIXED', value: 30 } }
    },
    { 
      id: "REQ-002", clientId: "C-8821", title: "Frontend Lead (React)", skills: ["React", "TypeScript", "Tailwind"], 
      status: "PUBLISHED", rate: "$100/hr", submissions: 5, createdAt: new Date().toISOString(),
      description: "Lead our frontend transformation using React and Tailwind. Remote friendly position with periodic onsite collaboration.",
      financials: { clientBudget: 125, platformProfit: 25, vendorPayout: 100, marginConfig: { type: 'PERCENTAGE', value: 20 } }
    },
    {
      id: "REQ-003", clientId: "C-8821", title: "Acme Crop Test: Full Time Resource (8.33% Commission)", skills: ["Java", "Spring Boot"],
      status: "PENDING_FINANCIAL_APPROVAL", clientTargetBudget: 140, createdAt: new Date().toISOString(),
      description: "Critical Full Time hire for our core banking platform. Looking for Spring Boot experts."
    },
    {
      id: "REQ-004", clientId: "C-8821", title: "Skydio: Senior Python Engineer (Onsite Direct)", skills: ["Python", "FastAPI"],
      status: "DRAFT", clientTargetBudget: 120, createdAt: new Date().toISOString(),
      description: "Onsite Python role focusing on high-performance FastAPI backends for drone telemetry."
    }
  ],
  candidatePool: [
    { id: "CAN-001", name: "Alex Rivera", skills: ["AWS", "Kubernetes", "Terraform", "Go"], experience: "8 years", vendorId: "V-VENDOR-001", matchScore: 94 },
    { id: "CAN-002", name: "Priya Sharma", skills: ["React", "TypeScript", "Tailwind", "Node.js"], experience: "6 years", vendorId: "V-2048", matchScore: 91 },
    { id: "CAN-003", name: "David Chen", skills: ["Java", "Spring Boot", "AWS", "SQL"], experience: "10 years", vendorId: "V-VENDOR-001", matchScore: 88 },
    { id: "CAN-004", name: "Sarah Jenkins", skills: ["Python", "FastAPI", "Docker", "AWS"], experience: "5 years", vendorId: "V-2048", matchScore: 92 },
    { id: "CAN-005", name: "Michael Scott", skills: ["React", "AWS", "Python"], experience: "4 years", vendorId: "V-VENDOR-001", matchScore: 75 }
  ],
  submissions: [],
  dealRooms: [],
  messages: [],
  systemNotifications: []
};

// --- AI Init ---
let ai: any = null;
if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ 
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
}

// --- AI Utils ---
async function withAIRetry<T>(fn: () => Promise<T>, maxRetries = 3, delay = 2000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = err.status === 503 || 
                         err.status === 429 || 
                         (err.message && (err.message.includes("503") || err.message.includes("high demand") || err.message.includes("429")));
      
      if (isRetryable && i < maxRetries - 1) {
        console.log(`[AI RETRY] Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// --- Server Setup ---
async function startServer() {
  const app = express();
  const PORT = 3000;

  // Await core initialization
  await initPromise;
  
  // --- Dependency Onboarding ---
  try {
    // Use require for pdf-parse as it's more reliable for this older package even in ESM
    const pp = require('pdf-parse');
    if (typeof pp === 'function') {
      pdfParse = pp;
    } else if (pp && typeof pp.default === 'function') {
      pdfParse = pp.default;
    } else {
      pdfParse = pp; // Last resort
    }
    console.log("[DEP] PDF-Parse initialized, type:", typeof pdfParse);
  } catch (e) {
    console.warn("[DEP] PDF-Parse fallback to import...");
    try {
      const pp = await import('pdf-parse') as any;
      pdfParse = pp.default || pp;
    } catch (e2) {
      console.warn("[DEP] PDF-Parse engine offline");
    }
  }

  try {
    // @ts-ignore
    const pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    pdfjsLib = pdfjs;
    console.log("[DEP] PDFJS-Dist initialized");
  } catch (e) {
    try {
        // @ts-ignore
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
        pdfjsLib = pdfjs.default || pdfjs;
    } catch (e2) {
        console.warn("[DEP] PDFJS fallback engine offline");
    }
  }
  
  app.use((req, res, next) => {
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- AUTH MIDDLEWARE ---
  async function verifyAdmin(req: Request, res: Response, next: NextFunction) {
    const requestId = Math.random().toString(36).substring(7);
    try {
      console.log(`[HQ SECURITY] [${requestId}] Handshake check: ${req.path}`);
      
      const app = admin.apps.length > 0 ? admin.app() : null;
      if (!app) {
        console.error(`[HQ SECURITY] [${requestId}] Critical: Firebase Admin not initialized.`);
        return res.status(503).json({ 
          error: "SERVICE_UNAVAILABLE", 
          details: "Core governance layer is booting or offline.", 
          requestId
        });
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Access Denied: Missing Authorization Protocol", requestId });
      }

      const token = authHeader.split('Bearer ')[1];
      if (!token || token === "undefined" || token === "null") {
        return res.status(401).json({ error: "Access Denied: Invalid Auth Token String", requestId });
      }
      
      const auth = app.auth();
      // Use absolute project isolation for verification
      const decodedToken = await auth.verifyIdToken(token);
      const email = decodedToken.email?.toLowerCase().trim();
      
      console.log(`[HQ SECURITY] [${requestId}] Authority Handshake Verified: ${email}`);
      
      const trustedNodes = [
        'gopalkrishna0046@gmail.com',
        'gopal@hirenestworkforce.com',
        'gopalkrishna.sv46@gmail.com',
        'founder.itconsulting@outlook.com'
      ];

      const isTrustedEmail = email && trustedNodes.includes(email);
      const isTrustedRole = decodedToken.role === 'admin';

      if (!isTrustedEmail && !isTrustedRole) {
        console.warn(`[SECURITY BREACH] [${requestId}] Unauthorized Authority Attempt: ${email}`);
        return res.status(403).json({ 
          error: "ACCESS_DENIED",
          message: `Identity [${email || 'Anonymous'}] is not recognized in the Global Authority Manifest.`,
          requestId
        });
      }

      (req as any).user = decodedToken;
      next();
    } catch (err: any) {
      console.error(`[HQ SECURITY] [${requestId}] Protocol Handshake Failed:`, err.message);
      if (!res.headersSent) {
        const isAuthError = err.code?.startsWith('auth/');
        res.status(isAuthError ? 401 : 500).json({ 
          error: isAuthError ? "IDENTITY_VERIFICATION_FAILED" : "SECURITY_PROTOCOL_CRASH", 
          details: err.message || "Unknown Verification Error",
          code: err.code || "governance/handshake-failure",
          requestId
        });
      }
    }
  }

  // --- API ROUTES ---
  app.get("/api/admin/pre-flight", async (req, res) => {
    const results: any = { 
        status: "operational", 
        timestamp: new Date().toISOString(),
        nodeId: globalProjectId,
        appsCount: admin.apps.length,
        env: process.env.NODE_ENV
    };
    
    try {
      results.runtimeIdentity = (await fetchMetadata("instance/service-accounts/default/email")) || "local-or-unknown";
      results.runtimeProjectId = await fetchMetadata("project/project-id");
    } catch (e: any) {
      results.error = e.message;
    }
    res.json(results);
  });
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      time: new Date().toISOString(),
      nodeId: globalProjectId,
      env: process.env.NODE_ENV 
    });
  });

  // --- AI GATEWAY & SECURITY ---
  app.post("/api/ai/gateway", async (req, res) => {
    try {
      const { action, payload, context } = req.body;
      const authHeader = req.headers.authorization;
      
      if (!authHeader) return res.status(401).json({ error: "UNAUTHORIZED" });
      const token = authHeader.split('Bearer ')[1];
      const decoded = await admin.auth().verifyIdToken(token);
      const uid = decoded.uid;
      const orgId = decoded.organizationId || context?.orgId;

      console.log(`[AI GATEWAY] Request: ${action} from User: ${uid} (Org: ${orgId})`);

      // 1. Quota Check
      const hasQuota = await UsageService.checkQuota(orgId || uid, "ai_calls");
      if (!hasQuota) {
        await AuditService.log(uid, "AI_QUOTA_EXCEEDED", { orgId, action, outcome: "BLOCKED", severity: "HIGH" });
        return res.status(429).json({ error: "QUOTA_EXCEEDED", message: "AI resource limit reached for your node." });
      }

      // 2. Prompt Injection / Sanity Check
      if (typeof payload === 'string' && (payload.includes("ignore previous instructions") || payload.includes("system prompt"))) {
        await AuditService.log(uid, "SEC_PROMPT_INJECTION_ATTEMPT", { orgId, action, outcome: "BLOCKED", severity: "CRITICAL" });
        return res.status(400).json({ error: "SECURITY_VIOLATION", message: "Anomaly detected in language input." });
      }

      // 3. Execution
      let result = null;
      if (action === "ANALYZE_JD") {
        result = await handleJDAnalysis(payload);
      } else if (action === "EXTRACT_RESUME") {
        result = await handleResumeExtraction(payload);
      } else {
        return res.status(400).json({ error: "INVALID_ACTION" });
      }

      // 4. Usage Tracking
      await UsageService.increment(orgId || uid, "ai_calls");
      await AuditService.log(uid, `AI_${action}`, { orgId, outcome: "SUCCESS" });

      res.json({ result });
    } catch (err: any) {
      console.error("[AI GATEWAY FATAL]", err);
      res.status(500).json({ error: "AI_GATEWAY_ERROR", details: err.message });
    }
  });

  async function handleJDAnalysis(jd: string) {
    if (!ai) throw new Error("AI_OFFLINE");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Act as Recruitment Architect. Analyze this JD for technical requirements, seniority, and budget viability: ${jd}`
    });
    return response.text;
  }

  async function handleResumeExtraction(text: string) {
    if (!ai) throw new Error("AI_OFFLINE");
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract candidate identity and high-fidelity skills from: ${text}`,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text);
  }

  app.get("/api/admin/diagnostics", verifyAdmin, async (req, res) => {
    const results: any = {
      projectId: globalProjectId,
      envProjectId: process.env.GOOGLE_CLOUD_PROJECT,
      appsInitialized: admin.apps.length,
      auth: "checking",
      firestore: "checking",
      timestamp: new Date().toISOString()
    };

    try {
      if (admin.apps.length === 0) {
        await initializeGovernanceLayer();
      }

      // 1. Identity Discovery (Non-blocking)
      const metadataSA = await fetchMetadata("instance/service-accounts/default/email");
      const metadataProj = await fetchMetadata("project/project-id");
      
      results.serviceAccount = metadataSA || "system-assigned-identity";
      results.runtimeProjectId = metadataProj || globalProjectId;

      const activeProject = results.runtimeProjectId || globalProjectId;

      // 2. Auth Handshake
      try {
        const auth = admin.auth();
        await auth.listUsers(1); 
        results.auth = "healthy";
      } catch (e: any) {
        results.auth = `failure: ${e.message || "Handshake Rejected"}`;
        results.authCode = e.code || "governance/auth-denied";
        results.authDetails = e.message || "The authority signal was rejected by the cloud node. Ensure Firebase Auth is enabled and permissions are granted.";
        if (e.message?.includes('PERMISSION_DENIED') || e.code === 7 || e.message?.includes('IAM')) {
          const sa = (results.serviceAccount && results.serviceAccount !== "system-assigned-identity") 
                     ? results.serviceAccount 
                     : "733294346096-compute@developer.gserviceaccount.com";
          
          const members = [
            `serviceAccount:${sa}`,
            `user:gopalkrishna0046@gmail.com`,
            `user:gopal@hirenestworkforce.com`,
            `user:gopalkrishna.sv46@gmail.com`,
            `user:founder.itconsulting@outlook.com`,
            `serviceAccount:firebase-adminsdk-fbsvc@hirenest-os.iam.gserviceaccount.com`,
            `serviceAccount:ais-sandbox@ais-asia-east1-5a5059f2763f49b.iam.gserviceaccount.com`
          ];

          const memberFlags = members.map(m => `--member="${m}"`).join(" ");
          const roles = [
            "roles/serviceusage.serviceUsageConsumer",
            "roles/firebaseauth.admin",
            "roles/firebaserules.admin",
            "roles/datastore.user",
            "roles/iam.serviceAccountTokenCreator",
            "roles/identitytoolkit.admin",
            "roles/firebase.admin",
            "roles/resourcemanager.projectIamAdmin",
            "roles/cloudfunctions.admin",
            "roles/storage.admin"
          ];
          
          const commands = [
            `gcloud auth login`,
            `gcloud config set project hirenest-os`,
            `# Grant full permissions to all essential identities`,
            ...roles.map(role => `gcloud projects add-iam-policy-binding hirenest-os ${memberFlags} --role="${role}"`)
          ].join(" && ");
          results.remediation = commands;
        }
      }

      // 3. Firestore Handshake
      try {
        const db = admin.firestore();
        await db.collection("users").limit(1).get();
        await db.collection("execution_tracker").limit(1).get();
        results.firestore = "healthy";
      } catch (e: any) {
        results.firestore = `failure: ${e.message || "Mirror Sync Blocked"}`;
        results.firestoreDetails = e.message || "The entity mirror could not be replicated. Ensure Firestore (Datastore mode) is enabled and permissions are granted.";
        
        // If it's a permission error, generate remediation command
        if (e.message?.includes('PERMISSION_DENIED') || e.code === 7 || e.message?.includes('insufficient permissions')) {
          const sa = (results.serviceAccount && results.serviceAccount !== "system-assigned-identity") 
                     ? results.serviceAccount 
                     : "733294346096-compute@developer.gserviceaccount.com";
          
          const members = [
            `serviceAccount:${sa}`,
            `user:gopalkrishna0046@gmail.com`,
            `user:gopal@hirenestworkforce.com`,
            `user:gopalkrishna.sv46@gmail.com`,
            `user:founder.itconsulting@outlook.com`,
            `serviceAccount:ais-sandbox@ais-asia-east1-5a5059f2763f49b.iam.gserviceaccount.com`
          ];
          const memberFlags = members.map(m => `--member="${m}"`).join(" ");
          
          const roles = [
            "roles/datastore.user",
            "roles/firebase.admin",
            "roles/firebaserules.admin",
            "roles/cloudfunctions.admin",
            "roles/serviceusage.serviceUsageConsumer"
          ];

          results.iamCommand = [
            `gcloud auth login`,
            `gcloud config set project hirenest-os`,
            ...roles.map(role => `gcloud projects add-iam-policy-binding hirenest-os ${memberFlags} --role="${role}"`)
          ].join(" && ");
        }
      }

      res.status(200).json(results);
    } catch (fatalErr: any) {
      console.error("[DIAGNOSTICS FATAL]", fatalErr);
      res.status(200).json({ 
        ...results,
        error: "DIAGNOSTICS_FAILURE", 
        authDetails: fatalErr.message,
        details: fatalErr.message,
        nodeStatus: admin.apps.length > 0 ? "ONLINE" : "OFFLINE"
      });
    }
  });

  app.get("/api/admin/audit-logs", verifyAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      // Temporarily remove orderBy to rule out missing index timeout
      const snapPromise = db.collection("auditLogs").limit(100).get();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Audit logs fetch timed out")), 8000));
      const snap = await Promise.race([snapPromise, timeoutPromise]) as admin.firestore.QuerySnapshot;
      
      const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort manually in memory if needed
      logs.sort((a: any, b: any) => {
        const tA = a.timestamp?.seconds || 0;
        const tB = b.timestamp?.seconds || 0;
        return tB - tA;
      });
      
      res.json(logs);
    } catch (err: any) {
      console.error("[AUDIT FETCH FAIL]", err.message);
      res.status(500).json({ error: "Failed to fetch audit logs", details: err.message });
    }
  });

  app.get("/api/admin/risk-assessments", verifyAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      // Remove orderBy temporarily
      const snapPromise = db.collection("risk_assessments").limit(50).get();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Risk assessment fetch timed out")), 8000));
      const snap = await Promise.race([snapPromise, timeoutPromise]) as admin.firestore.QuerySnapshot;
      
      const risks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(risks);
    } catch (err: any) {
      console.error("[RISK FETCH FAIL]", err.message);
      res.status(500).json({ error: "Failed to fetch risk data", details: err.message });
    }
  });

  app.post("/api/admin/assign-role", verifyAdmin, async (req, res) => {
    try {
      const { uid, role, organizationId } = req.body;
      if (!uid || !role) return res.status(400).json({ error: "UID and Role are required" });
      
      console.log(`[HQ IAM] Assigning role [${role}] and org [${organizationId}] to [${uid}]`);
      
      const claims: any = { role };
      if (organizationId) claims.organizationId = organizationId;
      
      await admin.auth().setCustomUserClaims(uid, claims);
      
      await AuditService.log((req as any).user.uid, "ROLE_ASSIGNED", { 
        targetUid: uid, 
        role, 
        organizationId,
        severity: "HIGH" 
      });
      
      res.json({ success: true, message: `Role ${role} assigned to ${uid}` });
    } catch (err: any) {
      console.error("[HQ IAM FAIL]", err);
      res.status(500).json({ error: "Failed to assign role", details: err.message });
    }
  });

  app.get("/api/ping", (req, res) => res.json({ status: "pong", time: new Date().toISOString(), nodeId: globalProjectId }));

  app.get("/api/user/context", (req, res) => {
    const { orgId, role } = req.query;
    try {
      const metrics = dbMock.metrics || { revenue: 0, activeDeals: 0, placements: 0, margin: "0%", vendorQuality: 0, recruiterProductivity: 0 };
      
      // Admin sees everything
      if (role === 'admin') {
        return res.json({
          requirements: dbMock.requirements_public || [],
          metrics: metrics
        });
      }

      // Client sees their own requirements
      if (String(role).includes('client')) {
        const filtered = (dbMock.requirements_public || []).filter((r: any) => r.clientId === orgId);
        return res.json({
          requirements: filtered,
          metrics: metrics
        });
      }

      // Vendor sees published ones
      const published = (dbMock.requirements_public || []).filter((r: any) => r.status === 'PUBLISHED');
      res.json({ requirements: published, metrics: metrics });
    } catch (err: any) {
      console.error("[CONTEXT ERROR]", err);
      res.status(500).json({ error: "Context sync failed", message: err.message });
    }
  });

  app.get("/api/admin/governance-data", verifyAdmin, async (req, res) => {
    try {
      const db = admin.firestore();
      const currentAdminEmail = (req as any).user?.email?.toLowerCase().trim();
      
      // Try to fetch real data but don't crash if it fails
      let users: any[] = [];
      let organizations: any[] = [];
      let onboarding_requests: any[] = [];
      let mode = "LIVE";
      
      try {
        const app = admin.app();
        const db = app.firestore();
        const activeProjectId = app.options.projectId || globalProjectId;
        console.log(`[HQ SYNC] Attempting handshake from ${currentAdminEmail} to Node: ${activeProjectId}`);
        
        // Timeout protection for Firebase calls
        const timeout = <T>(promise: Promise<T>, ms: number) => {
          return Promise.race([
            promise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Firebase operation timed out after ' + ms + 'ms')), ms))
          ]);
        };

        const [usersSnap, orgsSnap, reqsSnap] = await timeout(Promise.all([
          db.collection("users").limit(100).get(),
          db.collection("organizations").limit(100).get(),
          db.collection("onboarding_requests").limit(100).get()
        ]), 10000); // 10s timeout
        
        users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        organizations = orgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onboarding_requests = reqsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`[HQ SYNC] Intelligence retrieval successful for project: ${activeProjectId}. Identities: ${users.length}, Nodes: ${organizations.length}, Requests: ${onboarding_requests.length}`);
      } catch (dbErr: any) {
        mode = "FALLBACK";
        if (dbErr.message?.includes('PERMISSION_DENIED') || String(dbErr.code) === '7' || dbErr.message?.includes('Unauthenticated')) {
          console.error(`[HQ SYNC PERMISSION DENIED] Authority rejected for node ${globalProjectId}. Identity: ${currentAdminEmail}. Ensure Service Account has 'Cloud Datastore User' role on project ${globalProjectId}.`);
        } else if (dbErr.message?.includes('timed out')) {
          console.error(`[HQ SYNC TIMEOUT] Database connection hung. Project: ${globalProjectId}`);
        } else {
          console.error("[HQ DB FAIL] Sync pipeline interrupted:", dbErr.message);
        }
        users = dbMock.users;
        organizations = dbMock.organizations;
        onboarding_requests = [];
      }

      // If database is effectively empty, use mock for demo/visual consistency
      if (mode === "LIVE" && users.length === 0) {
         console.warn("[HQ SYNC] User list empty, seeding mock identities.");
         users = dbMock.users;
         mode = "HYBRID_MOCK";
      }

      if (mode === "LIVE" && organizations.length === 0) {
         console.warn("[HQ SYNC] Organization list empty, seeding mock entities.");
         organizations = dbMock.organizations;
         mode = "HYBRID_MOCK";
      }

      const payload = {
        organizations,
        users,
        onboarding_requests,
        requirements_public: dbMock.requirements_public || [],
        candidatePool: dbMock.candidatePool || [],
        submissions: dbMock.submissions || [],
        dealRooms: dbMock.dealRooms || [],
        metrics: dbMock.metrics || {},
        lastSync: new Date().toISOString(),
        isMock: mode !== "LIVE",
        nodeId: globalProjectId,
        mode
      };
      res.status(200).json(payload);
    } catch (err: any) {
      console.error("[HQ SYNC FATAL] Integrity breach:", err);
      res.status(200).json({
        organizations: dbMock.organizations,
        users: dbMock.users,
        requirements_public: dbMock.requirements_public || [],
        metrics: dbMock.metrics || {},
        error: err?.message || "Unknown retrieval error",
        isMock: true,
        nodeId: globalProjectId,
        mode: "FATAL_FALLBACK"
      });
    }
  });

  app.post("/api/onboard/request", async (req, res) => {
    try {
      const { type, companyName, email, linkedin, gstNumber, aadhaarNumber, metadata } = req.body;
      const db = admin.firestore();
      
      const requestId = "REQ-" + Math.random().toString(36).substring(2, 11).toUpperCase();
      
      // Calculate a basic risk score (prototype)
      let riskScore = 30; // Base score
      if (!companyName && type !== 'freelancer') riskScore += 20;
      if (!linkedin) riskScore += 10;
      
      const request = {
        requestId,
        type,
        companyName: companyName || "Independent Entity",
        email,
        linkedin: linkedin || null,
        gstNumber: gstNumber || null,
        aadhaarNumber: aadhaarNumber || null,
        verificationStatus: "PENDING",
        riskScore,
        submittedAt: new Date().toISOString(),
        metadata: metadata || {}
      };
      
      await db.collection("onboarding_requests").doc(requestId).set(request);
      
      await AuditService.log("anonymous", "ONBOARDING_REQUEST_SUBMITTED", { 
        requestId, 
        email, 
        type, 
        severity: "INFO" 
      });
      
      console.log(`[GOVERNANACE] New Onboarding Request: ${requestId} for ${email}`);
      res.json({ success: true, requestId });
    } catch (err: any) {
      console.error("[ONBOARD REQ FAIL]", err);
      res.status(500).json({ error: "Onboarding submission failed", details: err.message });
    }
  });

  app.post("/api/admin/onboard/approve", verifyAdmin, async (req, res) => {
    try {
      const { requestId, role, password } = req.body;
      const db = admin.firestore();
      const auth = admin.auth();
      
      console.log(`[GOVERNANCE] Attempting approval for Request: ${requestId}`);
      
      const reqDoc = await db.collection("onboarding_requests").doc(requestId).get();
      if (!reqDoc.exists) {
        console.error(`[GOVERNANCE] Request ${requestId} not found.`);
        return res.status(404).json({ error: "Request not found" });
      }
      
      const reqData = reqDoc.data()!;
      let uid: string;
      
      // 1. Check if Auth User exists, create if not
      try {
        const userRecord = await auth.getUserByEmail(reqData.email);
        uid = userRecord.uid;
        console.log(`[GOVERNANCE] User ${reqData.email} already exists (UID: ${uid}). Updating identity...`);
      } catch (authErr: any) {
        if (authErr.code === 'auth/user-not-found') {
          console.log(`[GOVERNANCE] Provisioning new Auth identity for ${reqData.email}...`);
          const userRecord = await auth.createUser({
            email: reqData.email,
            password: password || "Temp123!",
            displayName: reqData.companyName || "Verified Member"
          });
          uid = userRecord.uid;
        } else {
          throw authErr;
        }
      }
      
      const orgId = "ORG-" + Math.random().toString(36).substring(2, 11).toUpperCase();
      const batch = db.batch();
      
      // 2. Create Organization
      batch.set(db.collection("organizations").doc(orgId), {
        organizationId: orgId,
        type: reqData.type === 'freelancer' ? 'freelancer' : reqData.type,
        companyName: reqData.companyName,
        status: "approved",
        trustGrade: reqData.riskScore < 40 ? "AAA" : "AA",
        verificationLevel: 2,
        ownerId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // 3. Create/Update User
      batch.set(db.collection("users").doc(uid), {
        uid,
        email: reqData.email,
        role: role || (reqData.type === 'client' ? 'CLIENT_ADMIN' : 'VENDOR_ADMIN'),
        organizationId: orgId,
        trustLevel: 1,
        verification: {
          emailVerified: true, // Mark as verified since admin approved
          identityVerified: true,
          businessVerified: !!reqData.gstNumber,
          trustScore: 100 - (reqData.riskScore || 30)
        },
        status: "ACTIVE",
        onboardingRequestId: requestId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // 4. Update Request Status
      batch.update(db.collection("onboarding_requests").doc(requestId), {
        verificationStatus: "VERIFIED",
        reviewedBy: (req as any).user.email,
        metadata: { ...reqData.metadata, provisionedUid: uid, provisionedOrgId: orgId }
      });
      
      await batch.commit();
      
      // 5. Assign Custom Claims
      try {
        console.log(`[GOVERNANCE] Assigning custom claims to ${reqData.email}...`);
        await auth.setCustomUserClaims(uid, {
          role: role || (reqData.type === 'client' ? 'client_recruiter' : 'vendor_recruiter'),
          organizationId: orgId
        });
        console.log(`[GOVERNANCE] Claims assigned successfully.`);
      } catch (claimErr: any) {
        console.error("[GOVERNANCE WARNING] Custom claims assignment failed:", claimErr.message);
        // We don't fail the whole request since DB records are committed
      }
      
      await AuditService.log((req as any).user.uid, "ONBOARDING_REQUEST_APPROVED", { 
        requestId, 
        provisionedUid: uid, 
        provisionedOrgId: orgId,
        severity: "HIGH"
      });
      
      console.log(`[GOVERNANCE] Request ${requestId} Approved. Node ${uid} activated in Network.`);
      res.json({ success: true, uid, orgId });
    } catch (err: any) {
      console.error("[ONBOARD APPROVE FATAL]", err);
      let errorDetails = err.message;
      if (errorDetails.includes("serviceusage.serviceUsageConsumer")) {
        errorDetails = "IAM_PERMISSION_DENIED: The service account requires the 'Service Usage Consumer' role in project hirenest-os to interact with Identity Toolkit.";
      }
      res.status(500).json({ 
        error: "Approval execution failed", 
        details: errorDetails,
        code: err.code || "governance/internal-error"
      });
    }
  });

  app.post("/api/admin/onboard-node", verifyAdmin, async (req: Request, res: Response) => {
    console.log("[ONBOARD] Request received. Parsing payload...");
    try {
      const { email, password, role, companyName } = req.body;
      
      if (!email || !password || !role || !companyName) {
        console.warn("[ONBOARD] Validation failed: Missing parameters");
        return res.status(400).json({ error: "VALIDATION_FAILED: All node parameters (email, password, role, companyName) are required." });
      }

      console.log(`[ONBOARD] Provisioning node [${email}] with role [${role}] under authority [${(req as any).user?.email}]`);

      if (admin.apps.length === 0) {
        throw new Error("CORE_OFFLINE: Global authority layer is not initialized.");
      }
      
      const app = admin.app();
      const auth = app.auth();
      const db = app.firestore();

      // 1. Create Auth User
      let userRecord;
      try {
        console.log(`[ONBOARD] Checking for existing identity ${email}...`);
        userRecord = await auth.getUserByEmail(email);
        console.log(`[ONBOARD] Identity already exists. UID: ${userRecord.uid}`);
      } catch (authErr: any) {
        if (authErr.code === 'auth/user-not-found') {
          console.log(`[ONBOARD] Calling Auth.createUser for ${email}...`);
          userRecord = await auth.createUser({
            email,
            password,
            displayName: companyName || "New Node Agent"
          });
          console.log(`[ONBOARD] Auth created. UID: ${userRecord.uid}`);
        } else {
          throw authErr;
        }
      }

      const uid = userRecord.uid;
      const orgId = "NODE-" + Math.random().toString(36).substring(2, 11).toUpperCase();
      
      console.log(`[ONBOARD] Provisioning database records for UID: ${uid}...`);

      try {
        const batch = db.batch();

        // Map role to internal type
        let orgType = "client";
        if (role === "admin") orgType = "admin";
        else if (role?.includes("vendor") || role?.includes("recruiter")) {
          orgType = "vendor";
        } else if (role?.includes("client")) {
          orgType = "client";
        }

        console.log(`[ONBOARD] Calculated OrgType: ${orgType} for Role: ${role}`);

        // 2. Organization Record
        const orgRef = db.collection("organizations").doc(orgId);
        batch.set(orgRef, {
          organizationId: orgId,
          type: orgType,
          companyName,
          status: "approved",
          adminApproved: true,
          ndaUploaded: false,
          msaUploaded: false,
          ownerId: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 3. User Identity Record
        const userRef = db.collection("users").doc(uid);
        batch.set(userRef, {
          uid,
          email,
          role,
          organizationId: orgId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          verification: {
            emailVerified: false,
            identityVerified: false,
            businessVerified: true,
            trustScore: 40
          }
        });

        console.log(`[ONBOARD] Committing batch for ${email}...`);
        await batch.commit();
        console.log(`[ONBOARD SUCCESS] Identity matched: ${email} (UID: ${uid}, Node: ${orgId})`);
        return res.status(200).json({ success: true, uid, orgId });
      } catch (dbErr: any) {
        console.error("[ONBOARD DB FAIL] Reverting or flagging inconsistent state:", dbErr.message);
        // We could delete the auth user here, but it's risky if the fail was a timeout.
        return res.status(500).json({ 
          error: "DATABASE_SYNCHRONIZATION_FAILED", 
          details: dbErr.message,
          uid 
        });
      }
    } catch (err: any) {
      console.error("[ONBOARD CRITICAL_FAILURE]", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "INTERNAL_PROTOCOL_ERROR", details: err?.message || "An unhandled exception occurred in the governance layer." });
      }
    }
  });

  app.post("/api/admin/approve-requirement", verifyAdmin, (req, res) => {
    try {
      const { reqId, financials } = req.body;
      
      const idx = dbMock.requirements_public.findIndex((r: any) => r.id === reqId);
      if (idx !== -1) {
        dbMock.requirements_public[idx] = {
          ...dbMock.requirements_public[idx],
          status: "PUBLISHED",
          visibility: "VENDOR_NETWORK",
          adminApproved: true,
          matchProcessingStatus: "READY",
          financials,
          updatedAt: new Date().toISOString()
        };
        console.log("[APPROVAL SUCCESS] Global market visibility enabled.");
        res.json({ success: true, requirement: dbMock.requirements_public[idx] });
      } else {
        res.status(404).json({ error: "Requirement not found in HQ catalog" });
      }
    } catch (err: any) {
      console.error("[APPROVAL ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/update-user", verifyAdmin, async (req, res) => {
    try {
      const { uid, email, password, companyName, role, organizationId } = req.body;
      
      // Update Auth
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      
      if (admin.apps.length === 0) throw new Error("Firebase Admin not initialized");
      const app = admin.app();
      const auth = app.auth();
      
      if (Object.keys(updateData).length > 0) {
        await auth.updateUser(uid, updateData);
      }
      
      // Update Firestore
      const db = app.firestore();
      
      const userUpdate: any = { updatedAt: new Date().toISOString() };
      if (email) userUpdate.email = email;
      if (role) userUpdate.role = role || (role === "admin" ? "admin" : role === "vendor" ? "vendor" : "client");
      
      await db.collection("users").doc(uid).update(userUpdate);
      
      if (organizationId) {
        const orgUpdate: any = { updatedAt: new Date().toISOString() };
        if (companyName) orgUpdate.companyName = companyName;
        if (role) orgUpdate.type = role === "admin" ? "admin" : role === "vendor" ? "vendor" : "client";
        await db.collection("organizations").doc(organizationId).update(orgUpdate);
      }
      
      console.log("[UPDATE USER SUCCESS] Identity synchronized.");
      res.json({ success: true });
    } catch (err: any) {
      console.error("[UPDATE USER ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/delete-user", verifyAdmin, async (req, res) => {
    try {
      const { uid, organizationId } = req.body;
      console.log(`[DELETE USER] Purging identity ${uid}...`);
      
      if (admin.apps.length === 0) throw new Error("Firebase Admin not initialized");
      const app = admin.app();
      
      await app.auth().deleteUser(uid);
      const db = app.firestore();
      await db.collection("users").doc(uid).delete();
      if (organizationId) {
        await db.collection("organizations").doc(organizationId).delete();
      }
      
      await AuditService.log((req as any).user.uid, "IDENTITY_PURGED", { 
        targetUid: uid, 
        targetOrgId: organizationId,
        severity: "CRITICAL"
      });
      
      console.log("[DELETE USER SUCCESS] Identity purged.");
      res.json({ success: true });
    } catch (err: any) {
      console.error("[DELETE USER ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/strategy/analyze", async (req, res) => {
    const { requirements, metrics } = req.body;
    let analysis = "Strategic market check: Demand for Go and Rust is increasing. Margins stabilized at 18%.";
    
    if (ai) {
       try {
         const response = await withAIRetry(async () => {
           return await ai.models.generateContent({
             model: "gemini-3-flash-preview",
             contents: `Act as Chief Strategy Officer. Active Jobs: ${JSON.stringify(requirements || [])}. Metrics: ${JSON.stringify(metrics || {})}. Provide a brief strategic analysis.`
           });
         });
         analysis = response.text || analysis;
       } catch (err) {
         console.warn("[STRATEGY] AI deferred", err);
       }
    }
    res.json({ analysis });
  });

  app.post("/api/jobs/update-status", async (req, res) => {
    try {
      const { jobId, status } = req.body;
      if (!jobId || !status) {
        return res.status(400).json({ error: "Missing jobId or status" });
      }

      console.log(`[JOB STATUS] Updating ${jobId} to ${status}...`);

      if (admin.apps.length === 0) throw new Error("Firebase Admin not initialized");
      const app = admin.app();
      const db = app.firestore();
      await db.collection("requirements_public").doc(jobId).update({
        status: status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Update Mock for local consistency
      const idx = dbMock.requirements_public.findIndex((r: any) => r.id === jobId);
      if (idx !== -1) {
        dbMock.requirements_public[idx].status = status;
      }

      console.log("[JOB STATUS] Successfully updated via Admin SDK.");
      res.json({ success: true });
    } catch (err: any) {
      console.error("[JOB STATUS ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/admin/notifications", (req, res) => res.json(dbMock.systemNotifications || []));
  app.get("/api/status", (req, res) => res.json({ status: "online", version: "4.2.2" }));

  app.get("/api/metrics", (req, res) => {
    const { type } = req.query;
    console.log(`[METRICS] Serving ${type} metrics...`);
    if (!dbMock.metrics) return res.status(500).json({ error: "Metrics missing" });
    res.json(dbMock.metrics);
  });

  app.get("/api/user/candidates", (req, res) => {
    try {
       const { orgId } = req.query;
       console.log(`[CANDIDATES] Fetching for ORG: ${orgId}`);
       
       if (!orgId) {
         return res.json({ candidates: [] });
       }

       // Ensure candidatePool exists
       if (!dbMock.candidatePool) {
         dbMock.candidatePool = [];
       }

       const filtered = dbMock.candidatePool.filter((c: any) => String(c.vendorId) === String(orgId));
       res.json({ candidates: filtered });
    } catch (e: any) {
       console.error("[CANDIDATES FETCH ERROR]", e);
       res.status(500).json({ error: "Candidate fetch failed", message: e.message });
    }
  });

  app.get("/api/matching/global", (req, res) => {
    try {
      const { requirementId, skills } = req.query;
      console.log(`[MATCHING] Running global search for REQ: ${requirementId}`);
      
      const skillList = String(skills || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
      const candidates = dbMock.candidatePool || [];
      
      let matches = candidates.map((c: any) => {
        const cSkills = Array.isArray(c.skills) ? c.skills : [];
        const matchCount = cSkills.filter((cs: string) => skillList.includes(cs.toLowerCase())).length;
        const score = skillList.length > 0 ? Math.round((matchCount / skillList.length) * 40) + 60 : (c.matchScore || 0);
        return { ...c, matchScore: score, isGlobalMatch: true };
      });

      matches = matches.filter((m: any) => m.matchScore > 70);
      res.json({ matches: matches.sort((a: any, b: any) => b.matchScore - a.matchScore) });
    } catch (err: any) {
      console.error("[GLOBAL MATCH ERROR]", err);
      res.status(500).json({ error: "Global matching failed", details: err.message });
    }
  });

  app.post("/api/admin/notify-approval", verifyAdmin, (req, res) => {
    const { jobId, jobTitle, clientName } = req.body;
    console.log(`[NOTIFICATION] New Approval Request: ${jobTitle} from ${clientName}`);
    dbMock.systemNotifications.push({
      id: "NOTIF-" + Date.now(),
      type: "APPROVAL_REQUEST",
      title: "Budget Approval Required",
      message: `${clientName} submitted ${jobTitle} for financial approval.`,
      jobId,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true });
  });

  app.post("/api/match-candidates-detailed", async (req, res) => {
    const { jd, candidateProfile } = req.body;
    let result = {
      matchScore: 0,
      breakdown: {
        skillsScore: 0,
        experienceScore: 0,
        domainScore: 0,
        locationScore: 0,
        bonusScore: 0,
        totalScore: 0
      },
      summary: "Detailed matching currently simulated.",
      strengths: [],
      gaps: [],
      missingSkills: [],
      outreachDrafts: {
        founder: "Hey, I saw your profile and it looks like a great fit for our mission-driven team.",
        professional: "Dear Candidate, we believe your background aligns well with our current requirements.",
        executive: "We have an opening for a senior role that fits your leadership profile.",
        warm: "Hi! Loved your recent projects. Let's talk about how you can contribute here."
      },
      recruiterAssessment: "Manual review recommended.",
      recommendation: "CONSIDER",
      nextSteps: "Conduct technical interview."
    };

    if (ai) {
      try {
        const response = await withAIRetry(async () => {
          return await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `Act as a Senior Executive Recruiter and Technical Lead. Perform a high-fidelity matching analysis between the provided Job Description (JD) and Candidate Profile.

CRITICAL INSTRUCTION FOR SKILL ANALYSIS:
1. Extract ALL technical requirements from the JD.
2. Identify which of these are explicitly found in the candidate resume (Strengths).
3. Identify which are missing but relevant (Gaps).
4. Identify which are MANDATORY in the JD but COMPLETELY ABSENT in the resume (missingSkills). Do not hallucinate skills.

Return a strictly valid JSON object with: 
- matchScore (number 0-100, be strict, only 90+ for near-perfect matches)
- breakdown (object with weights: skillsScore (max 40), experienceScore (max 20), domainScore (max 20), locationScore (max 10), bonusScore (max 10). totalScore is sum)
- summary (2-3 sentences of executive summary)
- strengths (array of strings, e.g. "8+ years in AWS/Kubernetes")
- gaps (array of strings, e.g. "Missing experience with Kafka")
- missingSkills (array of strings - specifically technical skills from JD that are NOT in candidate resume)
- recruiterAssessment (A punchy, honest internal note for the CEO/CTO)
- recommendation (STRONG_FIT, CONSIDER, NOT_SUITABLE)
- nextSteps (Actionable next step)
- outreachDrafts (Personalized outreach: keys founder, professional, executive, warm)

JD Context: ${jd}
Candidate Profile: ${candidateProfile}`,
            config: { responseMimeType: "application/json" }
          });
        });
        
        if (response.text) {
          const parsed = JSON.parse(response.text.replace(/```json|```/g, "").trim());
          // Merge with defaults to ensure all required fields are present
          result = { ...result, ...parsed };
          if (parsed.breakdown) {
            result.breakdown = { ...result.breakdown, ...parsed.breakdown };
          }
        }
      } catch (e) {
        console.warn("[AI MATCH] Error", e);
      }
    }
    res.json(result);
  });

  app.post("/api/reasoning/execute", async (req, res) => {
    const { intent, payload, instructions, modes, context } = req.body;
    
    if (!ai) return res.status(503).json({ error: "AI_OFFLINE" });

    try {
      console.log(`[REASONING_NODE] Processing Intent: ${intent} with Modes: ${modes?.join(', ')}`);
      
      const prompt = `
        GOVERNANCE PROTOCOL: INTEGRITY_OS_REASONING_V1
        ACTIVE_PERSONAE: 
        ${instructions}

        USER_INTENT: ${intent}
        DATA_CONTEXT: ${JSON.stringify(payload)}

        MISSION_DIRECTIVE:
        Apply the active reasoning modes to the user intent and provided data. 
        Provide a high-fidelity analysis that follows the specific mood and constraints of the active personae.
        
        OUTPUT_SCHEMA (Strict JSON):
        {
          "analysis": "The detailed reasoning output (Markdown supported)",
          "appliedModes": ["mode1", "mode2"],
          "confidence": 0.0 to 1.0,
          "suggestions": ["Next actionable step 1", "Next actionable step 2"],
          "workflowTriggers": ["TRIGGER_CODE_1", "TRIGGER_CODE_2"]
        }
      `;

      const response = await withAIRetry(async () => {
        return await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
      });

      const result = JSON.parse(response.text.replace(/```json|```/g, "").trim());
      res.json(result);
    } catch (e: any) {
      console.error("[REASONING_SERVER_ERROR]", e);
      res.status(500).json({ error: "Reasoning Execution Failed", details: e.message });
    }
  });

  app.post("/api/bulk-parse-resumes", async (req, res) => {
    const { resumeTexts } = req.body;
    let results = (resumeTexts || []).map((t: string) => ({ 
      name: "Parsed Candidate", 
      email: "parsed@example.com", 
      skills: ["General Skills"],
      resumeText: t 
    }));

    if (ai && resumeTexts?.length > 0) {
      try {
        const response = await withAIRetry(async () => {
          return await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `As an expert technical recruiter, perform a production-grade extraction of candidate profiles from these resumes. 
              Output a strictly valid JSON array of objects, each representing a candidate.
              
              Each object MUST have:
              - name (Full Name)
              - email (Found email)
              - phone (Found phone)
              - linkedin (LinkedIn URL if found)
              - skills (Array of high-fidelity technical skills extracted)
              - summary (2-3 sentence professional summary)
              - experience (Years of experience string)
              - location (City, State if found)
              - resumeText (The raw refined text provided)
              
              Resumes to Parse: ${JSON.stringify(resumeTexts)}`,
            config: { responseMimeType: "application/json" }
          });
        });

        if (response.text) {
          results = JSON.parse(response.text.replace(/```json|```/g, "").trim());
        }
      } catch (e) {
        console.warn("[AI BULK] Error", e);
      }
    }
    res.json(results);
  });

  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 } // 15MB per file
  });

  app.post("/api/extract-text", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const anyReq = req as any;
      if (!anyReq.file) {
        console.warn("[EXTRACT] No file provided in request");
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const filename = anyReq.file.originalname.toLowerCase();
      const mimetype = anyReq.file.mimetype;
      let text = "";

      console.log(`[EXTRACT] Analyzing: ${filename} (Size: ${(anyReq.file.size / 1024).toFixed(2)} KB, Mime: ${mimetype})`);

      try {
          console.log(`[EXTRACT] Engines: pdfParse=${!!pdfParse}, pdfjs=${!!pdfjsLib}`);
          
          if (mimetype === 'application/pdf' || filename.endsWith(".pdf")) {
            console.log("[EXTRACT] Identifying as PDF...");
            
            // Engine 1: pdf-parse (Fastest in Node)
            if (pdfParse) {
              try {
                console.log("[EXTRACT] Engine: PDF-Parse starting...");
                const data = await pdfParse(anyReq.file.buffer);
                text = data.text || "";
                console.log(`[EXTRACT] PDF-Parse result length: ${text.length}`);
              } catch (e: any) {
                console.warn("[EXTRACT] PDF-Parse engine failed:", e.message);
              }
            }

            // Engine 2: pdfjs-dist fallback
            if ((!text || text.trim().length < 50) && pdfjsLib) {
              try {
                console.log("[EXTRACT] Engine: PDFJS-Dist Fallback starting...");
                const uint8Array = new Uint8Array(anyReq.file.buffer);
                // Configuration to make it work better in Node
                const loadingTask = pdfjsLib.getDocument({ 
                  data: uint8Array, 
                  useSystemFonts: true,
                  disableFontFace: true,
                  isEvalSupported: false ,
                  stopAtErrors: false
                });
                const pdfDocument = await loadingTask.promise;
                let fullText = "";
                for (let i = 1; i <= pdfDocument.numPages; i++) {
                  const page = await pdfDocument.getPage(i);
                  const textContent = await page.getTextContent();
                  const pageText = textContent.items.map((item: any) => (item as any).str || "").join(" ");
                  fullText += pageText + "\n";
                }
                text = fullText;
                console.log(`[EXTRACT] PDFJS-Dist result length: ${text.length}`);
              } catch (e: any) {
                console.error("[EXTRACT] PDFJS-Dist fallback also failed:", e.message);
              }
            }

            if (!text || text.length < 5) {
                console.warn("[EXTRACT] All PDF engines failed to yield text. Attempting buffer string conversion.");
                text = anyReq.file.buffer.toString('utf-8');
            }
          } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || filename.endsWith(".docx")) {
            console.log("[EXTRACT] Identifying as DOCX...");
            try {
              const result = await mammoth.extractRawText({ buffer: anyReq.file.buffer });
              text = result.value || "";
              console.log(`[EXTRACT] Mammoth result length: ${text.length}`);
            } catch (e: any) {
              console.error("[EXTRACT] Mammoth failed:", e.message);
              // Fallback: try to read as plain text if it's actually not a valid docx
              text = anyReq.file.buffer.toString('utf-8');
            }
          } else if (mimetype.startsWith('text/') || filename.endsWith(".txt")) {
            text = anyReq.file.buffer.toString('utf-8');
            console.log("[EXTRACT] Identified as Text");
          } else {
            console.log("[EXTRACT] Unknown format, trying UTF-8 conversion as last resort");
            text = anyReq.file.buffer.toString('utf-8');
          }
      } catch (innerErr: any) {
          console.error("[EXTRACT] Core switch-case error:", innerErr);
          throw new Error(`Extraction core failure: ${innerErr.message}`);
      }

      const cleanText = (text || "").replace(/\s+/g, ' ').trim();
      
      if (cleanText.length < 10) {
          console.warn("[EXTRACT] Warning: Extracted text is suspiciously short");
          // Don't throw yet, maybe it's just a very small file
      }

      res.status(200).json({ text: cleanText });
    } catch (err: any) {
      console.error("[EXTRACT FATAL ERROR]", err);
      res.status(500).json({ 
        error: "Extraction Failed", 
        message: err.message || "An unexpected error occurred during intelligence extraction.",
        filename: (req as any).file?.originalname
      });
    }
  });

  app.post("/api/parse-jd", async (req, res) => {
    const { jdText } = req.body;
    let result = { 
      title: "New Requirement", 
      skills: [],
      mandatorySkills: [],
      preferredSkills: [],
      minExp: 0,
      maxExp: 15,
      location: "Remote",
      responsibilities: [],
      summary: "",
      jdFullProfile: "" 
    };
    
    if (ai) {
      try {
        const response = await withAIRetry(async () => {
          return await ai.models.generateContent({
            model: "gemini-2.0-flash",
            contents: `As an expert technical recruiter, perform a production-grade parsing of this Job Description. 
              Do not lose any critical information. Structure it for a high-end staffing OS.
              
              Return a JSON object with: 
              - title (Professional Job Title)
              - mandatorySkills (Array of critical technical skills)
              - preferredSkills (Array of nice-to-have skills)
              - minExp (Number)
              - maxExp (Number)
              - location (City, State or Remote/Hybrid)
              - responsibilities (Array of top 5-7 key duties)
              - summary (Executive summary of the role)
              - jdFullProfile (A well-formatted Markdown version of the JD, professionally structured with headers and lists)
              
              JD Text: ${jdText}`,
            config: { responseMimeType: "application/json" }
          });
        });
        
        if (response.text) {
          const parsed = JSON.parse(response.text.replace(/```json|```/g, "").trim());
          result = { ...result, ...parsed };
          // Ensure 'skills' key exists for backward compatibility if needed by frontend
          (result as any).skills = [...(result.mandatorySkills || []), ...(result.preferredSkills || [])];
        }
      } catch (err) {
        console.warn("[PARSE-AI] Deferred", err);
      }
    }
    res.json(result);
  });

  app.post("/api/deal/intelligence", async (req, res) => {
    console.log("[DEAL-INTEL] Incoming request body keys:", Object.keys(req.body));
    const { profile, jd, type } = req.body;
    let result = { 
      questions: ["Verify core technical experience", "Ask about recent projects", "Check cultural fit"],
      starters: ["Hi, I reviewed your profile for the current opening.", "Are you open to a quick technical discussion?"]
    };

    if (ai) {
      try {
        console.log(`[DEAL-INTEL] AI call triggered for ${type}`);
        const prompt = type === 'client' 
          ? `As a technical recruiter, generate 5 deep interview questions for a candidate with this profile: ${JSON.stringify(profile)} applying for this JD: ${jd}. Focus on gaps and specific skills.`
          : `As a professional recruiter, generate 3 professional conversation starters for this candidate: ${JSON.stringify(profile)}.`;

        const response = await withAIRetry(async () => {
          return await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
          });
        });
        
        if (response.text) {
          console.log("[DEAL-INTEL] AI response received successfully");
          const lines = response.text.split('\n').filter((l: string) => l.trim().length > 10).map((l: string) => l.replace(/^\d+\.\s*/, '').trim());
          if (type === 'client') result.questions = lines.slice(0, 5);
          else result.starters = lines.slice(0, 3);
        }
      } catch (err: any) {
        console.error("[DEAL-INTEL] AI Error:", err.message || err);
      }
    } else {
      console.warn("[DEAL-INTEL] AI client NOT initialized (missing key?)");
    }
    res.json(result);
  });

  // --- API CATCH-ALL ---
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found", path: req.path, method: req.method });
  });

  // --- VITE / SPA FALLBACK ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      try {
        const template = fs.readFileSync(path.resolve(currentDirname, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath, { index: false }));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // --- GLOBAL ERROR HANDLER ---
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("[FATAL GLOBAL ERROR]", err);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: "Internal Server Error", 
        message: err.message || "An unexpected error occurred", 
        path: req.path 
      });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OS] Server running on port ${PORT}`);
  });

  return app;
}

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught Exception thrown:', err);
  // Optional: process.exit(1) if you want to force a restart
});

const appPromise = startServer().catch(err => {
  console.error("[STARTUP FATAL]", err);
  process.exit(1);
});

export default appPromise;

