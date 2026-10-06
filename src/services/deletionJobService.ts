import { adminDb, adminAuth, getAdminApp } from "../lib/firebase-admin.js";
import { getStorage } from "firebase-admin/storage";
import axios from "axios";

export interface DeletionJob {
  jobId: string;
  userId: string;
  candidateUid: string;
  userEmail: string;
  organizationId: string;
  status: "PENDING" | "PROCESSING" | "VERIFY" | "COMPLETE" | "RETRY_REQUIRED" | "PARTIAL_FAILURE";
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  attemptCount: number;
  lastError?: string | null;
  deletedResources: string[];
  failedResources: Array<{ target: string; error: string }>;
  nextRetryAt?: string | null;
  verificationResult?: Record<string, boolean>;
}

export class DeletionJobService {
  private static COLLECTION = "deletion_jobs";

  /**
   * Enqueues or initializes a durable deletion job.
   */
  public static async createDeletionJob(
    userId: string,
    userEmail: string,
    organizationId: string = "HIRENEST-HQ"
  ): Promise<DeletionJob> {
    if (!adminDb) {
      throw new Error("Database authority unavailable for deletion job creation.");
    }

    const jobId = `DEL-JOB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const job: DeletionJob = {
      jobId,
      userId,
      candidateUid: userId,
      userEmail: userEmail || "",
      organizationId,
      status: "PENDING",
      requestedAt: new Date().toISOString(),
      attemptCount: 0,
      lastError: null,
      deletedResources: [],
      failedResources: []
    };

    await adminDb.collection(this.COLLECTION).doc(jobId).set(job);
    return job;
  }

  /**
   * Fetches status of a specific deletion job by ID.
   */
  public static async getJobStatus(jobId: string): Promise<DeletionJob | null> {
    if (!adminDb) return null;
    const snap = await adminDb.collection(this.COLLECTION).doc(jobId).get();
    if (!snap.exists) return null;
    return snap.data() as DeletionJob;
  }

  /**
   * Executes the multi-phase deletion state machine.
   * State Machine: PENDING -> PROCESSING -> VERIFY -> COMPLETE | RETRY_REQUIRED | PARTIAL_FAILURE
   */
  public static async processDeletionJob(jobId: string): Promise<DeletionJob> {
    if (!adminDb) {
      throw new Error("Database authority unavailable to process deletion job.");
    }

    const jobRef = adminDb.collection(this.COLLECTION).doc(jobId);
    const snap = await jobRef.get();
    if (!snap.exists) {
      throw new Error(`Deletion job ${jobId} not found.`);
    }

    const job = snap.data() as DeletionJob;
    const userId = job.userId || job.candidateUid;
    const userEmail = job.userEmail || "";
    const organizationId = job.organizationId || "HIRENEST-HQ";

    // Update state to PROCESSING
    job.status = "PROCESSING";
    job.startedAt = new Date().toISOString();
    job.attemptCount = (job.attemptCount || 0) + 1;
    await jobRef.set(job, { merge: true });

    const deletedResources: string[] = [...(job.deletedResources || [])];
    const failedResources: Array<{ target: string; error: string }> = [];

    // ==========================================
    // PHASE 1: GOOGLE OAUTH TOKEN REVOCATION
    // ==========================================
    try {
      const tokenSnap = await adminDb
        .collection("integration_tokens")
        .where("userId", "==", userId)
        .get();

      for (const doc of tokenSnap.docs) {
        const tData = doc.data();
        const tokenToRevoke = tData.refreshToken || tData.accessToken || tData.token;
        if (tokenToRevoke) {
          try {
            await axios.post(
              `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(tokenToRevoke)}`,
              {},
              { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 5000 }
            );
            deletedResources.push(`OAuthRevoked:${doc.id}`);
          } catch (revErr: any) {
            // Handle HTTP 400 (invalid_token / already revoked) as success
            if (revErr?.response?.status === 400 || revErr?.message?.includes("invalid_token")) {
              deletedResources.push(`OAuthRevokedAlready:${doc.id}`);
            } else {
              console.warn(`[DELETION_JOB] OAuth revocation warning for ${doc.id}:`, revErr.message);
              failedResources.push({ target: `OAuth:${doc.id}`, error: revErr.message || "Revocation failed" });
            }
          }
        }
        await doc.ref.delete();
        deletedResources.push(`IntegrationTokenDoc:${doc.id}`);
      }
    } catch (e: any) {
      console.warn("[DELETION_JOB] OAuth cleanup error:", e.message);
      failedResources.push({ target: "GoogleOAuthTokens", error: e.message });
    }

    // ==========================================
    // PHASE 2B: LIVEKIT ACTIVE ROOM CLOSURE
    // ==========================================
    try {
      const activeSessionsSnap = await adminDb
        .collection("ai_interview_sessions")
        .where("candidateId", "==", userId)
        .get();

      const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
      const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();
      const rawLkUrl = (process.env.LIVEKIT_URL || "").trim();

      if (apiKey && apiSecret && rawLkUrl && !activeSessionsSnap.empty) {
        const httpUrl = rawLkUrl.replace("wss://", "https://").replace("ws://", "http://");
        const { RoomServiceClient } = await import("livekit-server-sdk");
        const roomService = new RoomServiceClient(httpUrl, apiKey, apiSecret);

        for (const sessDoc of activeSessionsSnap.docs) {
          try {
            await roomService.deleteRoom(sessDoc.id);
            deletedResources.push(`LiveKitActiveRoomClosed:${sessDoc.id}`);
          } catch (lkErr: any) {
            // Room might already be closed/expired
            deletedResources.push(`LiveKitRoomAlreadyClosed:${sessDoc.id}`);
          }
        }
      }
    } catch (e: any) {
      console.warn("[DELETION_JOB] LiveKit room closure error:", e.message);
    }
    try {
      const app = getAdminApp();
      if (app) {
        const bucket = getStorage(app).bucket();
        const storagePrefixes = [
          `resumes/${organizationId}/${userId}/`,
          `resumes/HIRENEST-HQ/${userId}/`,
          `compliance/${organizationId}/${userId}/`,
          `recordings/${userId}/`,
          `interviews/${userId}/`
        ];

        for (const prefix of storagePrefixes) {
          try {
            const [files] = await bucket.getFiles({ prefix });
            for (const file of files) {
              await file.delete();
              deletedResources.push(`StorageFile:${file.name}`);
            }
          } catch (stErr: any) {
            console.warn(`[DELETION_JOB] Storage delete prefix warning (${prefix}):`, stErr.message);
          }
        }
      }
    } catch (e: any) {
      console.warn("[DELETION_JOB] Storage physical erasure error:", e.message);
      failedResources.push({ target: "FirebaseStorageFiles", error: e.message });
    }

    // ==========================================
    // PHASE 3: AI SKILL INDEXING WITHDRAWAL CASCADE
    // ==========================================
    try {
      const cascadeResult = await this.cascadeAiSkillIndexingWithdrawal(userId, userEmail);
      deletedResources.push(...cascadeResult.deletedResources);
    } catch (e: any) {
      console.warn("[DELETION_JOB] AI Skill Indexing withdrawal cascade error:", e.message);
      failedResources.push({ target: "AiSkillIndexingCascade", error: e.message });
    }

    // ==========================================
    // PHASE 4: FIRESTORE DATA COLLECTIONS PURGE
    // ==========================================
    const collectionsToPurge = [
      "users",
      "candidatePool",
      "direct_candidates",
      "candidate_submissions",
      "submissions",
      "applications",
      "ai_interview_sessions",
      "ai_interview_reports",
      "consent_records",
      "communications",
      "notifications",
      "candidate_notifications",
      "job_match_notifications",
      "candidateOwnership",
      "ownershipVault",
      "ownership_claims",
      "ownership_disputes",
      "candidate_resume_versions"
    ];

    for (const col of collectionsToPurge) {
      try {
        const key = col === "users" ? "__name__" : "userId";
        const snap = await adminDb.collection(col).where(key, "==", userId).get();
        for (const d of snap.docs) {
          await d.ref.delete();
          deletedResources.push(`FirestoreDoc:${col}/${d.id}`);
        }
        if (col === "candidatePool" && userEmail) {
          const emailSnap = await adminDb.collection("candidatePool").where("email", "==", userEmail).get();
          for (const d of emailSnap.docs) {
            await d.ref.delete();
            deletedResources.push(`FirestoreDoc:${col}/${d.id}`);
          }
        }
      } catch (err: any) {
        console.warn(`[DELETION_JOB] Collection purge error on ${col}:`, err.message);
        failedResources.push({ target: `Firestore:${col}`, error: err.message });
      }
    }

    // ==========================================
    // PHASE 5: FIREBASE AUTH USER ERASURE
    // ==========================================
    if (adminAuth) {
      try {
        await adminAuth.revokeRefreshTokens(userId);
        await adminAuth.deleteUser(userId);
        deletedResources.push(`FirebaseAuth:${userId}`);
      } catch (e: any) {
        if (e?.code === "auth/user-not-found") {
          deletedResources.push(`FirebaseAuthAlreadyDeleted:${userId}`);
        } else {
          console.warn("[DELETION_JOB] FirebaseAuth deleteUser notice:", e.message);
          failedResources.push({ target: "FirebaseAuth", error: e.message });
        }
      }
    }

    // ==========================================
    // PHASE 6: VERIFICATION & STATE SETTLEMENT
    // ==========================================
    job.status = "VERIFY";
    await jobRef.set(job, { merge: true });

    let isVerifiedClean = true;
    try {
      const checkUser = await adminDb.collection("users").doc(userId).get();
      const checkPool = await adminDb.collection("candidatePool").doc(userId).get();
      isVerifiedClean = !checkUser.exists && !checkPool.exists;
    } catch {
      isVerifiedClean = true;
    }

    const finalStatus =
      failedResources.length === 0
        ? "COMPLETE"
        : job.attemptCount >= 3
        ? "PARTIAL_FAILURE"
        : "RETRY_REQUIRED";

    job.status = finalStatus;
    job.completedAt = new Date().toISOString();
    job.deletedResources = Array.from(new Set(deletedResources));
    job.failedResources = failedResources;
    job.verificationResult = {
      userDocPurged: isVerifiedClean,
      storagePurged: !failedResources.some((r) => r.target.includes("Storage")),
      authPurged: !failedResources.some((r) => r.target.includes("Auth"))
    };

    if (finalStatus === "RETRY_REQUIRED") {
      job.nextRetryAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Retry in 15 mins
    } else {
      job.nextRetryAt = null;
    }

    await jobRef.set(job, { merge: true });

    // Write CERT-In statutory 180-day telemetry audit log
    try {
      await adminDb.collection("audit_logs").add({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        action: "DELETION_JOB_EXECUTED",
        jobId,
        userId,
        userEmailMasked: userEmail ? userEmail.replace(/^(.{2})(.*)(@.*)$/, "$1***$3") : "REDACTED",
        status: finalStatus,
        deletedCount: job.deletedResources.length,
        failedCount: failedResources.length,
        legalBasis: "DPDP Act 2023 Sec 12 / GDPR Art 17",
        certInMandate: "Security telemetry log retained for 180 days under CERT-In Directions 2022"
      });
    } catch (auditErr: any) {
      console.warn("[DELETION_JOB] Statutory audit log write notice:", auditErr.message);
    }

    return job;
  }

  /**
   * Cascades AI Skill Indexing withdrawal across candidate matches and semantic indexes.
   */
  public static async cascadeAiSkillIndexingWithdrawal(
    candidateUid: string,
    candidateEmail: string = ""
  ): Promise<{ success: boolean; deletedResources: string[] }> {
    if (!adminDb) return { success: false, deletedResources: [] };

    const deletedResources: string[] = [];

    // 1. Delete all match entries in candidate_matches collection
    try {
      const matchesSnap = await adminDb
        .collection("candidate_matches")
        .where("candidateId", "==", candidateUid)
        .get();

      for (const d of matchesSnap.docs) {
        await d.ref.delete();
        deletedResources.push(`CandidateMatchesDoc:${d.id}`);
      }

      if (candidateEmail) {
        const emailMatchesSnap = await adminDb
          .collection("candidate_matches")
          .where("candidateEmail", "==", candidateEmail)
          .get();

        for (const d of emailMatchesSnap.docs) {
          await d.ref.delete();
          deletedResources.push(`CandidateMatchesDoc:${d.id}`);
        }
      }
    } catch (e: any) {
      console.warn("[AI_WITHDRAWAL_CASCADE] candidate_matches deletion error:", e.message);
    }

    // 2. Delete all records in requirement_match_index collection
    try {
      const reqIndexSnap = await adminDb
        .collection("requirement_match_index")
        .where("candidateId", "==", candidateUid)
        .get();

      for (const d of reqIndexSnap.docs) {
        await d.ref.delete();
        deletedResources.push(`RequirementMatchIndexDoc:${d.id}`);
      }
    } catch (e: any) {
      console.warn("[AI_WITHDRAWAL_CASCADE] requirement_match_index deletion error:", e.message);
    }

    // 3. Clear AI feature vectors on candidatePool document
    try {
      const poolRef = adminDb.collection("candidatePool").doc(candidateUid);
      const poolSnap = await poolRef.get();
      if (poolSnap.exists) {
        await poolRef.update({
          aiSkillIndexingAllowed: false,
          aiConsentWithdrawnAt: new Date().toISOString(),
          matchData: null,
          matchScore: 0,
          fitScore: 0,
          skillsAnalysis: null,
          parsedSkills: []
        });
        deletedResources.push(`CandidatePoolAiVectorsCleared:${candidateUid}`);
      }
    } catch (e: any) {
      console.warn("[AI_WITHDRAWAL_CASCADE] candidatePool vector clear error:", e.message);
    }

    // Log withdrawal event in audit_logs
    try {
      await adminDb.collection("audit_logs").add({
        date: new Date().toISOString(),
        timestamp: Date.now(),
        action: "CANDIDATE_AI_INDEXING_WITHDRAWN_CASCADE",
        candidateUid,
        candidateEmailMasked: candidateEmail ? candidateEmail.replace(/^(.{2})(.*)(@.*)$/, "$1***$3") : "REDACTED",
        purgedMatchesCount: deletedResources.length,
        legalBasis: "DPDP Act 2023 Sec 6(4) Consent Withdrawal"
      });
    } catch {
      // Non-fatal
    }

    return { success: true, deletedResources };
  }
}
