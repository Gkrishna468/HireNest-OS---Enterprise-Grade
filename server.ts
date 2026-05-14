import express, { Request } from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from 'url';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let pdf: any;
try {
  const pdfParse = require('pdf-parse');
  // pdf-parse is a CommonJS module that exports the function directly
  pdf = typeof pdfParse === 'function' ? pdfParse : (pdfParse.default || pdfParse);
  console.log("PDF-Parse loaded successfully via require");
} catch (e) {
  console.error("Critical: Failed to load pdf-parse via require", e);
  // Fallback to dynamic import if require fails in some environments
  import('pdf-parse').then((module: any) => {
    pdf = module.default || module;
    console.log("PDF-Parse loaded via dynamic import fallback");
  }).catch(finalErr => {
    console.error("Failed both require and dynamic import for pdf-parse", finalErr);
  });
}
import mammoth from 'mammoth';
import nlp from 'compromise';
import natural from 'natural';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Matching Intelligence V2 ---
const MATCH_SYSTEM_PROMPT = `As a Senior Executive Recruiter with 20 years of experience in Pan-India and US IT Staffing, your goal is to provide a brutal, precise, and strategic assessment of a candidate.

Return your assessment in the following JSON format:
{
  "score": number (0-100),
  "breakdown": {
    "skillsScore": number,
    "experienceScore": number,
    "domainScore": number,
    "locationScore": number,
    "bonusScore": number
  },
  "summary": "Brief 1-sentence summary",
  "strengths": ["string"],
  "gaps": ["string"],
  "recruiterAssessment": "Detailed reasoning paragraph",
  "recommendation": "STRONG_FIT" | "CONSIDER" | "NOT_SUITABLE",
  "nextSteps": "Concrete recruiter action item"
}`;

// --- Margin Governance Engine ---
class MarginEngine {
  static calculate(clientBudget: number, config: any, vendorScore: number = 90): any {
    let vendorPayout = 0;
    let platformProfit = 0;

    if (config.type === 'PERCENTAGE') {
      platformProfit = clientBudget * (config.value / 100);
      vendorPayout = clientBudget - platformProfit;
    } else if (config.type === 'FIXED') {
      platformProfit = config.value;
      vendorPayout = clientBudget - platformProfit;
    } else if (config.type === 'TIERED') {
      // Logic: Higher vendor score = Lower platform margin (Vendor loyalty bonus)
      const marginPercent = vendorScore > 90 ? 10 : (vendorScore > 70 ? 15 : 20);
      platformProfit = clientBudget * (marginPercent / 100);
      vendorPayout = clientBudget - platformProfit;
    } else {
      // Dynamic AI Placeholder
      platformProfit = clientBudget * 0.18;
      vendorPayout = clientBudget - platformProfit;
    }

    return {
      clientBudget,
      adminMargin: Math.round(platformProfit),
      vendorPayout: Math.round(vendorPayout),
      platformProfit: Math.round(platformProfit),
      marginConfig: config
    };
  }

