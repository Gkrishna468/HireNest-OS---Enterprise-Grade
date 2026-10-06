import { adminDb } from "../lib/firebase-admin.js";
import { DeletionJobService } from "./deletionJobService.js";

export interface RetentionAuditSummary {
  scannedCount: number;
  eligibleForDeletionCount: number;
  retainedForLegalHoldCount: number;
  jobsEnqueuedCount: number;
  dryRun: boolean;
  eligibleCandidates: Array<{
    candidateId: string;
    email: string;
    lastActiveAt: string;
    inactiveDays: number;
  }>;
}

export class RetentionWorkerService {
  /**
   * Scans candidate pool for profiles inactive longer than 730 days (24 months)
   * that have no active job submissions or legal holds.
   * Creates deletion jobs or returns dry-run summary.
   */
  public static async executeRetentionAudit(
    options: { maxInactiveDays?: number; dryRun?: boolean; limit?: number } = {}
  ): Promise<RetentionAuditSummary> {
    const maxInactiveDays = options.maxInactiveDays || 730; // 24 months / 730 days
    const dryRun = options.dryRun !== false; // Default to safe dryRun mode
    const limit = options.limit || 50;

    const summary: RetentionAuditSummary = {
      scannedCount: 0,
      eligibleForDeletionCount: 0,
      retainedForLegalHoldCount: 0,
      jobsEnqueuedCount: 0,
      dryRun,
      eligibleCandidates: []
    };

    if (!adminDb) return summary;

    const cutoffTimestamp = Date.now() - maxInactiveDays * 24 * 60 * 60 * 1000;
    const cutoffDateIso = new Date(cutoffTimestamp).toISOString();

    try {
      // Query candidates inactive since cutoff
      const candidatesSnap = await adminDb
        .collection("candidatePool")
        .where("updatedAt", "<", cutoffDateIso)
        .limit(limit)
        .get();

      summary.scannedCount = candidatesSnap.docs.length;

      for (const doc of candidatesSnap.docs) {
        const cand = doc.data();
        const candId = doc.id;
        const candEmail = cand.email || "";

        // Check if candidate has active job submissions or legal holds
        const activeSubmissionsSnap = await adminDb
          .collection("submissions")
          .where("candidateId", "==", candId)
          .where("status", "in", ["SUBMITTED", "INTERVIEW_SCHEDULED", "OFFER_EXTENDED", "ACCEPTED"])
          .limit(1)
          .get();

        if (!activeSubmissionsSnap.empty || cand.legalHold === true) {
          summary.retainedForLegalHoldCount++;
          continue;
        }

        const lastActiveMs = new Date(cand.updatedAt || cand.createdAt || 0).getTime();
        const inactiveDays = Math.floor((Date.now() - lastActiveMs) / (1000 * 60 * 60 * 24));

        summary.eligibleCandidates.push({
          candidateId: candId,
          email: candEmail,
          lastActiveAt: cand.updatedAt || cand.createdAt || "Unknown",
          inactiveDays
        });
        summary.eligibleForDeletionCount++;

        // Enqueue deletion job if not in dryRun mode
        if (!dryRun) {
          await DeletionJobService.createDeletionJob(candId, candEmail, cand.organizationId || "HIRENEST-HQ");
          summary.jobsEnqueuedCount++;
        }
      }

      // Record retention audit run in audit_logs
      await adminDb.collection("audit_logs").add({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        action: "RETENTION_POLICY_AUDIT_EXECUTED",
        maxInactiveDays,
        dryRun,
        scannedCount: summary.scannedCount,
        eligibleCount: summary.eligibleForDeletionCount,
        jobsEnqueuedCount: summary.jobsEnqueuedCount,
        certInMandate: "Statutory 180-day telemetry log retained under CERT-In Directions 2022"
      });
    } catch (e: any) {
      console.warn("[RETENTION_WORKER] Audit execution error:", e.message);
    }

    return summary;
  }
}
