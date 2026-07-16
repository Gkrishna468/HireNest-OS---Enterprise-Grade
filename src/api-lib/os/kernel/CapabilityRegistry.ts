import { db } from "../../../lib/firebase-admin.js";

export interface SystemCapability {
  id: string; // e.g. "candidate.semantic_match"
  name: string; // e.g. "Candidate Semantic Match"
  description: string;
  version: string; // e.g. "2.0.0"
  enabled: boolean;
  healthStatus: "READY" | "DEGRADED" | "MAINTENANCE" | "FAILED";
  lifecycle: "ACTIVE" | "DEPRECATED" | "EXPERIMENTAL" | "MAINTENANCE";
  category: "Cognitive" | "Operations" | "Data";
  owner: string; // e.g. "core-platform", "vendor-platform"
  dependencies: string[]; // e.g. ["ai_gateway", "gemini"]
  versionState: "Installed" | "Latest" | "Compatible" | "Deprecated";
  lastHeartbeat: string; // ISO String
  averageLatencyMs: number;
  estimatedCostUsd: number;
  availability: number; // e.g. 0.99
  fallbackAction: string; // e.g. "Deterministic Keyword Match"
  expectedConfidence: number; // e.g. 0.85
  tags?: string[];
  errorCount: number;
  lastError?: string;
}

export class CapabilityRegistry {
  private static readonly COLLECTION_NAME = "system_capabilities";

  // Standard Default Capabilities for Seeding / Offline Fallback
  private static readonly DEFAULT_CAPABILITIES: SystemCapability[] = [
    {
      id: "candidate.semantic_match",
      name: "Candidate Semantic Match",
      description: "Cognitive assessment and scoring of candidates against core job requirements.",
      version: "2.0.0",
      enabled: true,
      healthStatus: "READY",
      lifecycle: "ACTIVE",
      category: "Cognitive",
      owner: "core-platform",
      dependencies: ["ai_gateway", "gemini"],
      versionState: "Latest",
      lastHeartbeat: new Date().toISOString(),
      averageLatencyMs: 3500,
      estimatedCostUsd: 0.005,
      availability: 0.99,
      fallbackAction: "Deterministic Keyword Match",
      expectedConfidence: 0.85,
      tags: ["matching", "ai", "gemini"],
      errorCount: 0,
    },
    {
      id: "resume.parse",
      name: "Resume Parsing",
      description: "Automated extraction of contact info, work history, education, and skills from candidate profiles.",
      version: "2.1.0",
      enabled: true,
      healthStatus: "READY",
      lifecycle: "ACTIVE",
      category: "Cognitive",
      owner: "core-platform",
      dependencies: ["ai_gateway", "gemini"],
      versionState: "Latest",
      lastHeartbeat: new Date().toISOString(),
      averageLatencyMs: 2500,
      estimatedCostUsd: 0.002,
      availability: 0.995,
      fallbackAction: "Reject / Manual Review",
      expectedConfidence: 0.90,
      tags: ["parsing", "extraction", "resume"],
      errorCount: 0,
    },
    {
      id: "jd.analysis",
      name: "Job Description Analysis",
      description: "Deep cognitive analysis of job descriptions to determine salary, skills, and target experience.",
      version: "1.2.0",
      enabled: true,
      healthStatus: "READY",
      lifecycle: "ACTIVE",
      category: "Cognitive",
      owner: "core-platform",
      dependencies: ["ai_gateway", "gemini"],
      versionState: "Compatible",
      lastHeartbeat: new Date().toISOString(),
      averageLatencyMs: 2200,
      estimatedCostUsd: 0.003,
      availability: 0.992,
      fallbackAction: "Manual Form Intake",
      expectedConfidence: 0.88,
      tags: ["intake", "parsing", "jd"],
      errorCount: 0,
    },
    {
      id: "work.prioritization",
      name: "Work Prioritization",
      description: "Autonomous backlog sorting based on placement probability, commission, and client urgency.",
      version: "1.0.0",
      enabled: true,
      healthStatus: "READY",
      lifecycle: "ACTIVE",
      category: "Operations",
      owner: "core-platform",
      dependencies: ["firestore"],
      versionState: "Installed",
      lastHeartbeat: new Date().toISOString(),
      averageLatencyMs: 800,
      estimatedCostUsd: 0.0001,
      availability: 0.999,
      fallbackAction: "Deterministic Sorter Heuristic",
      expectedConfidence: 0.95,
      tags: ["operations", "backlog", "sorting"],
      errorCount: 0,
    }
  ];

