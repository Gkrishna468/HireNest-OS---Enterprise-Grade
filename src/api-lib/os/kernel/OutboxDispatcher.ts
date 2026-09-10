import { db } from "../../../lib/firebase-admin.js";
import { BusinessEvent } from "./RuntimeTypes.js";
import { EventBus } from "../../services/EventBus.js";

const MAX_RETRIES = 5;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;
const FIRESTORE_TIMEOUT_MS = 5000;

/**
 * Bounded timeout helper for Firestore operations to prevent 200s+ DEADLINE_EXCEEDED hangs
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  let timer: any;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`[OutboxDispatcher] Timeout of ${timeoutMs}ms exceeded for operation: ${operation}`));
      }, timeoutMs);
    })
  ]).finally(() => clearTimeout(timer));
}

export class OutboxDispatcher {
  private static isRunning = false;

  /**
   * Dispatches outbox events idempotently with bounded timeouts, exponential backoff,
   * and isolated error boundaries so normal application requests never hang.
   */
  static async dispatchOutbox(): Promise<void> {
    if (!db) return;

    // Concurrency guard: avoid overlapping outbox dispatches
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      await this.runDispatchCycle();
    } catch (cycleErr: any) {
      console.error(JSON.stringify({
        component: "OutboxDispatcher",
        action: "DISPATCH_CYCLE_ERROR",
        error: cycleErr.message || String(cycleErr),
        timestamp: new Date().toISOString()
      }));
    } finally {
      this.isRunning = false;
    }
  }

  private static async runDispatchCycle(): Promise<void> {
    if (!db) return;

    // 1. Fetch up to 25 PENDING and 25 FAILED_RETRYABLE events with bounded timeout
    const now = Date.now();
    let pendingSnap: any;
    let retryableSnap: any;

    try {
      [pendingSnap, retryableSnap] = await Promise.all([
        withTimeout(
          db.collection("outbox_events")
            .where("status", "==", "PENDING")
            .limit(25)
            .get(),
          FIRESTORE_TIMEOUT_MS,
          "fetchPendingOutboxEvents"
        ),
        withTimeout(
          db.collection("outbox_events")
            .where("status", "==", "FAILED_RETRYABLE")
            .limit(25)
            .get(),
          FIRESTORE_TIMEOUT_MS,
          "fetchRetryableOutboxEvents"
        ).catch(() => ({ docs: [] }))
      ]);
    } catch (fetchErr: any) {
      console.warn(JSON.stringify({
        component: "OutboxDispatcher",
        action: "FETCH_TIMEOUT_OR_ERROR",
        error: fetchErr.message || String(fetchErr),
        timestamp: new Date().toISOString()
      }));
      return;
    }

    const allDocs = [...(pendingSnap?.docs || []), ...(retryableSnap?.docs || [])];
    if (allDocs.length === 0) return;

    // Filter for docs that are eligible to run (respect nextRetryAt)
    const eligibleDocs = allDocs.filter(doc => {
      const data = doc.data();
      if (data.status === "FAILED_RETRYABLE" && data.nextRetryAt && data.nextRetryAt > now) {
        return false;
      }
      return true;
    });

    if (eligibleDocs.length === 0) return;

    // Sort in-memory by createdAt
    const sortedDocs = eligibleDocs.sort((a, b) => {
      const aTime = a.data().createdAt || "";
      const bTime = b.data().createdAt || "";
      return aTime.localeCompare(bTime);
    });

    // 2. Mark docs as PROCESSING in a bounded batch commit
    const batch = db.batch();
    for (const doc of sortedDocs) {
      batch.update(doc.ref, {
        status: "PROCESSING",
        processedAt: new Date().toISOString()
      });
    }

    try {
      await withTimeout(batch.commit(), FIRESTORE_TIMEOUT_MS, "batchUpdateToProcessing");
    } catch (batchErr: any) {
      console.warn(JSON.stringify({
        component: "OutboxDispatcher",
        action: "BATCH_COMMIT_TIMEOUT",
        error: batchErr.message || String(batchErr),
        affectedDocs: sortedDocs.length,
        timestamp: new Date().toISOString()
      }));
      return;
    }

    // 3. Process each event with isolated error handling and bounded backoff
    for (const doc of sortedDocs) {
      const data = doc.data();
      const currentRetries = Number(data.retryCount) || 0;

      try {
        if (!data.event) {
          throw new Error("Missing event payload in outbox document");
        }

        // Publish to event bus bypassing outbox to prevent infinite cycles
        await withTimeout(
          EventBus.publishInternal(data.event as BusinessEvent),
          FIRESTORE_TIMEOUT_MS,
          `publishInternal_${doc.id}`
        );

        // Mark as PUBLISHED idempotently
        await withTimeout(
          doc.ref.update({
            status: "PUBLISHED",
            publishedAt: new Date().toISOString(),
            retryCount: currentRetries
          }),
          FIRESTORE_TIMEOUT_MS,
          `updatePublished_${doc.id}`
        );
      } catch (err: any) {
        const nextRetries = currentRetries + 1;
        const isExhausted = nextRetries >= MAX_RETRIES;
        const backoffDelay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * Math.pow(2, nextRetries));
        const nextRetryAt = Date.now() + backoffDelay;

        const failurePayload = {
          component: "OutboxDispatcher",
          action: isExhausted ? "EVENT_DEAD_LETTER" : "EVENT_DISPATCH_RETRY_SCHEDULED",
          eventId: doc.id,
          error: err.message || String(err),
          retryCount: nextRetries,
          maxRetries: MAX_RETRIES,
          nextRetryAt: isExhausted ? null : new Date(nextRetryAt).toISOString(),
          timestamp: new Date().toISOString()
        };

        console.error(JSON.stringify(failurePayload));

        // Preserve outbox event: never delete, record error status and backoff
        try {
          await withTimeout(
            doc.ref.update({
              status: isExhausted ? "DEAD_LETTER" : "FAILED_RETRYABLE",
              error: err.message || String(err),
              failedAt: new Date().toISOString(),
              retryCount: nextRetries,
              nextRetryAt: isExhausted ? null : nextRetryAt
            }),
            FIRESTORE_TIMEOUT_MS,
            `updateFailure_${doc.id}`
          );
        } catch (updateErr: any) {
          console.error(JSON.stringify({
            component: "OutboxDispatcher",
            action: "FAILURE_STATUS_UPDATE_TIMEOUT",
            eventId: doc.id,
            error: updateErr.message || String(updateErr),
            timestamp: new Date().toISOString()
          }));
        }
      }
    }
  }
}
