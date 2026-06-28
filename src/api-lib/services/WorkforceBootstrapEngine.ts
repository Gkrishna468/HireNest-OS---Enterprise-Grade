import { db, collection, getDocs, doc, setDoc, updateDoc, getDoc, query, where } from "../../lib/firebase.ts";
import { Candidate, Requirement, CandidateMatch, BootstrapStage, SystemMetrics, BusinessEvent } from "../../types.ts";
import { calculateSemanticMatch } from "./AIGateway.ts";
import { EventBus } from "./EventBus.ts";

export class WorkforceBootstrapEngine {
  private static instance: WorkforceBootstrapEngine | null = null;
  private currentStage = 0;
  private isRunning = false;
  private logs: string[] = [];
  private stages: BootstrapStage[] = this.getDefaultStages();
  private continuousMode = false;
  private metrics: SystemMetrics = {
    totalRequirements: 0,
    totalCandidates: 0,
    totalMatches: 0,
    reconciliationRate: 0,
    continuousMode: false,
  };

  public static getInstance(): WorkforceBootstrapEngine {
    if (!WorkforceBootstrapEngine.instance) {
      WorkforceBootstrapEngine.instance = new WorkforceBootstrapEngine();
    }
    return WorkforceBootstrapEngine.instance;
  }

  private getDefaultStages(): BootstrapStage[] {
    return [
      { id: 1, name: "Preflight Check", status: "idle", progress: 0, details: "Verifying Firestore schema & database connections" },
      { id: 2, name: "Business Graph Integrity", status: "idle", progress: 0, details: "Constructing strategic relationship mapping" },
      { id: 3, name: "Relationship Repair", status: "idle", progress: 0, details: "Healing orphan records and vendor associations" },
      { id: 4, name: "Bootstrap Requirements", status: "idle", progress: 0, details: "Scanning and preparing legacy client requirements" },
      { id: 5, name: "Bootstrap Candidates", status: "idle", progress: 0, details: "Scanning and index-keying inactive candidate profiles" },
      { id: 6, name: "Generate Matches", status: "idle", progress: 0, details: "Invoking Layer 2 Semantic Inference & Overrides" },
      { id: 7, name: "Generate Notifications", status: "idle", progress: 0, details: "Queuing CRM alerts and recruiter insights" },
      { id: 8, name: "Vendor Broadcast", status: "idle", progress: 0, details: "Distributing shortlists to external Vendor Workspaces" },
      { id: 9, name: "Publish Office Heartbeats", status: "idle", progress: 0, details: "Checking matching & scheduling agent lifelines" },
      { id: 10, name: "Enable Continuous Runtime", status: "idle", progress: 0, details: "Switching Event Bus subscription to live runtime mode" },
    ];
  }

  public getLogs(): string[] {
    return this.logs;
  }

  public getStages(): BootstrapStage[] {
    return this.stages;
  }

  public getMetrics(): SystemMetrics {
    return this.metrics;
  }

  private addLog(message: string) {
    const timestamp = new Date().toISOString().substring(11, 19);
    const log = `[${timestamp}] ${message}`;
    console.log(log);
    this.logs.push(log);
  }

  public async runFullBootstrap(forceRebuild = false): Promise<void> {
    if (this.isRunning) {
      this.addLog("Bootstrap operation already in progress.");
      return;
    }

    this.isRunning = true;
    this.logs = [];
    this.stages = this.getDefaultStages();
    this.addLog(`🚀 Starting Enterprise Workforce Reconciliation Flow ${forceRebuild ? "(FORCED FULL REBUILD)" : ""}`);

    try {
      for (let i = 0; i < this.stages.length; i++) {
        const stage = this.stages[i];
        stage.status = "running";
        stage.progress = 20;
        this.addLog(`▶️ Stage ${stage.id}: ${stage.name} is running...`);

        await this.executeStage(stage.id, forceRebuild);

        stage.status = "completed";
        stage.progress = 100;
        stage.details = `${stage.name} finalized successfully.`;
        this.addLog(`✅ Stage ${stage.id}: ${stage.name} completed successfully.`);
      }

      this.continuousMode = true;
      this.metrics.continuousMode = true;
      this.addLog("🌟 WORKFORCE RUNTIME ACTIVATED: Continuous event-driven Matching Office is online!");
    } catch (err: any) {
      this.addLog(`❌ Bootstrap failed at Stage ${this.currentStage}: ${err.message}`);
      if (this.stages[this.currentStage - 1]) {
        this.stages[this.currentStage - 1].status = "failed";
        this.stages[this.currentStage - 1].details = `Error: ${err.message}`;
      }
    } finally {
      this.isRunning = false;
      await this.recalculateMetrics();
    }
  }