  /**
   * Seed default capabilities if the collection is empty or does not exist.
   */
  public static async seedIfNeeded(): Promise<void> {
    if (!db) return;
    try {
      const snap = await db.collection(this.COLLECTION_NAME).limit(1).get();
      if (snap.empty) {
        console.log(`[CapabilityRegistry] Seeding ${this.DEFAULT_CAPABILITIES.length} default capabilities...`);
        const batch = db.batch();
        for (const cap of this.DEFAULT_CAPABILITIES) {
          const docRef = db.collection(this.COLLECTION_NAME).doc(cap.id);
          batch.set(docRef, cap);
        }
        await batch.commit();
        console.log("[CapabilityRegistry] Seeding complete.");
      }
    } catch (error) {
      console.error("[CapabilityRegistry] Error during seeding:", error);
    }
  }

  /**
   * Get all registered capabilities.
   */
  public static async getAllCapabilities(): Promise<SystemCapability[]> {
    if (!db) {
      return this.DEFAULT_CAPABILITIES;
    }
    try {
      await this.seedIfNeeded();
      const snap = await db.collection(this.COLLECTION_NAME).get();
      if (snap.empty) {
        return this.DEFAULT_CAPABILITIES;
      }
      return snap.docs.map(doc => doc.data() as SystemCapability);
    } catch (error) {
      console.error("[CapabilityRegistry] Failed to fetch capabilities. Returning defaults:", error);
      return this.DEFAULT_CAPABILITIES;
    }
  }

  /**
   * Get a specific capability by ID.
   */
  public static async getCapability(id: string): Promise<SystemCapability | undefined> {
    if (!db) {
      return this.DEFAULT_CAPABILITIES.find(c => c.id === id);
    }
    try {
      const docSnap = await db.collection(this.COLLECTION_NAME).doc(id).get();
      if (docSnap.exists) {
        return docSnap.data() as SystemCapability;
      }
      // If missing from DB, check defaults and optionally register
      const defaultCap = this.DEFAULT_CAPABILITIES.find(c => c.id === id);
      if (defaultCap) {
        await db.collection(this.COLLECTION_NAME).doc(id).set(defaultCap);
        return defaultCap;
      }
      return undefined;
    } catch (error) {
      console.error(`[CapabilityRegistry] Failed to get capability ${id}:`, error);
      return this.DEFAULT_CAPABILITIES.find(c => c.id === id);
    }
  }

  /**
   * Update capability health status, heartbeats, metrics or error counts.
   */
  public static async updateCapability(id: string, updates: Partial<SystemCapability>): Promise<void> {
    if (!db) return;
    try {
      const docRef = db.collection(this.COLLECTION_NAME).doc(id);
      await docRef.set({ ...updates, id }, { merge: true });
    } catch (error) {
      console.error(`[CapabilityRegistry] Failed to update capability ${id}:`, error);
    }
  }

  /**
   * Record a heartbeat (and potentially update latency/health status).
   */
  public static async recordHeartbeat(id: string, latencyMs?: number): Promise<void> {
    const capability = await this.getCapability(id);
    if (!capability) return;

    const updates: Partial<SystemCapability> = {
      lastHeartbeat: new Date().toISOString(),
      healthStatus: "READY",
      errorCount: 0 // Reset error count on successful execution/heartbeat
    };

    if (latencyMs !== undefined) {
      // Exponential moving average for latency
      const currentAvg = capability.averageLatencyMs || 2000;
      updates.averageLatencyMs = Math.round(currentAvg * 0.8 + latencyMs * 0.2);
    }

    await this.updateCapability(id, updates);
  }

  /**
   * Record an execution failure to track health status dynamically.
   */
  public static async recordFailure(id: string, errorMessage: string): Promise<void> {
    const capability = await this.getCapability(id);
    if (!capability) return;

    const newErrorCount = (capability.errorCount || 0) + 1;
    let newHealthStatus: SystemCapability["healthStatus"] = "READY";

    if (newErrorCount >= 5) {
      newHealthStatus = "FAILED";
    } else if (newErrorCount >= 2) {
      newHealthStatus = "DEGRADED";
    }

    const updates: Partial<SystemCapability> = {
      errorCount: newErrorCount,
      lastError: errorMessage,
      healthStatus: newHealthStatus,
      lastHeartbeat: new Date().toISOString()
    };

    await this.updateCapability(id, updates);
  }

  /**
   * Enable or disable a capability.
   */
  public static async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.updateCapability(id, { enabled });
  }
}