  static sanitizeForVendor(requirement: any) {
    const { clientBudget, adminMargin, platformProfit, ...sanitized } = requirement;
    return {
      ...sanitized,
      rate: requirement.vendorPayout ? `$${requirement.vendorPayout}/hr` : requirement.rate
    };
  }
}

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
      if (!skill || typeof skill !== 'string') return false;
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

  static calculateMatchV2(jd: string, profileText: string) {
    const jdLower = jd.toLowerCase();
    const profileLower = profileText.toLowerCase();
    
    const jdSkills = this.COMMON_SKILLS.filter(s => jdLower.includes(s.toLowerCase()));
    const matchedSkills = jdSkills.filter(s => profileLower.includes(s.toLowerCase()));
    const missingSkills = jdSkills.filter(s => !profileLower.includes(s.toLowerCase()));
    
    const skillsScore = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 0;
    
    const expMatch = profileText.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    const expValue = expMatch ? parseInt(expMatch[1]) : 0;
    const jdExpMatch = jd.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    const jdExpValue = jdExpMatch ? parseInt(jdExpMatch[1]) : 0;
    
    const experienceScore = expValue >= jdExpValue ? 100 : (expValue / Math.max(1, jdExpValue)) * 100;
    const locationScore = 80; // Heuristic
    const totalScore = Math.round((skillsScore * 0.5) + (experienceScore * 0.3) + (locationScore * 0.2));
    
    return {
      score: totalScore,
      breakdown: {
        skillsScore: Math.round(skillsScore),
        experienceScore: Math.round(experienceScore),
        domainScore: 70,
        locationScore,
        bonusScore: 0,
        totalScore
      },
      summary: `Candidate matches ${matchedSkills.length} core technical requirements.`,
      strengths: matchedSkills.slice(0, 5),
      gaps: missingSkills.slice(0, 3).map(s => `Missing ${s}`),
      recruiterAssessment: `Based on technical overlap, the candidate shows ${totalScore}% alignment. Key strengths in ${matchedSkills.slice(0,3).join(', ')}.`,
      recommendation: totalScore >= 80 ? "STRONG_FIT" : totalScore >= 60 ? "CONSIDER" : "NOT_SUITABLE",
      nextSteps: totalScore >= 80 ? "Schedule technical screening" : "Review secondary profile"
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

// --- Global Mock Database (Module Level for Persistence) ---
const dbMock: any = {
  metrics: {
    revenue: 1450000,
    activeDeals: 42,
    placements: 18,
    margin: "18%",
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
    },
    {
      id: "REQ-005", clientId: "C-8821", title: "LPM Project Manager", skills: ["Agile", "LPM", "Jira"],
      status: "DRAFT", clientTargetBudget: 180, createdAt: new Date().toISOString(),
      description: "Manage large scale LPM transition projects. High budget flexibility."
    },
    {
      id: "REQ-006", clientId: "C-8821", title: "Data Scientist (Full Time)", skills: ["ML", "PyTorch"],
      status: "PENDING_FINANCIAL_APPROVAL", clientTargetBudget: 150, createdAt: new Date().toISOString(),
      description: "Join our R&D wing to build advanced ML models for crop prediction."
    }
  ],
  candidatePool: [
    { id: "CAND-001", vendorId: "V-VENDOR-001", name: "John Smith", skills: ["Go", "Kubernetes"], matchScore: 95, pipelineStage: "Interviewing", email: "jsmith@example.com", createdAt: new Date().toISOString() },
    { id: "CAND-002", vendorId: "V-2048", name: "Sarah Connor", skills: ["React", "Node.js"], matchScore: 92, pipelineStage: "Screening", email: "sconnor@example.com", createdAt: new Date().toISOString() }
  ],
  submissions: [
      { id: "SUB-001", requirementId: "REQ-001", candidateId: "CAND-001", status: "submitted", vendorId: "V-VENDOR-001" }
  ],
  dealRooms: [
    { id: "DR-501", requirementId: "REQ-001", clientId: "C-8821", vendorId: "V-2048", candidateId: "CAND-001", candidateName: "John Smith", status: "Active", identitiesRevealed: false },
  ],
  messages: [
    { id: "M-001", dealRoomId: "DR-501", senderRole: "Client", senderId: "C-8821", text: "Candidate resume looks strong.", timestamp: new Date(Date.now() - 3600000).toISOString() }
  ]
};

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

  app.get("/api/user/context", (req, res) => {
    const { orgId, role } = req.query;
    if (!orgId) return res.status(400).json({ error: "orgId required" });

    try {
      const isAdmin = role === 'admin' || orgId === 'ORG-GLOBAL-HQ';
      const isVendor = role === 'vendor';
      
      let requirements = (dbMock.requirements_public || []).filter((r: any) => 
        isAdmin || r.clientId === orgId || r.visibility === 'VENDOR_NETWORK'
      );

      if (isVendor) {
        requirements = requirements.map(MarginEngine.sanitizeForVendor);
      }

      const dealRooms = (dbMock.dealRooms || []).filter((dr: any) => 
        isAdmin || dr.clientId === orgId || dr.vendorId === orgId
      );

      const submissions = (dbMock.submissions || []).filter((s: any) => 
        isAdmin || s.clientId === orgId || s.vendorId === orgId
      );

      res.json({
        requirements,
        dealRooms,
        submissions,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch user context" });
    }
  });

  // --- CORE CONSOLIDATED API HUB (Highest Priority) ---
  app.get("/api/admin/governance-data", (req, res) => {
    try {
      const timestamp = new Date().toISOString();
      
      // Deep clone clones with JSON to avoid any reference or circularity issues
      const dataToSync = JSON.parse(JSON.stringify({
        organizations: dbMock.organizations || [],
        requirements_public: dbMock.requirements_public || [],
        candidatePool: dbMock.candidatePool || [],
        submissions: dbMock.submissions || [],
        dealRooms: dbMock.dealRooms || [],
        metrics: dbMock.metrics || {},
        lastSync: timestamp
      }));
      
      return res.status(200).json(dataToSync);
    } catch (err: any) {
      console.error("[HQ SYNC HUB ERROR]", err.message);
      return res.status(200).json({ 
        organizations: [], 
        requirements_public: [], 
        candidatePool: [], 
        submissions: [], 
        dealRooms: [],
        error: "System sync deferred due to internal processing error." 
      });
    }
  });

  app.get("/api/test-connection", (req, res) => {
    res.json({ ok: true, env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
  });

  // Health check
  app.get("/api/status", (req, res) => {
    res.json({ status: "online", node_env: process.env.NODE_ENV, timestamp: new Date().toISOString() });
  });

  // Job Description Intelligence
  app.post("/api/parse-jd", async (req, res) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [JD-PARSE] Received parsing request`);
    try {
      const { jdText } = req.body;
      if (!jdText || typeof jdText !== 'string' || jdText.length < 5) {
        return res.status(200).json({ 
          title: "New Requirement Intake",
          description: "Details required for extraction.",
          skills: [],
          status: "DRAFT"
        });
      }
      
      const safeText = jdText.slice(0, 15000); 
      
      // Local Heuristic parsing
      let title = "Recruitment Strategy";
      let skills: string[] = [];
      
      try {
        const doc = nlp(safeText);
        const nouns = doc.nouns().toTitleCase().out('array');
        if (nouns && nouns.length > 0) {
            const genericTerms = ['Job', 'Requirement', 'Description', 'Position', 'Role', 'Hiring', 'Company'];
            const filtered = nouns.filter(n => !genericTerms.includes(n) && n.length > 2);
            title = filtered.length > 0 ? filtered[0] : nouns[0];
        }
        skills = OSIntelligenceEngine.COMMON_SKILLS.filter(s => safeText.toLowerCase().includes(s.toLowerCase()));
      } catch (nlpErr) {
        console.warn("[JD-PARSE] NLP fallback", nlpErr);
      }
      
      const expMatch = safeText.match(/(\d+)\+?\s*(?:years?|yrs?)/i);

      let parsed: any = {
        title: title.slice(0, 70),
        description: safeText.slice(0, 600) + (safeText.length > 600 ? "..." : ""),
        skills: Array.from(new Set(skills)).slice(0, 12),
        experience: expMatch ? expMatch[0] : "Not specified",
        suggestedBudget: 0
      };

      if (ai) {
        try {
          const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
          const prompt = `Act as an expert technical recruiter. Based on this JD, identify: 1. Title, 2. Top 8 Skills (array), 3. Min Experience (number). Return JSON only. JD: ${safeText.slice(0, 4000)}`;
          const result = await model.generateContent(prompt);
          const text = await result.response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const aiData = JSON.parse(jsonMatch[0]);
            parsed = { ...parsed, ...aiData };
          }
        } catch (aiErr) {
          console.warn("[JD-PARSE] AI extraction bypassed.", aiErr);
        }
      }
      
      return res.status(200).json(parsed);
    } catch (err: any) {
      console.error("[JD-PARSE] CRITICAL FAILURE:", err);
      return res.status(200).json({ 
        title: "Requirement Processing Initiated", 
        skills: [], 
        description: "Advanced extraction syncing. Manual entry enabled.",
        error: "Engine deferred." 
      });
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
        if (typeof pdf !== 'function') {
          console.error("PDF Parser initialization details:", { 
            pdfType: typeof pdf,
            hasDefault: pdf && typeof (pdf as any).default === 'function'
          });
          throw new TypeError("PDF parser is not correctly initialized - please check server logs");
        }
        try {
           console.log("Attempting PDF extraction for buffer size:", req.file.buffer.length);
           const data = await pdf(req.file.buffer);
           text = data.text;
        } catch (extractErr: any) {
           console.error("Internal PDF-Parse crash:", extractErr);
           throw new Error(`PDF Parser error: ${extractErr.message}`);
        }
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
    try {
      const { jd, candidateProfile } = req.body;
      if (!jd || !candidateProfile) return res.status(400).json({ error: "Missing inputs" });

      console.log("[MATCH-ENGINE V2] Initiating high-density match protocol...");

      let matchResult: any = OSIntelligenceEngine.calculateMatchV2(jd, candidateProfile);

      if (ai) {
        try {
          const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
          const runtimePrompt = `
            ${MATCH_SYSTEM_PROMPT}

            Job Description:
            ${jd}

            Candidate Resume:
            ${candidateProfile}

            Compare the JD and Resume. Identify exactly which mandatory skills are missing. 
            Score the candidate based on India/US market standards (0-100%).
            Exclude 'budget' factor from matching score.
          `;
          const result = await model.generateContent(runtimePrompt);
          const text = result.response.text();
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
             const aiMatch = JSON.parse(jsonMatch[0]);
             matchResult = { ...matchResult, ...aiMatch };
          }
        } catch (aiErr) {
          console.warn("Match AI failed, using fallback", aiErr);
        }
      }

      const doc = nlp(candidateProfile);
      const name = doc.people().out('array')[0] || "Candidate";
      const titleMatch = jd.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:Developer|Engineer|Manager|Lead)/);
      const title = titleMatch ? titleMatch[0] : "Target Role";
      
      const outreach = OSIntelligenceEngine.generateOutreach(title, name, matchResult.strengths || []);

      res.json({
        ...matchResult,
        outreachDrafts: outreach
      });
    } catch (err) {
      console.error("[MATCH-V2 ERROR]", err);
      res.status(500).json({ error: "Match engine failure" });
    }
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
    try {
      const { type } = req.query;
      console.log(`[METRICS] Request for type: ${type}`);
      
      const m = dbMock.metrics || {
         revenue: 1250000,
         spending: 980000,
         activeDeals: 12,
         placements: 8,
         avgMargin: 15,
         vendorQuality: 92,
         recruiterProductivity: 88,
         activeRequirements: 14,
         revenueRetention: 98
      };
      
      // Contextual scaling
      const baseMetrics = { ...m };
      if (type === 'client') {
          baseMetrics.revenue = m.spending; // For client, focus on their spend
      } else if (type === 'vendor') {
          baseMetrics.revenue = m.revenue * 0.7; // Approx potential
      }
      
      return res.status(200).json(baseMetrics);
    } catch (err) {
      console.error("[METRICS ERROR]", err);
      // Absolute fallback to prevent dashboard crashing
      return res.status(200).json({
        revenue: 0, 
        spending: 0, 
        activeDeals: 0, 
        placements: 0,
        avgMargin: 15, 
        vendorQuality: 90, 
        recruiterProductivity: 85,
        error: "Metrics synchronization deferred."
      });
    }
  });
  
  app.get("/api/jobs", (req, res) => res.json(dbMock.requirements_public || []));
  
  app.get("/api/candidates", (req, res) => res.json(dbMock.candidatePool || []));
  app.post("/api/candidates", async (req, res) => {
    const newCandData = req.body;
    let highestDuplicateScore = 0;
    let duplicateOf = null;
    let duplicateReason = "";

    // 1. Exact Match Checking
    const candidatesToSearch = dbMock.candidatePool || [];
    for (const cand of candidatesToSearch) {
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
        for (const cand of candidatesToSearch) {
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
    if (!dbMock.candidatePool) dbMock.candidatePool = [];
    dbMock.candidatePool.push(newCand);
    res.json(newCand);
  });
  
  app.put("/api/candidates/:id", (req, res) => {
    const list = dbMock.candidatePool || [];
    const idx = list.findIndex((c: any) => c.id === req.params.id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...req.body };
      res.json(list[idx]);
    } else {
      res.status(404).json({ error: "Candidate not found" });
    }
  });

  app.get("/api/dealrooms", (req, res) => res.json(dbMock.dealRooms || []));
  app.get("/api/dealrooms/:id/messages", (req, res) => {
    res.json((dbMock.messages || []).filter((m: any) => m.dealRoomId === req.params.id));
  });
  app.post("/api/dealrooms/:id/messages", (req, res) => {
    const newMessage = {
      id: "M-" + Math.floor(Math.random() * 10000),
      dealRoomId: req.params.id,
      ...req.body, // can contain type: 'text' | 'document' and fileUrl
      timestamp: new Date().toISOString()
    };
    if (!dbMock.messages) dbMock.messages = [];
    dbMock.messages.push(newMessage);
    res.json(newMessage);
  });
  
  app.post("/api/dealrooms/:id/reveal", (req, res) => {
    const room = (dbMock.dealRooms || []).find((r: any) => r.id === req.params.id);
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
      if (!dbMock.messages) dbMock.messages = [];
      dbMock.messages.push(revealMsg);
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

  // --- VITE / STATIC / SPA FALLBACK ---
  
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
    
    app.get("*", async (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
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
      if (req.path.startsWith('/api')) return res.status(404).json({ error: "API route not found" });
      if (req.path.includes('.') && !req.path.endsWith('.html')) return res.status(404).send("File not found");
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) res.status(500).send("Application load error");
      });
    });
  }

  // Only start listening if NOT in a serverless environment
  // --- GLOBAL ERROR HANDLER ---
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("[FATAL ERROR]", err);
    if (res.headersSent) return next(err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message,
      path: req.path
    });
  });

  if (process.env.NODE_ENV !== "production" || !process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }

  return app;
}

const expressAppPromise = startServer();
export default expressAppPromise;
