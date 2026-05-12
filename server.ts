import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize AI if key is present
let ai: any = null; // Use any to bypass strict type check if SDK is inconsistent 
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API Routes ---
  
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

  // Mock Database
  const db: any = {
    metrics: {
      revenue: 1450000,
      activeDeals: 42,
      placements: 18,
      margin: "18%",
      vendorQuality: 92,
      recruiterProductivity: 88,
    },
    jobs: [
      { id: "REQ-001", clientId: "C-8821", title: "Senior React Developer", skills: ["React", "TypeScript", "Node.js"], status: "Active", rate: "$80/hr", submissions: 5 },
      { id: "REQ-002", clientId: "C-9012", title: "Data Engineer", skills: ["Python", "SQL", "Snowflake"], status: "Active", rate: "$95/hr", submissions: 2 },
      { id: "REQ-003", clientId: "C-8821", title: "Cloud Architect", skills: ["AWS", "Terraform", "Kubernetes"], status: "Draft", rate: "$120/hr", submissions: 0 }
    ],
    candidates: [
      { id: "CAND-101", vendorId: "V-2048", name: "Alex Johnson", skills: ["React", "TypeScript", "Next.js"], matchScore: 94, pipelineStage: "AI Screening", email: "alex.j@example.com", phone: "+1 555-0101", linkedin: "linkedin.com/in/alexj" },
      { id: "CAND-102", vendorId: "V-2048", name: "Maria Garcia", skills: ["React", "Node.js", "Express"], matchScore: 88, pipelineStage: "Client Submission", email: "m.garcia@example.com", phone: "+1 555-0102", linkedin: "linkedin.com/in/mgarcia" },
      { id: "CAND-103", vendorId: "V-998", name: "David Chen", skills: ["Python", "SQL", "Spark"], matchScore: 92, pipelineStage: "Interview Scheduled", email: "david.c@example.com", phone: "+1 555-0103", linkedin: "linkedin.com/in/davidc" },
      { id: "CAND-104", vendorId: "V-1502", name: "Sarah Williams", skills: ["AWS", "Docker", "Linux"], matchScore: 85, pipelineStage: "Candidate Added", email: "swilliams@example.com", phone: "+1 555-0104", linkedin: "linkedin.com/in/swilliams" },
    ],
    dealRooms: [
      { id: "DR-501", requirementId: "REQ-001", client: "C-8821", vendor: "V-2048", candidate: "CAND-101", status: "Active", identitiesRevealed: false },
    ],
    messages: [
      { id: "M-001", dealRoomId: "DR-501", senderRole: "Client", senderId: "C-8821", text: "Candidate resume looks strong. Can we schedule an interview next week?", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { id: "M-002", dealRoomId: "DR-501", senderRole: "Vendor", senderId: "V-2048", text: "Absolutely. I will check their availability for Tuesday or Wednesday.", timestamp: new Date(Date.now() - 3000000).toISOString() },
      { id: "M-003", dealRoomId: "DR-501", senderRole: "AI Copilot", senderId: "AI", text: "I have analyzed Candidate CAND-101's calendar integration. They are open Tue 10am-1pm EST.", timestamp: new Date(Date.now() - 2900000).toISOString() }
    ]
  };

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
  
  app.get("/api/jobs", (req, res) => res.json(db.jobs));
  
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

    // 2. AI Semantic/Fuzzy Match Checking
    if (highestDuplicateScore === 0 && ai && newCandData.resumeText) {
      try {
        const existingData = db.candidates.map(c => ({ id: c.id, name: c.name, email: c.email, skills: c.skills }));
        const prompt = `You are a Duplicate Prevention Engine for an Applicant Tracking System.
Compare the incoming candidate against the existing database. Look for semantic similarity in their profile (skills, names, etc.) that might indicate they are the same person despite different emails/phones.

Incoming Candidate: ${JSON.stringify({ name: newCandData.name, email: newCandData.email, skills: newCandData.skills, resumeText: newCandData.resumeText })}
Existing Candidates: ${JSON.stringify(existingData)}

Return a JSON document (without markdown) matching this schema:
{ "duplicateScore": number (0-100, where > 85 is likely duplicate), "duplicateOf": "Candidate ID" or null, "reason": "brief explanation" }`;

        const response = await ai.models.generateContent({
           model: 'gemini-3-flash-preview',
           contents: prompt
        });
        
        const content = response.text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.duplicateScore > highestDuplicateScore && parsed.duplicateScore > 75) {
                highestDuplicateScore = parsed.duplicateScore;
                duplicateOf = parsed.duplicateOf;
                duplicateReason = parsed.reason;
            }
        }
      } catch (err) {
        console.error("AI Duplicate detection failed", err);
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

  app.post("/api/parse-jd", async (req, res) => {
    try {
      const { jdText } = req.body;
      if (!ai) {
        return res.status(500).json({ error: "Gemini API config missing" });
      }

      const prompt = `You are the Intelligence Layer for HireNestOS, an enterprise Staffing ERP.
Extract structured metadata from the following Job Description.

JD Text:
${jdText}

Return only a valid JSON object matching this schema:
{
  "title": "Professional Job Title",
  "description": "2-3 sentence summary",
  "skills": ["Skill 1", "Skill 2", ...],
  "experience": "e.g. 5+ years",
  "suggestedBudget": number (estimated monthly or hourly rate based on title if identifiable, otherwise null),
  "criticalRequirements": ["Req 1", "Req 2"]
}
Do not include any other text or markdown.`;

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });
      
      const content = result.text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
      
      res.json(parsed);

    } catch (err: any) {
      console.error("AI Parsing failed", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/match-candidates", async (req, res) => {
     try {
       const { requirement, candidates } = req.body;
       if (!ai) return res.status(500).json({ error: "Gemini API missing" });
       
       const prompt = `Match the following job requirement against these candidate profiles.
Job: ${JSON.stringify(requirement)}
Candidates: ${JSON.stringify(candidates)}

For each candidate, provide a matchScore (0-100) and a brief matchReason.
Return as JSON array: [{ "candidateId": "...", "matchScore": 85, "matchReason": "..." }]`;

       const result = await ai.models.generateContent({
         model: "gemini-2.0-flash",
         contents: [{ role: "user", parts: [{ text: prompt }] }]
       });

       const content = result.text;
       const jsonMatch = content.match(/\[[\s\S]*\]/);
       const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
       
       res.json(parsed);
     } catch (err: any) {
       res.status(500).json({ error: err.message });
     }
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
