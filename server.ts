import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { WorkforceBootstrapEngine } from "./src/api-lib/services/WorkforceBootstrapEngine.ts";
import { EventBus } from "./src/api-lib/services/EventBus.ts";
import { db, collection, getDocs, doc, setDoc, updateDoc } from "./src/lib/firebase.ts";
import { capabilityBrokerRouting } from "./src/api-lib/services/AIGateway.ts";
import { Candidate, Requirement, CandidateMatch } from "./src/types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize the engine and recalculate initial metrics
  const bootstrapEngine = WorkforceBootstrapEngine.getInstance();
  await bootstrapEngine.recalculateMetrics();

  // Setup EventBus listener for live-matching continuous mode
  EventBus.getInstance().subscribe(async (event) => {
    console.log(`[Server Event Listener] Received event: ${event.type}`);
    const traceId = `tr_live_${Date.now()}`;
    if (event.type === "REQUIREMENT_CREATED") {
      const req = event.payload as Requirement;
      console.log(`[Server] Live Mode: Processing newly created requirement: ${req.title}`);
      
      const candSnap = await getDocs(collection(db, "candidates"));
      for (const candDoc of candSnap.docs) {
        const cand = candDoc.data() as Candidate;
        const result = await capabilityBrokerRouting(cand, req, traceId);

        if (result.matchScore >= 50) {
          const matchId = `${req.id}_${cand.id}`;
          const match: CandidateMatch = {
            id: matchId,
            candidateId: cand.id,
            candidateName: cand.name,
            requirementId: req.id,
            requirementTitle: req.title,
            matchScore: result.matchScore,
            matchInference: result.matchInference,
            status: "matched",
            createdAt: new Date().toISOString(),
            confidence: result.confidence,
            reason: result.reason,
            matchedBy: result.matchedBy,
            reviewed: result.reviewed,
          };
          await setDoc(doc(db, "candidate_matches", matchId), match);
          console.log(`[Server] Created live candidate_match: ${matchId} with score ${result.matchScore}%`);
        }
      }
      await bootstrapEngine.recalculateMetrics();
    } else if (event.type === "CANDIDATE_CREATED") {
      const cand = event.payload as Candidate;
      console.log(`[Server] Live Mode: Processing newly uploaded candidate: ${cand.name}`);
      
      const reqsSnap = await getDocs(collection(db, "requirements"));
      for (const reqDoc of reqsSnap.docs) {
        const req = reqDoc.data() as Requirement;
        const result = await capabilityBrokerRouting(cand, req, traceId);

        if (result.matchScore >= 50) {
          const matchId = `${req.id}_${cand.id}`;
          const match: CandidateMatch = {
            id: matchId,
            candidateId: cand.id,
            candidateName: cand.name,
            requirementId: req.id,
            requirementTitle: req.title,
            matchScore: result.matchScore,
            matchInference: result.matchInference,
            status: "matched",
            createdAt: new Date().toISOString(),
            confidence: result.confidence,
            reason: result.reason,
            matchedBy: result.matchedBy,
            reviewed: result.reviewed,
          };
          await setDoc(doc(db, "candidate_matches", matchId), match);
          console.log(`[Server] Created live candidate_match: ${matchId} with score ${result.matchScore}%`);
        }
      }
      await bootstrapEngine.recalculateMetrics();
    }
  });

  // API - Get metrics
  app.get("/api/metrics", (req, res) => {
    res.json(bootstrapEngine.getMetrics());
  });

  // API - Get bootstrap stages
  app.get("/api/stages", (req, res) => {
    res.json(bootstrapEngine.getStages());
  });

  // API - Get terminal logs
  app.get("/api/logs", (req, res) => {
    res.json(bootstrapEngine.getLogs());
  });

  // API - Trigger Full Bootstrap
  app.post("/api/bootstrap/run", async (req, res) => {
    const { force } = req.body;
    // Execute asynchronously to prevent HTTP timeout
    bootstrapEngine.runFullBootstrap(!!force).catch(err => {
      console.error("Async bootstrap failed:", err);
    });
    res.json({ message: "Bootstrap process initialized." });
  });

  // API - Trigger Targeted Repair / Operation
  app.post("/api/bootstrap/operation", async (req, res) => {
    const { operation } = req.body;
    bootstrapEngine.executeSingleOperation(operation).catch(err => {
      console.error("Async targeted operation failed:", err);
    });
    res.json({ message: `Targeted operation '${operation}' initialized.` });
  });

  // API - Fetch requirements list
  app.get("/api/requirements", async (req, res, next) => {
    try {
      const snap = await getDocs(collection(db, "requirements"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // API - Fetch candidates list
  app.get("/api/candidates", async (req, res, next) => {
    try {
      const snap = await getDocs(collection(db, "candidates"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // API - Fetch candidate matches list
  app.get("/api/matches", async (req, res, next) => {
    try {
      const snap = await getDocs(collection(db, "candidate_matches"));
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      res.json(data);
    } catch (err) {
      next(err);
    }
  });

  // API - Toggle Match Review State
  app.post("/api/matches/review", async (req, res, next) => {
    try {
      const { matchId, reviewed } = req.body;
      await updateDoc(doc(db, "candidate_matches", matchId), {
        reviewed: !!reviewed,
        reviewedAt: new Date().toISOString()
      });
      res.json({ success: true, matchId, reviewed });
    } catch (err) {
      next(err);
    }
  });

  // API - Add Requirement (Continuous matching trigger)
  app.post("/api/requirements", async (req, res, next) => {
    try {
      const { title, clientName, description, skillsRequired } = req.body;
      const id = `req_${Date.now()}`;
      const newReq: Requirement = {
        id,
        title,
        clientName,
        description,
        skillsRequired: Array.isArray(skillsRequired) ? skillsRequired : [],
        status: "active",
        processingVersion: 0, // Legacy until reconciled/matched
      };

      await setDoc(doc(db, "requirements", id), newReq);

      // Publish event to trigger real-time Continuous Mode matching
      EventBus.getInstance().publish({
        eventId: `evt_${id}`,
        type: "REQUIREMENT_CREATED",
        createdAt: new Date().toISOString(),
        payload: newReq,
      });

      res.status(201).json(newReq);
    } catch (err) {
      next(err);
    }
  });

  // API - Add Candidate (Continuous matching trigger)
  app.post("/api/candidates", async (req, res, next) => {
    try {
      const { name, email, phone, skills, experience } = req.body;
      const id = `cand_${Date.now()}`;
      const newCand: Candidate = {
        id,
        name,
        email,
        phone,
        skills: Array.isArray(skills) ? skills : [],
        experience,
        status: "available",
        processingVersion: 0, // Legacy until reconciled/matched
      };

      await setDoc(doc(db, "candidates", id), newCand);

      // Publish event to trigger real-time Continuous Mode matching
      EventBus.getInstance().publish({
        eventId: `evt_${id}`,
        type: "CANDIDATE_CREATED",
        createdAt: new Date().toISOString(),
        payload: newCand,
      });

      res.status(201).json(newCand);
    } catch (err) {
      next(err);
    }
  });

  // Vite integration middleware
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
    console.log(`[HireNestOS] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
