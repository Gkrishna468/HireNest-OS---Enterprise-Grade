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

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Initialization & Error Control ---
console.log("[SERVER START] Booting HireNest Global OS Intelligence Layer...");

let pdf: any;
try {
  const pdfParse = require('pdf-parse');
  pdf = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
  console.log("[DEP] PDF-Parse loaded successfully");
} catch (e) {
  console.error("[DEP] PDF-Parse load delayed/failed", e);
}

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
    { id: "0xpXdzSQE6V92xbnCkiczPHexiU2", email: "gopal@hirenestworkforce.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() },
    { id: "gopal-2", email: "gopalkrishna0046@gmail.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() }
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

// --- Server Setup ---
async function startServer() {
  const app = express();
  const PORT = 3000;
  
  app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.path}`);
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API ROUTES ---

  app.get("/api/ping", (req, res) => res.json({ status: "pong", time: new Date().toISOString() }));

  app.get("/api/user/context", (req, res) => {
    const { orgId, role } = req.query;
    console.log(`[CONTEXT] Syncing state for ${role} in ${orgId}`);
    
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
      const published = (dbMock.requirements_public || []).filter((r: any) => r.visibility === 'VENDOR_NETWORK' || r.status === 'PUBLISHED');
      res.json({ requirements: published, metrics: metrics });
    } catch (err: any) {
      console.error("[CONTEXT ERROR]", err);
      res.status(500).json({ error: "Context sync failed", message: err.message });
    }
  });

  app.get("/api/admin/governance-data", (req, res) => {
    try {
      console.log("[HQ SYNC] Fetching global state...");
      const payload = {
        organizations: dbMock.organizations || [],
        requirements_public: dbMock.requirements_public || [],
        candidatePool: dbMock.candidatePool || [],
        submissions: dbMock.submissions || [],
        dealRooms: dbMock.dealRooms || [],
        metrics: dbMock.metrics || {},
        lastSync: new Date().toISOString()
      };
      res.status(200).json(payload);
    } catch (err: any) {
      console.error("[HQ SYNC ERROR]", err);
      res.status(500).json({ error: "Governance sync failure", details: err.message });
    }
  });

  app.post("/api/admin/approve-requirement", (req, res) => {
    try {
      const { reqId, financials } = req.body;
      console.log(`[APPROVAL] Releasing REQ ${reqId} to Global OS...`);
      
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

  app.post("/api/strategy/analyze", async (req, res) => {
    const { requirements, metrics } = req.body;
    let analysis = "Strategic market check: Demand for Go and Rust is increasing. Margins stabilized at 18%.";
    
    if (ai) {
       try {
         const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });
         const prompt = `Act as Chief Strategy Officer. Active Jobs: ${JSON.stringify(requirements || [])}. Metrics: ${JSON.stringify(metrics || {})}. Provide a brief strategic analysis.`;
         const result = await model.generateContent(prompt);
         const response = await result.response;
         analysis = response.text() || analysis;
       } catch (err) {
         console.warn("[STRATEGY] AI deferred", err);
       }
    }
    res.json({ analysis });
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
    const { orgId } = req.query;
    console.log(`[CANDIDATES] Fetching for ORG: ${orgId}`);
    const filtered = (dbMock.candidatePool || []).filter((c: any) => c.vendorId === orgId);
    res.json({ candidates: filtered });
  });

  app.get("/api/matching/global", (req, res) => {
    const { requirementId, skills } = req.query;
    console.log(`[MATCHING] Running global search for REQ: ${requirementId}`);
    
    const skillList = String(skills || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    
    let matches = dbMock.candidatePool.map((c: any) => {
      const matchCount = c.skills.filter((cs: string) => skillList.includes(cs.toLowerCase())).length;
      const score = skillList.length > 0 ? Math.round((matchCount / skillList.length) * 40) + 60 : c.matchScore;
      return { ...c, matchScore: score, isGlobalMatch: true };
    });

    matches = matches.filter((m: any) => m.matchScore > 70);
    res.json({ matches: matches.sort((a: any, b: any) => b.matchScore - a.matchScore) });
  });

  app.post("/api/admin/notify-approval", (req, res) => {
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
      summary: "Detailed matching currently simulated.",
      strengths: ["Matching skills found"],
      gaps: ["Verify location"],
      outreachDrafts: {
        founder: "Hey, I saw your profile and it looks like a great fit for our mission-driven team.",
        professional: "Dear Candidate, we believe your background aligns well with our current requirements.",
        executive: "We have an opening for a senior role that fits your leadership profile.",
        warm: "Hi! Loved your recent projects. Let's talk about how you can contribute here."
      }
    };

    if (ai) {
      try {
        const prompt = `Analyze this JD and Candidate Profile. Return a JSON object with: 
        matchScore (number 0-100), 
        summary (string), 
        strengths (array of strings), 
        gaps (array of strings), 
        outreachDrafts (object with keys: founder, professional, executive, warm).
        JD: ${jd}
        Profile: ${candidateProfile}`;

        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: { responseMimeType: "application/json" }
        });
        
        if (response.text) {
          result = JSON.parse(response.text.replace(/```json|```/g, "").trim());
        }
      } catch (e) {
        console.warn("[AI MATCH] Error", e);
      }
    }
    res.json(result);
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
        const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const prompt = `Extract structured profile information for these resumes. Return an array of objects, each with: name, email, phone, linkedin, skills (array), and resumeText (truncated if long).
        Resumes: ${JSON.stringify(resumeTexts)}`;

        const genResult = await model.generateContent(prompt);
        const response = await genResult.response;
        const text = response.text();

        if (text) {
          results = JSON.parse(text.replace(/```json|```/g, "").trim());
        }
      } catch (e) {
        console.warn("[AI BULK] Error", e);
      }
    }
    res.json(results);
  });

  const upload = multer({ storage: multer.memoryStorage() });

  app.post("/api/extract-text", upload.single('file'), async (req: Request, res: Response) => {
    try {
      const anyReq = req as any;
      if (!anyReq.file) return res.status(400).json({ error: "No file uploaded" });
      const filename = anyReq.file.originalname.toLowerCase();
      let text = "";

      if (filename.endsWith(".pdf")) {
        if (typeof pdf === 'function') {
           const data = await pdf(anyReq.file.buffer);
           text = data.text;
        } else {
           throw new Error("PDF parser not initialized");
        }
      } else if (filename.endsWith(".docx")) {
        const result = await mammoth.extractRawText({ buffer: anyReq.file.buffer });
        text = result.value;
      } else {
        text = anyReq.file.buffer.toString();
      }
      res.json({ text });
    } catch (err: any) {
      console.error("[EXTRACT ERROR]", err);
      res.status(500).json({ error: "Extraction Failed", message: err.message });
    }
  });

  app.post("/api/parse-jd", async (req, res) => {
    const { jdText } = req.body;
    let result = { title: "New Requirement", skills: [] };
    
    if (ai) {
      try {
        const model = ai.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const prompt = `Extract Job Title and top 5 Technical Skills from this JD. Return JSON with 'title' (string) and 'skills' (array of strings). JD: ${jdText}`;
        const genResult = await model.generateContent(prompt);
        const response = await genResult.response;
        const text = response.text();
        
        if (text) {
          const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
          result = { ...result, ...parsed };
        }
      } catch (err) {
        console.warn("[PARSE-AI] Deferred", err);
      }
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
        const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
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
    console.error("[FATAL ERROR]", err);
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

const appPromise = startServer().catch(err => {
  console.error("[STARTUP FATAL]", err);
  process.exit(1);
});

export default appPromise;
