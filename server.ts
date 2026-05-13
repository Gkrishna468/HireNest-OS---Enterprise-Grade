import express, { Request } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import mammoth from 'mammoth';
import nlp from 'compromise';
import natural from 'natural';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Local OS Intelligence Engine ---
class OSIntelligenceEngine {
  public static COMMON_SKILLS = [
    // Languages & Frameworks
    "react", "typescript", "javascript", "node.js", "python", "java", "c++", "c#", "go", "rust", "php", "ruby", "swift", "kotlin",
    "angular", "vue", "next.js", "nest.js", "express", "spring boot", "django", "flask", "laravel", "rails", "flutter", "react native",
    // Infrastructure & Cloud
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "jenkins", "ci/cd", "serverless", "lambda", "ec2", "s3",
    // Databases
    "sql", "postgresql", "mysql", "mongodb", "redis", "elasticsearch", "dynamodb", "snowflake", "oracle", "mariadb",
    // Science & Data
    "pytorch", "tensorflow", "scikit-learn", "pandas", "numpy", "spark", "hadoop", "kafka", "tableau", "powerbi",
    // UI/UX & Design
    "figma", "adobe xd", "sketch", "tailwind", "sass", "css3", "html5", "storybook",
    // Concepts & Tools
    "graphql", "rest api", "microservices", "agile", "scrum", "git", "jira", "confluence", "trello", "unit testing", "jest", "cypress"
  ];