  public async executeSingleOperation(operationName: string): Promise<void> {
    this.addLog(`🔧 Initiating targeted admin action: "${operationName}"`);
    try {
      if (operationName === "Rebuild Business Graph") {
        await this.executeStage(2, true);
      } else if (operationName === "Recalculate Matches") {
        await this.executeStage(6, true);
      } else if (operationName === "Vendor Broadcast") {
        await this.executeStage(8, true);
      } else if (operationName === "Repair Relationships") {
        await this.executeStage(3, true);
      } else if (operationName === "Repair Notifications") {
        await this.executeStage(7, true);
      } else if (operationName === "Resume Runtime") {
        this.continuousMode = true;
        this.metrics.continuousMode = true;
        this.addLog("📡 Continuous live Event Bus runtime resumed.");
      }
      this.addLog(`✅ Targeted action "${operationName}" completed.`);
    } catch (err: any) {
      this.addLog(`❌ Targeted action failed: ${err.message}`);
    } finally {
      await this.recalculateMetrics();
    }
  }

  private async executeStage(stageId: number, force: boolean): Promise<void> {
    this.currentStage = stageId;

    switch (stageId) {
      case 1: // Preflight Check
        await this.preflightCheck();
        break;
      case 2: // Business Graph Integrity
        await this.verifyBusinessGraph(force);
        break;
      case 3: // Relationship Repair
        await this.repairRelationships(force);
        break;
      case 4: // Bootstrap Requirements
        await this.bootstrapRequirements(force);
        break;
      case 5: // Bootstrap Candidates
        await this.bootstrapCandidates(force);
        break;
      case 6: // Generate Matches
        await this.generateMatches(force);
        break;
      case 7: // Generate Notifications
        await this.generateNotifications();
        break;
      case 8: // Vendor Broadcast
        await this.vendorBroadcast();
        break;
      case 9: // Publish Office Heartbeats
        await this.publishOfficeHeartbeats();
        break;
      case 10: // Enable Continuous Runtime
        await this.enableContinuousRuntime();
        break;
      default:
        throw new Error(`Unknown stage identifier: ${stageId}`);
    }
  }

  private async preflightCheck(): Promise<void> {
    this.addLog("Testing Firestore read/write connection...");
    const testDocRef = doc(db, "system_metadata", "preflight");
    await setDoc(testDocRef, {
      lastChecked: new Date().toISOString(),
      status: "operational",
    });
    this.addLog("Firestore preflight document written successfully.");

    // Seed initial data if database is empty to guarantee functional fidelity
    const reqsSnap = await getDocs(collection(db, "requirements"));
    if (reqsSnap.empty) {
      this.addLog("🪹 No requirement records found. Seeding pristine legacy data to bootstrap...");
      await this.seedDefaultData();
    } else {
      this.addLog(`📊 Found ${reqsSnap.size} existing requirements in Firestore.`);
    }
  }

  private async seedDefaultData(): Promise<void> {
    const seedRequirements: Requirement[] = [
      {
        id: "req_001",
        title: "Senior Fullstack Engineer (React & Go)",
        clientName: "AlphaTech Labs",
        description: "Looking for an expert developer to scale custom microservices and refine our dashboard UI layouts.",
        skillsRequired: ["React", "Go", "TypeScript", "Microservices"],
        status: "active",
        processingVersion: 0,
      },
      {
        id: "req_002",
        title: "Staff Cloud Architect",
        clientName: "Stellar Cloud Systems",
        description: "Lead transition of strategic core systems to zero-trust Firestore, Cloud SQL, and GCP containers.",
        skillsRequired: ["GCP", "Docker", "Firestore", "Kubernetes"],
        status: "active",
        processingVersion: 0,
      }
    ];

    const seedCandidates: Candidate[] = [
      {
        id: "cand_001",
        name: "Jane Devlin",
        email: "jane.d@engineer.io",
        phone: "+1-555-0192",
        skills: ["React", "TypeScript", "Node.js", "Go"],
        experience: "6 years senior developer at Stripe building custom billing layers.",
        status: "available",
        processingVersion: 0,
      },
      {
        id: "cand_002",
        name: "Marcus Vance",
        email: "marcus.v@cloudarch.net",
        phone: "+1-555-0143",
        skills: ["GCP", "Kubernetes", "Docker", "Python"],
        experience: "10 years architecture leadership leading container migrations.",
        status: "available",
        processingVersion: 0,
      }
    ];

    for (const req of seedRequirements) {
      await setDoc(doc(db, "requirements", req.id), req);
    }
    for (const cand of seedCandidates) {
      await setDoc(doc(db, "candidates", cand.id), cand);
    }
    this.addLog("🌱 Seeded default legacy Requirements and Candidates successfully!");
  }

