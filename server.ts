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

// Initialize Firebase Admin
try {
  if (admin.apps.length === 0) {
    const firebaseConfig = require('./firebase-applet-config.json');
    console.log(`[HQ CORE] Initializing Global Authority Node: ${firebaseConfig.projectId}`);
    
    // Standard initialization for AI Studio managed projects
    admin.initializeApp({
      projectId: firebaseConfig.projectId,
      credential: admin.credential.applicationDefault()
    });
    console.log("[HQ CORE] Handshake complete. Governance layer established.");
  }
} catch (e: any) {
  console.error("[HQ CORE FATAL] Lifecycle failure:", e.message);
}
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Initialization & Error Control ---
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
    { id: "user-client-1", email: "client@example.com", role: "client", organizationId: "C-CLIENT-001", createdAt: new Date().toISOString() },
    { id: "user-vendor-1", email: "vendor@example.com", role: "vendor", organizationId: "V-VENDOR-001", createdAt: new Date().toISOString() },
    { id: "user-acme", email: "admin@acme.com", role: "client", organizationId: "C-8821", createdAt: new Date().toISOString() }
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

  // --- API ROUTES ---

  app.get("/api/ping", (req, res) => res.json({ status: "pong", time: new Date().toISOString() }));

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

  app.get("/api/admin/governance-data", async (req, res) => {
    try {
      const db = admin.firestore();
      
      // Try to fetch real data but don't crash if it fails
      let users: any[] = [];
      let organizations: any[] = [];
      let mode = "LIVE";
      
      try {
        const db = admin.firestore();
        console.log(`[HQ SYNC] Handshake initiated with Node: ${db.projectId}`);
        const [usersSnap, orgsSnap] = await Promise.all([
          db.collection("users").get(),
          db.collection("organizations").get()
        ]);
        
        users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        organizations = orgsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        console.log(`[HQ SYNC] Intelligence retrieval successful. Identities: ${users.length}, Nodes: ${organizations.length}`);
      } catch (dbErr: any) {
        if (dbErr.message.includes('PERMISSION_DENIED') || String(dbErr.code) === '7') {
          console.error(`[HQ SYNC PERMISSION DENIED] Authority rejected for node ${admin.app().options.projectId}. Ensure Service Account has 'Cloud Datastore User' role.`);
        } else {
          console.error("[HQ DB FAIL] Sync pipeline interrupted:", dbErr.message);
        }
        users = dbMock.users;
        organizations = dbMock.organizations;
        mode = "FALLBACK";
      }

      // If database is effectively empty, use mock for demo/visual consistency
      if (users.length === 0) {
         console.warn("[HQ SYNC] User list empty, seeding mock identities.");
         users = dbMock.users;
         if (mode === "LIVE") mode = "HYBRID_MOCK";
      }

      if (organizations.length === 0) {
         console.warn("[HQ SYNC] Organization list empty, seeding mock entities.");
         organizations = dbMock.organizations;
         if (mode === "LIVE") mode = "HYBRID_MOCK";
      }

      const payload = {
        organizations,
        users,
        requirements_public: dbMock.requirements_public || [],
        candidatePool: dbMock.candidatePool || [],
        submissions: dbMock.submissions || [],
        dealRooms: dbMock.dealRooms || [],
        metrics: dbMock.metrics || {},
        lastSync: new Date().toISOString(),
        isMock: mode !== "LIVE",
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
        error: err.message,
        isMock: true,
        mode: "FATAL_FALLBACK"
      });
    }
  });

  app.post("/api/admin/onboard-node", async (req, res) => {
    const { email, password, role, companyName } = req.body;
    try {
      const auth = admin.auth();
      const db = admin.firestore();

      // 1. Create Auth User
      const userRecord = await auth.createUser({
        email,
        password,
        displayName: companyName
      });

      const uid = userRecord.uid;
      const orgId = "ORG-" + Math.random().toString(36).substr(2, 9);

      // 2. Create Organization Doc
      await db.collection("organizations").doc(orgId).set({
        organizationId: orgId,
        type: role === "admin" ? "admin" : role === "vendor" ? "vendor" : "client",
        companyName,
        status: "approved",
        adminApproved: true,
        ndaUploaded: false,
        msaUploaded: false,
        ownerId: uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 3. Create User Doc
      await db.collection("users").doc(uid).set({
        uid,
        email,
        role,
        organizationId: orgId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      res.status(200).json({ success: true, uid, orgId });
    } catch (err: any) {
      console.error("[ONBOARD ERROR]", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/approve-requirement", (req, res) => {
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

  app.post("/api/admin/update-user", async (req, res) => {
    try {
      const { uid, email, password, companyName, role, organizationId } = req.body;
      
      // Update Auth
      const updateData: any = {};
      if (email) updateData.email = email;
      if (password) updateData.password = password;
      
      if (Object.keys(updateData).length > 0) {
        await admin.auth().updateUser(uid, updateData);
      }
      
      // Update Firestore
      const db = admin.firestore();
      
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

  app.post("/api/admin/delete-user", async (req, res) => {
    try {
      const { uid, organizationId } = req.body;
      console.log(`[DELETE USER] Purging identity ${uid}...`);
      
      await admin.auth().deleteUser(uid);
      const db = admin.firestore();
      await db.collection("users").doc(uid).delete();
      if (organizationId) {
        await db.collection("organizations").doc(organizationId).delete();
      }
      
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

      // Update REAL Firestore via Admin SDK
      const db = admin.firestore();
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

const appPromise = startServer().catch(err => {
  console.error("[STARTUP FATAL]", err);
  process.exit(1);
});

export default appPromise;

