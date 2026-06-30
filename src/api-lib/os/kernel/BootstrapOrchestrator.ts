import { db } from "../../../lib/firebase-admin.js";

export interface BootstrapJob {
  jobId: string;
  jobName: string; // e.g. 'Graph Repair', 'Requirement Reconciliation'
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "PAUSED";
  progress: number;
  error?: string;
  startedAt?: string;
  updatedAt: string;
}

export class BootstrapOrchestrator {
  /**
   * Start or resume a specific bootstrap job.
   */
  static async scheduleJob(jobName: string): Promise<string> {
    if (!db) return "";

    const jobId = `job-${jobName.replace(/\s+/g, "-")}-${Date.now()}`;
    const job: BootstrapJob = {
      jobId,
      jobName,
      status: "PENDING",
      progress: 0,
      updatedAt: new Date().toISOString(),
    };

    await db.collection("bootstrap_jobs").doc(jobId).set(job);

    // Trigger execution asynchronously
    this.executeJob(jobId, jobName).catch((e) =>
      console.error("[Bootstrap] execution failed", e),
    );

    return jobId;
  }

  static async getJobStatus(jobId: string): Promise<BootstrapJob | null> {
    if (!db) return null;
    const snap = await db.collection("bootstrap_jobs").doc(jobId).get();
    if (!snap.exists) return null;
    return snap.data() as BootstrapJob;
  }

  private static async executeJob(jobId: string, jobName: string) {
    if (!db) return;
    const ref = db.collection("bootstrap_jobs").doc(jobId);
    await ref.update({
      status: "RUNNING",
      startedAt: new Date().toISOString(),
    });

    try {
      // Simulated Job Execution Runner
      // In a real system, this would route to specific job handlers
      for (let i = 10; i <= 100; i += 10) {
        // Simulate work
        await new Promise((r) => setTimeout(r, 500));
        await ref.update({ progress: i, updatedAt: new Date().toISOString() });
      }

      await ref.update({
        status: "COMPLETED",
        updatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      await ref.update({
        status: "FAILED",
        error: error.message,
        updatedAt: new Date().toISOString(),
      });
    }
  }
}
