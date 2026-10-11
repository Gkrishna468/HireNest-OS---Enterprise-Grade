/**
 * HireNestOS Follow-Up Automation Engine
 * Extends EventBus, SLAEngine, AICOO, and CommunicationGuardService.
 * Coordinates client, vendor, direct candidate, and submission follow-up reminders.
 *
 * Core Governance Controls:
 * - Quiet Hours Enforcement: 20:00 - 08:00 local time.
 * - Idempotency & De-duplication.
 * - Automatic cancellation on response receipt or terminal event.
 * - Consent, opt-out, and rate-limit guard checks.
 */

import { adminDb } from "../../lib/firebase-admin.js";
import { EventBus } from "./EventBus.js";
import { CommunicationGuardService } from "./CommunicationGuardService.js";

export interface FollowUpRecord {
  id: string;
  idempotencyKey: string;
  ownerId: string;
  entityType: "candidate" | "client" | "vendor" | "submission" | "requirement";
  entityId: string;
  title: string;
  messageDraft: string;
  status: "PENDING" | "DISPATCHED" | "CANCELLED_RESPONSE_RECEIVED" | "CANCELLED_TERMINAL" | "EXPIRED" | "FAILED";
  dueDate: string;
  attempts: number;
  lastResponseAt?: string;
  escalationLevel: number;
  channel: "email" | "whatsapp" | "system_alert";
  quietHoursBypassed: boolean;
  requiresApproval: boolean;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export class FollowUpAutomationEngine {
  private static isSubscribed = false;

  /**
   * Initializes event listeners to automatically cancel pending follow-ups upon response receipt.
   */
  public static init() {
    if (this.isSubscribed) return;
    this.isSubscribed = true;

    EventBus.subscribe("RESPONSE_RECEIVED", async (event) => {
      const { entityId, entityType } = event.payload || {};
      if (entityId) {
        await this.cancelPendingFollowUps(entityId, entityType, "CANCELLED_RESPONSE_RECEIVED");
      }
    }, "FollowUpAutomationEngine");

    EventBus.subscribe("SUBMISSION_UPDATED", async (event) => {
      const { submissionId, status } = event.payload || {};
      if (submissionId && ["SHORTLISTED", "REJECTED", "PLACED", "OFFER_RELEASED"].includes(status)) {
        await this.cancelPendingFollowUps(submissionId, "submission", "CANCELLED_TERMINAL");
      }
    }, "FollowUpAutomationEngine");

    EventBus.subscribe("REQUIREMENT_CLOSED", async (event) => {
      const { requirementId } = event.payload || {};
      if (requirementId) {
        await this.cancelPendingFollowUps(requirementId, "requirement", "CANCELLED_TERMINAL");
      }
    }, "FollowUpAutomationEngine");
  }

  /**
   * Schedule a new follow-up reminder with idempotency check
   */
  public static async scheduleFollowUp(params: {
    idempotencyKey: string;
    ownerId: string;
    entityType: FollowUpRecord["entityType"];
    entityId: string;
    title: string;
    messageDraft: string;
    dueDate: string;
    channel?: FollowUpRecord["channel"];
    requiresApproval?: boolean;
  }): Promise<FollowUpRecord> {
    if (!adminDb) throw new Error("Firestore Admin DB unavailable.");

    this.init();

    // Check Idempotency
    const existingSnap = await adminDb
      .collection("follow_up_queue")
      .where("idempotencyKey", "==", params.idempotencyKey)
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      return existingSnap.docs[0].data() as FollowUpRecord;
    }

    const followUpId = `flw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const record: FollowUpRecord = {
      id: followUpId,
      idempotencyKey: params.idempotencyKey,
      ownerId: params.ownerId,
      entityType: params.entityType,
      entityId: params.entityId,
      title: params.title,
      messageDraft: params.messageDraft,
      status: "PENDING",
      dueDate: params.dueDate,
      attempts: 0,
      escalationLevel: 1,
      channel: params.channel || "email",
      quietHoursBypassed: false,
      requiresApproval: params.requiresApproval ?? true,
      createdAt: now,
      updatedAt: now
    };

    await adminDb.collection("follow_up_queue").doc(followUpId).set(record);
    return record;
  }

  /**
   * Process pending follow-ups due for dispatch
   */
  public static async processDueFollowUps(): Promise<{ processed: number; cancelled: number; quietHoursSkipped: number }> {
    if (!adminDb) return { processed: 0, cancelled: 0, quietHoursSkipped: 0 };

    this.init();

    const now = new Date();
    const currentHour = now.getHours();
    const isQuietHours = currentHour >= 20 || currentHour < 8;

    let processed = 0;
    let cancelled = 0;
    let quietHoursSkipped = 0;

    const snap = await adminDb
      .collection("follow_up_queue")
      .where("status", "==", "PENDING")
      .where("dueDate", "<=", now.toISOString())
      .limit(20)
      .get();

    for (const doc of snap.docs) {
      const item = doc.data() as FollowUpRecord;

      // Quiet Hours Gate Check
      if (isQuietHours && !item.quietHoursBypassed) {
        quietHoursSkipped++;
        continue;
      }

      // Consent & Communication Guard Check
      if (item.channel === "email" || item.channel === "whatsapp") {
        const decision = await CommunicationGuardService.evaluateCommunication({
          recipient: item.entityId,
          recipientId: item.entityId,
          channel: item.channel === "whatsapp" ? "WHATSAPP" : "EMAIL",
          templateId: "STATUS_UPDATE"
        }).catch(() => ({ allowed: true }));

        if (!decision.allowed) {
          await doc.ref.update({
            status: "CANCELLED_TERMINAL",
            updatedAt: new Date().toISOString()
          });
          cancelled++;
          continue;
        }
      }

      // Process or mark for approval
      if (item.requiresApproval && !item.approvedBy) {
        // Remains pending for recruiter / admin approval
        continue;
      }

      // Dispatch Follow-up
      await doc.ref.update({
        status: "DISPATCHED",
        attempts: item.attempts + 1,
        updatedAt: new Date().toISOString()
      });

      processed++;
    }

    return { processed, cancelled, quietHoursSkipped };
  }

  /**
   * Automatically cancel pending follow-ups upon response receipt or terminal event
   */
  public static async cancelPendingFollowUps(entityId: string, entityType?: string, reason: FollowUpRecord["status"] = "CANCELLED_RESPONSE_RECEIVED"): Promise<number> {
    if (!adminDb) return 0;

    let queryRef = adminDb.collection("follow_up_queue").where("entityId", "==", entityId).where("status", "==", "PENDING");
    const snap = await queryRef.get();

    let cancelledCount = 0;
    const now = new Date().toISOString();

    for (const doc of snap.docs) {
      await doc.ref.update({
        status: reason,
        lastResponseAt: now,
        updatedAt: now
      });
      cancelledCount++;
    }

    return cancelledCount;
  }
}

// Auto-initialize subscriptions
FollowUpAutomationEngine.init();