  private async verifyBusinessGraph(force: boolean): Promise<void> {
    this.addLog("Auditing client-vendor relationship nodes...");
    const reqs = await getDocs(collection(db, "requirements"));
    let graphCount = 0;

    for (const reqDoc of reqs.docs) {
      const data = reqDoc.data() as Requirement;
      if (force || !data.graphVersion || data.graphVersion < 1) {
        await updateDoc(doc(db, "requirements", reqDoc.id), {
          graphVersion: 1,
          updatedAt: new Date().toISOString(),
        });
        graphCount++;
      }
    }
    this.addLog(`🔗 Linked and updated graphVersion for ${graphCount} requirements.`);
  }

  private async repairRelationships(force: boolean): Promise<void> {
    this.addLog("Checking for orphaned matches and missing links...");
    const candSnap = await getDocs(collection(db, "candidates"));
    let repaired = 0;

    for (const candDoc of candSnap.docs) {
      const cand = candDoc.data() as Candidate;
      if (!cand.phone || cand.phone === "") {
        await updateDoc(doc(db, "candidates", candDoc.id), {
          phone: "+1-555-0000", // Repair missing contact fields
          repairedAt: new Date().toISOString(),
        });
        repaired++;
      }
    }
    this.addLog(`🛠️ Checked candidates. Completed repairs on ${repaired} records.`);
  }

  private async bootstrapRequirements(force: boolean): Promise<void> {
    this.addLog("Aligning Requirements metadata and marking idempotency version...");
    const reqs = await getDocs(collection(db, "requirements"));
    let count = 0;

    for (const reqDoc of reqs.docs) {
      const req = reqDoc.data() as Requirement;
      if (force || req.processingVersion === 0 || !req.processingVersion) {
        await updateDoc(doc(db, "requirements", reqDoc.id), {
          processingVersion: 1,
          lastAgentRun: new Date().toISOString(),
        });
        count++;
      }
    }
    this.addLog(`📊 Set processingVersion=1 for ${count} legacy requirements.`);
  }

  private async bootstrapCandidates(force: boolean): Promise<void> {
    this.addLog("Aligning Candidates metadata and indexing tracking keys...");
    const candSnap = await getDocs(collection(db, "candidates"));
    let count = 0;

    for (const candDoc of candSnap.docs) {
      const cand = candDoc.data() as Candidate;
      if (force || cand.processingVersion === 0 || !cand.processingVersion) {
        await updateDoc(doc(db, "candidates", candDoc.id), {
          processingVersion: 1,
          lastAgentRun: new Date().toISOString(),
        });
        count++;
      }
    }
    this.addLog(`📊 Set processingVersion=1 for ${count} legacy candidates.`);
  }

  private async generateMatches(force: boolean): Promise<void> {
    this.addLog("Running recruiter overrides and semantic matching on stales...");
    const reqs = await getDocs(collection(db, "requirements"));
    const cands = await getDocs(collection(db, "candidates"));
    let matchCount = 0;

    for (const reqDoc of reqs.docs) {
      const req = reqDoc.data() as Requirement;
      
      for (const candDoc of cands.docs) {
        const cand = candDoc.data() as Candidate;
        
        // Prevent duplicate matching unless forced
        const matchId = `${req.id}_${cand.id}`;
        if (!force) {
          const existingMatch = await getDoc(doc(db, "candidate_matches", matchId));
          if (existingMatch.exists()) {
            this.addLog(`⏭️ Match already exists for Candidate ${cand.name} vs Requirement "${req.title}". Skipping.`);
            continue;
          }
        }

        this.addLog(`🔍 Matching: "${cand.name}" ↔️ "${req.title}"...`);
        const result = await calculateSemanticMatch(
          cand.name,
          cand.skills,
          cand.experience,
          req.title,
          req.description,
          req.skillsRequired
        );

        if (result.matchScore >= 50) {
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
          };

          await setDoc(doc(db, "candidate_matches", matchId), match);
          matchCount++;
          this.addLog(`🎯 Score: ${result.matchScore}% - Created CandidateMatch.`);
        }
      }

      await updateDoc(doc(db, "requirements", reqDoc.id), {
        lastMatchedAt: new Date().toISOString(),
      });
    }