  static extractProfile(text: string) {
    const doc = nlp(text);
    
    // Extract Names - Try multiple heuristics
    const names = doc.people().out('array');
    let name = "Anonymous Candidate";
    if (names.length > 0) {
      name = names[0];
    } else {
      // Heuristic: First line that looks like a name (not an email or phone)
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      for (const line of lines) {
        if (!line.includes('@') && !line.match(/\d{4}/) && line.length > 3 && line.length < 50) {
           name = line;
           break;
        }
      }
    }

    // Extract Emails
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    const email = emailMatch ? emailMatch[0] : "";

    // Extract Phone
    const phoneMatch = text.match(/(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : "";

    // Extract Skills - Case insensitive and word boundary aware
    const lowerText = text.toLowerCase();
    const skills = this.COMMON_SKILLS.filter(skill => {
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(lowerText);
    });
    
    // Extract Experience
    const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    const experience = expMatch ? `${expMatch[1]}+ years` : "Entry Level / Unstated";

    return {
      name: name.slice(0, 50),
      email: email.slice(0, 50),
      phone: phone.slice(0, 30),
      skills: Array.from(new Set(skills)).slice(0, 15),
      topExperience: experience,
      summary: `${name} shows proficiency in ${skills.slice(0, 3).join(", ") || 'various technologies'}.`,
    };
  }

  static calculateMatch(jd: string, profileText: string) {
    const jdSkills = this.COMMON_SKILLS.filter(s => {
       const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
       return regex.test(jd);
    });
    const profileSkills = this.COMMON_SKILLS.filter(s => {
       const regex = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
       return regex.test(profileText);
    });
    
    const intersection = jdSkills.filter(s => profileSkills.includes(s));
    let score = 0;
    
    if (jdSkills.length > 0) {
      score = (intersection.length / jdSkills.length) * 100;
    } else {
      // Fallback to text similarity if no specific skills found in JD
      const tokenizer = new natural.WordTokenizer();
      const jdTokens = tokenizer.tokenize(jd.toLowerCase());
      const pTokens = tokenizer.tokenize(profileText.toLowerCase());
      const common = jdTokens.filter(t => pTokens.includes(t) && t.length > 4);
      score = Math.min(100, (common.length / 10) * 100);
    }
    
    return {
      matchScore: Math.round(score),
      strengths: intersection,
      gaps: jdSkills.filter(s => !profileSkills.includes(s)),
      summary: score > 70 ? "Strong technical alignment with requirements." : (score > 40 ? "Partial match with some skill gaps." : "Low technical alignment."),
    };
  }

  static generateOutreach(jdTitle: string, candidateName: string, skills: string[]) {
    const firstName = candidateName.split(' ')[0];
    const topSkill = skills[0] || "expertise";

    return {
      founder: `Hi ${firstName}, I'm the founder of HireNest. We're looking for a ${jdTitle} and your background in ${topSkill} really stood out. Would love to chat about our mission.`,
      professional: `Dear ${candidateName}, I'm reaching out regarding a ${jdTitle} position. Your profile suggests you have the ideal technical stack, specifically in ${skills.slice(0, 2).join(" and ")}.`,
      executive: `${firstName}, your leadership in ${topSkill} aligns perfectly with our ${jdTitle} opening. We are building a high-performance team and want you involved.`,
      warm: `Hey ${firstName}! Found your profile while looking for a ${jdTitle}. Love what you've done with ${topSkill}. Let's catch up if you're open to new roles!`
    };
  }
}

// Configure Multer for in-memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Initialize AI if key is present
let ai: any = null; 
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Request Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });

  // IMPORTANT: middleware for parsing JSON must come before routes
  app.use(express.json({ limit: '50mb' }));

  // --- Mock Database (Source of Truth for Admin Proxy) ---
  const db: any = {
    metrics: {
      revenue: 1450000,
      activeDeals: 42,
      placements: 18,
      margin: "18%",
      vendorQuality: 92,
      recruiterProductivity: 88,
    },
    organizations: [
      { id: "ORG-GLOBAL-HQ", name: "HireNest Global HQ", type: "client", companyName: "HireNest Global", msaUploaded: true, ndaUploaded: true, rating: 5.0, status: "approved" },
      { id: "C-CLIENT-001", name: "HireNest Client A", type: "client", companyName: "Enterprise Solutions Inc", msaUploaded: true, ndaUploaded: true, rating: 4.8, status: "approved" },
      { id: "V-VENDOR-001", name: "HireNest Vendor B", type: "vendor", companyName: "Elite Staffing Group", msaUploaded: true, ndaUploaded: true, rating: 4.6, status: "approved" },
      { id: "C-8821", name: "Acme Corp", type: "client", companyName: "Acme Corp", msaUploaded: true, ndaUploaded: false, rating: 4.2, status: "approved" },
      { id: "V-2048", name: "ABC Staffing", type: "vendor", companyName: "ABC Staffing", msaUploaded: true, ndaUploaded: true, rating: 4.5, status: "approved" }
    ],
    users: [
      { id: "admin-1", email: "admin@hirenest.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() },
      { id: "0xpXdzSQE6V92xbnCkiczPHexiU2", email: "gopal@hirenestworkforce.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() },
      { id: "gopal-2", email: "gopalkrishna0046@gmail.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() },
      { id: "ZlpY4qN9BKS7n0yoMQP7LDMvvJ53", email: "founder.itconsulting@outlook.com", role: "admin", organizationId: "ORG-GLOBAL-HQ", createdAt: new Date().toISOString() }
    ],
    requirements: [
      { id: "REQ-001", clientId: "C-CLIENT-001", title: "Senior Cloud Architect", skills: ["AWS", "Kubernetes", "Terraform"], status: "PUBLISHED", rate: "$150/hr", submissions: 8, createdAt: new Date().toISOString() },
      { id: "REQ-002", clientId: "C-8821", title: "Frontend Lead (React)", skills: ["React", "TypeScript", "Tailwind"], status: "PUBLISHED", rate: "$120/hr", submissions: 5, createdAt: new Date().toISOString() }
    ],
    candidates: [
      { id: "CAND-001", vendorId: "V-VENDOR-001", name: "John Smith", skills: ["Go", "Kubernetes"], matchScore: 95, pipelineStage: "Interviewing", email: "jsmith@example.com", createdAt: new Date().toISOString() },
      { id: "CAND-002", vendorId: "V-2048", name: "Sarah Connor", skills: ["React", "Node.js"], matchScore: 92, pipelineStage: "Screening", email: "sconnor@example.com", createdAt: new Date().toISOString() }
    ],
    submissions: [
        { id: "SUB-001", requirementId: "REQ-001", candidateId: "CAND-001", status: "submitted", vendorId: "V-VENDOR-001" }
    ],
    dealRooms: [
      { id: "DR-501", requirementId: "REQ-001", client: "C-8821", vendor: "V-2048", candidate: "CAND-101", status: "Active", identitiesRevealed: false },
    ],
    messages: [
      { id: "M-001", dealRoomId: "DR-501", senderRole: "Client", senderId: "C-8821", text: "Candidate resume looks strong.", timestamp: new Date(Date.now() - 3600000).toISOString() }
    ]
  };

  // --- PRIMARY API HUB (Highest Priority) ---

  // Administrative HQ Sync Proxy
  app.get("/api/admin/governance-data", (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [HQ SYNC HUB] Request from ${req.ip}`);
    try {
      return res.json({
        organizations: db.organizations || [],
        users: db.users || [],
        candidates: db.candidates || [],
        requirements: db.requirements || [],
        submissions: db.submissions || [],
        dealRooms: db.dealRooms || [],
        metrics: db.metrics || {},
        lastSync: timestamp
      });
    } catch (err) {
      console.error("[HQ SYNC HUB ERROR]", err);
      return res.status(500).json({ error: "Sync failed", details: String(err) });
    }
  });

  // Explicit health check
  app.get("/api/status", (req, res) => {
    res.json({ status: "online", node_env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
  });

  app.post("/api/parse-jd", async (req, res) => {
    try {
      const { jdText } = req.body;
      if (!jdText) return res.status(400).json({ error: "Missing jdText" });
      
      // Local Heuristic parsing
      const doc = nlp(jdText);
      const title = doc.nouns().toTitleCase().out('array')[0] || "Requirements Specialist";
      const skills = OSIntelligenceEngine['COMMON_SKILLS'].filter(s => jdText.toLowerCase().includes(s));
      const expMatch = jdText.match(/(\d+)\+?\s*(?:years?|yrs?)/i);

      let parsed = {
        title,
        description: jdText.slice(0, 150) + "...",
        skills,
        experience: expMatch ? expMatch[0] : "Not specified",
        suggestedBudget: 100, // Default heuristic
        criticalRequirements: skills.slice(0, 2)
      };

      if (ai) {
        try {
          const prompt = `Extract structured metadata from this Job Description: ${jdText}. Return JSON.`;
          const result = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: { responseMimeType: "application/json" }
          });
          const refined = JSON.parse(result.text || "{}");
          parsed = { ...parsed, ...refined };
        } catch (e) {
          console.warn("AI JD enhancement failed, using local result.");
        }
      }
      
      res.json(parsed);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Endpoint to extract text from PDF/Word
  app.post("/api/extract-text", upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      let text = "";
      const mimetype = req.file.mimetype;

      if (mimetype === "application/pdf") {
        const data = await pdf(req.file.buffer);
        text = data.text;
      } else if (
        mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        mimetype === "application/msword"
      ) {
        const result = await mammoth.extractRawText({ buffer: req.file.buffer });
        text = result.value;
      } else {
        text = req.file.buffer.toString('utf-8');
      }

      res.json({ text });
    } catch (err: any) {
      console.error("Extraction failed", err);
      res.status(500).json({ error: "Failed to extract text from file" });
    }
  });

  // Server-side detailed candidate analysis
  app.post("/api/match-candidates-detailed", async (req, res) => {
    const { jd, candidateProfile } = req.body;
    
    // Core Local Intelligence
    const localResult = OSIntelligenceEngine.calculateMatch(jd, candidateProfile);
    const doc = nlp(candidateProfile);
    const name = doc.people().out('array')[0] || "Candidate";
    const titleMatch = jd.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Developer|Engineer|Manager|Lead)/);
    const title = titleMatch ? titleMatch[0] : "Target Role";
    
    const outreach = OSIntelligenceEngine.generateOutreach(title, name, localResult.strengths);

    // If Gemini is available, we use it to "Refine" the summary and drafts
    if (ai) {
      try {
        const prompt = `Refine this matching assessment for clarity. Keep JSON format.
        JD: ${jd}
        Candidate: ${candidateProfile}
        Current Score: ${localResult.matchScore}`;
        
        const response = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: prompt,
          config: { 
            responseMimeType: "application/json",
            responseSchema: {
               type: Type.OBJECT,
               properties: {
                 refinedSummary: { type: Type.STRING },
                 premiumDrafts: { type: Type.OBJECT, properties: { professional: { type: Type.STRING } } }
               }
            }
          }
        });
        const refined = JSON.parse(response.text || "{}");
        if (refined.refinedSummary) localResult.summary = refined.refinedSummary;
      } catch (e) {
        console.warn("AI Refinement skipped", e);
      }
    }

    res.json({
      ...localResult,
      outreachDrafts: outreach
    });
  });

  // Server-side bulk resume parsing
  app.post("/api/bulk-parse-resumes", async (req, res) => {
    const { resumeTexts } = req.body;
    
    // Use local intelligence to parse instantly
    const profiles = (resumeTexts as string[]).map(text => OSIntelligenceEngine.extractProfile(text));
    
    // Optional AI enhancement for cleaner parsing if available
    if (ai && profiles.length > 0) {
       // We could do a batch refine here if we wanted, but local is robust enough for now
    }

    res.json(profiles);
  });

  // Trigger Registration Email simulating Resend / SendGrid
  app.post("/api/trigger-registration-email", (req, res) => {
    const { orgId, type, companyName, email } = req.body;
    
    const targetEmail = type === "vendor" ? "vendors@hirenestworkforce.com" : "clients@hirenestworkforce.com";
    
    console.log(`[RESEND SIMULATION] Sending email to: ${targetEmail}`);
    res.json({ success: true, message: "Email triggered" });
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use('/api', (req, res, next) => {
    // Middleware to ensure JSON for /api errors
    next();
  });

  app.get("/api/metrics", (req, res) => {
    const { type } = req.query;
    const baseMetrics = {
      revenue: 1450000,
      spending: 1200000,
      activeDeals: 42,
      placements: 18,
      avgMargin: 18,
      vendorQuality: 92,
      recruiterProductivity: 88,
    };

    if (type === 'vendor') {
      return res.json({
        ...baseMetrics,
        revenue: 85000, // Vendor earnings
        activeDeals: 5,
        placements: 3,
        vendorQuality: 95
      });
    }

    if (type === 'client') {
      return res.json({
        ...baseMetrics,
        spending: 450000,
        activeDeals: 12,
        placements: 4,
        vendorQuality: 88
      });
    }

    res.json(baseMetrics);
  });
  
  app.get("/api/jobs", (req, res) => res.json(db.requirements));
  
  app.get("/api/candidates", (req, res) => res.json(db.candidates));
  app.post("/api/candidates", async (req, res) => {
    const newCandData = req.body;
    let highestDuplicateScore = 0;
    let duplicateOf = null;
    let duplicateReason = "";

    // 1. Exact Match Checking
    for (const cand of db.candidates) {
      if (cand.email && newCandData.email && cand.email.toLowerCase() === newCandData.email.toLowerCase()) {
         highestDuplicateScore = 100;
         duplicateOf = cand.id;
         duplicateReason = "Exact email match";
         break;
      }
      if (cand.phone && newCandData.phone && cand.phone === newCandData.phone) {
         highestDuplicateScore = 100;
         duplicateOf = cand.id;
         duplicateReason = "Exact phone match";
         break;
      }
      if (cand.linkedin && newCandData.linkedin && cand.linkedin.toLowerCase() === newCandData.linkedin.toLowerCase()) {
         highestDuplicateScore = 100;
         duplicateOf = cand.id;
         duplicateReason = "Exact LinkedIn profile match";
         break;
      }
    }

    // 2. Local Semantic Match Checking
    if (highestDuplicateScore === 0 && newCandData.resumeText) {
      try {
        for (const cand of db.candidates) {
          if (cand.resumeText) {
            const match = OSIntelligenceEngine.calculateMatch(cand.resumeText, newCandData.resumeText);
            if (match.matchScore > 90) {
              highestDuplicateScore = match.matchScore;
              duplicateOf = cand.id;
              duplicateReason = "High resume similarity detected locally.";
              break;
            }
          }
        }
      } catch (err) {
        console.error("Local duplicate detection failed", err);
      }
    }

    const newCand = {
      id: "CAND-" + Math.floor(Math.random() * 10000),
      vendorId: req.body.vendorId || "V-2048",
      name: req.body.name,
      skills: req.body.skills || [],
      matchScore: Math.floor(Math.random() * 20) + 80,
      pipelineStage: highestDuplicateScore > 85 ? "Duplicate Review" : "Candidate Added",
      email: req.body.email,
      phone: req.body.phone,
      linkedin: req.body.linkedin,
      duplicateScore: highestDuplicateScore,
      duplicateOf,
      duplicateReason,
      ...req.body
    };
    db.candidates.push(newCand);
    res.json(newCand);
  });
  
  app.put("/api/candidates/:id", (req, res) => {
    const idx = db.candidates.findIndex(c => c.id === req.params.id);
    if (idx !== -1) {
      db.candidates[idx] = { ...db.candidates[idx], ...req.body };
      res.json(db.candidates[idx]);
    } else {
      res.status(404).json({ error: "Candidate not found" });
    }
  });

  app.get("/api/dealrooms", (req, res) => res.json(db.dealRooms));
  app.get("/api/dealrooms/:id/messages", (req, res) => {
    res.json(db.messages.filter(m => m.dealRoomId === req.params.id));
  });
  app.post("/api/dealrooms/:id/messages", (req, res) => {
    const newMessage = {
      id: "M-" + Math.floor(Math.random() * 10000),
      dealRoomId: req.params.id,
      ...req.body, // can contain type: 'text' | 'document' and fileUrl
      timestamp: new Date().toISOString()
    };
    db.messages.push(newMessage);
    res.json(newMessage);
  });
  
  app.post("/api/dealrooms/:id/reveal", (req, res) => {
    const room = db.dealRooms.find(r => r.id === req.params.id);
    if(room) {
      room.identitiesRevealed = true;
      const revealMsg = {
        id: "M-" + Math.floor(Math.random() * 10000),
        dealRoomId: room.id,
        senderRole: "System Admin",
        senderId: "Admin",
        text: "🚨 NDA Approved. Identities have been revealed. Client is Google HQ (C-8821), Vendor is ABC Staffing (V-2048).",
        type: "system",
        timestamp: new Date().toISOString()
      };
      db.messages.push(revealMsg);
      res.json(room);
    } else {
      res.status(404).json({error: "Room not found"});
    }
  });



  app.post("/api/match-candidates", async (req, res) => {
     try {
       const { requirement, candidates } = req.body;
       const jd = (requirement.description || "") + " " + (requirement.skills || []).join(" ");
       const results = (candidates as any[]).map(cand => {
         const profileText = (cand.name || "") + " " + (cand.skills || []).join(" ") + " " + (cand.resumeText || "");
         const match = OSIntelligenceEngine.calculateMatch(jd, profileText);
         return {
           candidateId: cand.id,
           matchScore: match.matchScore,
           matchReason: match.summary
         };
       });
       res.json(results);
     } catch (err: any) {
       res.status(500).json({ error: err.message });
     }
  });

  // Catch-all for missing API routes to prevent HTML 404
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route ${req.method} ${req.path} not found` });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Fallback for dev if Vite somehow misses it (rare but adds robustness)
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api')) return next();
      try {
        const template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // SPA Fallback: All routes that don't match static files or API are sent to index.html
    app.get("*", (req, res) => {
      // Ensure we don't accidentally serve index.html for missing images or other assets
      if (req.path.includes('.') && !req.path.endsWith('.html')) {
        return res.status(404).send("File not found");
      }
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        // Fallback for case where build hasn't run or index.html is missing
        res.status(404).send("Application shell not found. Build may be incomplete.");
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