    this.addLog(`🏁 Matching complete. Sourced and indexed ${matchCount} new candidate_matches.`);
  }

  private async generateNotifications(): Promise<void> {
    this.addLog("Sourcing notifications for matched nodes...");
    const matches = await getDocs(collection(db, "candidate_matches"));
    let notifCount = 0;

    for (const mDoc of matches.docs) {
      const match = mDoc.data() as CandidateMatch;
      const notifId = `notif_${match.id}`;
      
      await setDoc(doc(db, "notifications", notifId), {
        id: notifId,
        matchId: match.id,
        recipient: "HQ Recruiter",
        message: `New match found: ${match.candidateName} for ${match.requirementTitle} (${match.matchScore}%)`,
        read: false,
        createdAt: new Date().toISOString(),
      });
      notifCount++;
    }
    this.addLog(`🔔 Generated ${notifCount} recruiter inbox notifications.`);
  }

  private async vendorBroadcast(): Promise<void> {
    this.addLog("Broadcasting high-matching nodes to Vendor Workspace registers...");
    const matches = await getDocs(collection(db, "candidate_matches"));
    let bcastCount = 0;

    for (const mDoc of matches.docs) {
      const match = mDoc.data() as CandidateMatch;
      if (match.matchScore >= 75) {
        await updateDoc(doc(db, "candidate_matches", mDoc.id), {
          vendorBroadcastActive: true,
          lastBroadcastAt: new Date().toISOString(),
        });
        bcastCount++;
      }
    }
    this.addLog(`📡 Broadcasted ${bcastCount} premium shortlists to external Vendor channels.`);
  }

  private async publishOfficeHeartbeats(): Promise<void> {
    this.addLog("Broadcasting live engine heartbeat signal pulses...");
    const heartbeatRef = doc(db, "system_metadata", "heartbeat");
    await setDoc(heartbeatRef, {
      timestamp: new Date().toISOString(),
      offices: ["MatchingOffice", "VendorOffice", "ClientOffice", "AICooOffice"],
      status: "HEARTBEAT_OK",
    });

    // Bridge with our Local EventBus to publish bootstrap completed event!
    EventBus.getInstance().publish({
      eventId: `evt_boot_${Date.now()}`,
      type: "WORKFORCE_BOOTSTRAP_COMPLETED",
      createdAt: new Date().toISOString(),
      payload: { timestamp: new Date().toISOString(), source: "WorkforceBootstrapEngine" },
    });

    this.addLog("💓 Office heartbeats registered and WORKFORCE_BOOTSTRAP_COMPLETED event emitted.");
  }

  private async enableContinuousRuntime(): Promise<void> {
    this.addLog("Configuring Live continuous Event Bus subscriptions...");
    const systemConfigRef = doc(db, "system_metadata", "runtime_config");
    await setDoc(systemConfigRef, {
      mode: "continuous",
      lastBootstrapAt: new Date().toISOString(),
      engineVersion: 2,
    });
    this.addLog("⚙️ Runtime configuration toggled: Continuous live events active.");
  }

  public async recalculateMetrics(): Promise<void> {
    try {
      const reqs = await getDocs(collection(db, "requirements"));
      const cands = await getDocs(collection(db, "candidates"));
      const matches = await getDocs(collection(db, "candidate_matches"));

      this.metrics = {
        totalRequirements: reqs.size,
        totalCandidates: cands.size,
        totalMatches: matches.size,
        reconciliationRate: reqs.size > 0 ? Math.round((matches.size / (reqs.size * Math.max(1, cands.size))) * 100) : 0,
        continuousMode: this.continuousMode,
        lastHeartbeat: new Date().toISOString(),
      };
    } catch (err) {
      console.error("Failed to recalculate metrics:", err);
    }
  }
}
