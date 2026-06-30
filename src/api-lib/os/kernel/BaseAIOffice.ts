import { db } from "../../../lib/firebase-admin.js";
import {
  BusinessEvent,
  OfficeExecutionResult,
  OfficePolicy,
  OfficeLifecycleState,
} from "./RuntimeTypes.js";

export abstract class BaseAIOffice {
  abstract readonly name: string;
  abstract readonly policy: OfficePolicy;

  /**
   * Standard execution entrypoint.
   */
  async executeItem(
    inboxItemId: string,
    event: BusinessEvent,
  ): Promise<OfficeExecutionResult> {
    const workerId = `worker-${Math.random().toString(36).substring(7)}`;
    const tenantId = event.tenantId || "GLOBAL";
    const startTime = Date.now();
    const enqueuedTime = new Date(event.publishedAt || Date.now()).getTime();

    try {
      await this.updateLifecycleState("STARTING");

      if (!db) return { success: false, reason: "No DB" };

      // 1. Circuit Breaker
      const { CircuitBreaker } = await import("./CircuitBreaker.js");
      const circuit = await CircuitBreaker.checkCircuit(this.name);
      if (circuit.isOpen) {
        return {
          success: false,
          reason: circuit.reason,
          actionTaken: "CIRCUIT_OPEN",
        };
      }

      // 2. Governance
      const { AIGovernance } = await import("./AIGovernance.js");
      const govCheck = await AIGovernance.canExecute(
        this.name,
        this.policy,
        event,
      );
      if (!govCheck.allowed) {
        return {
          success: false,
          reason: govCheck.reason,
          actionTaken: "GOVERNANCE_REJECTED",
        };
      }

      // Priority 2: Idempotency Check
      const processRef = db
        .collection("event_processing")
        .doc(`${this.name}_${event.eventId}`);
      const processSnap = await processRef.get();
      if (processSnap.exists && processSnap.data()?.status === "COMPLETED") {
        return { success: true, actionTaken: "SKIPPED_IDEMPOTENT" };
      }

      // Priority 3: Distributed Queue Locking
      const lockRef = db
        .collection("office_locks")
        .doc(`${this.name}_${event.eventId}`);
      const lockSnap = await lockRef.get();
      if (lockSnap.exists) {
        const lockData = lockSnap.data();
        if (
          lockData &&
          lockData.expiresAt > Date.now() &&
          lockData.workerId !== workerId
        ) {
          return { success: false, reason: "LOCKED_BY_OTHER_WORKER" };
        }
      }

      // Acquire lock
      await lockRef.set({
        office: this.name,
        eventId: event.eventId,
        workerId,
        tenantId,
        acquiredAt: Date.now(),
        expiresAt: Date.now() + this.policy.maximumRuntimeMs,
      });

      await this.updateLifecycleState("PROCESSING");

      // Budget Check (estimated baseline cost)
      const { AIBudgetManager } = await import("./AIBudgetManager.js");
      const budgetCheck = await AIBudgetManager.checkBudget(this.name, 0.001);
      if (!budgetCheck.allowed) {
        // Fallback to deterministic might happen internally in the office, but here we can just pass a flag
        // For now, if no budget, we reject. A better approach is to let the office decide.
        // We'll proceed, but the office should check budget inside itself before calling ModelGateway.
      }

      // Load Memory
      const memory = await this.loadMemory(tenantId);

      // Decision Engine
      const shouldAct = await this.decisionEngine(event, memory);
      if (!shouldAct) {
        await this.writeTelemetry(
          event,
          "IGNORED",
          "Decision engine opted not to act",
          0,
          undefined,
          startTime,
          enqueuedTime,
          workerId,
        );
        await processRef.set({
          status: "COMPLETED",
          executedAt: new Date().toISOString(),
        });
        await lockRef.delete();
        await this.updateLifecycleState("IDLE");
        return { success: true, actionTaken: "IGNORED" };
      }

      // Execute
      const result = await this.execute(event, memory);

      // Save Memory
      await this.saveMemory(tenantId, memory);

      if (result.decisions && result.decisions.length > 0) {
        await this.logDecisions(result.decisions);
      }

      // Write Telemetry
      await this.writeTelemetry(
        event,
        result.success ? "COMPLETED" : "FAILED",
        result.reason || "Executed",
        result.tokensUsed || 0,
        result.model,
        startTime,
        enqueuedTime,
        workerId,
      );

      // Release lock and mark processed
      await lockRef.delete();
      if (result.success) {
        await CircuitBreaker.recordSuccess(this.name);
        await processRef.set({
          status: "COMPLETED",
          executedAt: new Date().toISOString(),
        });
        await this.updateLifecycleState("IDLE");

        // Deduct actual budget based on estimated cost, fallback if exact cost isn't passed
        if (budgetCheck.allowed && result.tokensUsed) {
          // Flash rough estimate
          const estCost = result.tokensUsed * (0.15 / 1000000); // mixed blend
          await AIBudgetManager.deductBudget(this.name, estCost);
        }
      } else {
        await CircuitBreaker.recordFailure(this.name);
        await this.handleFailure(
          event,
          result.reason || "Unknown error",
          workerId,
        );
      }

      return result;
    } catch (e: any) {
      console.error(`[${this.name}] Execution error:`, e);
      const { CircuitBreaker } = await import("./CircuitBreaker.js");
      await CircuitBreaker.recordFailure(this.name);
      await this.writeTelemetry(
        event,
        "ERROR",
        e.message,
        0,
        undefined,
        startTime,
        enqueuedTime,
        workerId,
      );
      await this.handleFailure(event, e.message, workerId, e.stack);

      // Try to release lock
      if (db) {
        try {
          await db
            .collection("office_locks")
            .doc(`${this.name}_${event.eventId}`)
            .delete();
        } catch (lockErr) {}
      }
      return { success: false, reason: e.message };
    }
  }

  private async handleFailure(
    event: BusinessEvent,
    errorMsg: string,
    workerId: string,
    stackTrace?: string,
  ) {
    await this.updateLifecycleState("FAILED");
    if (!db) return;

    const isPermanent = this.policy.permanentErrorTypes.some((t) =>
      errorMsg.includes(t),
    );
    const retryCount = event.retryCount || 0;

    if (isPermanent || retryCount >= this.policy.maxRetries) {
      // Priority 6: Dead Letter Queue
      await db.collection("dead_letter_events").add({
        originalEvent: event,
        office: this.name,
        workerId,
        tenantId: event.tenantId,
        stackTrace: stackTrace || "",
        retryCount,
        failureCategory: isPermanent ? "PERMANENT" : "EXHAUSTED_RETRIES",
        lastAttempt: new Date().toISOString(),
        correlationId: event.correlationId,
        error: errorMsg,
      });
    } else {
      // Re-enqueue for retry
      await this.updateLifecycleState("RETRYING");
      // Delay can be implemented via runAfter, here we just requeue with incremented count
      const delay = Math.min(
        this.policy.retryDelayMs *
          Math.pow(this.policy.backoffMultiplier, retryCount),
        this.policy.maximumDelayMs,
      );
      const runAfter = Date.now() + delay;

      await db.collection("office_inbox").add({
        office: this.name,
        eventId: event.eventId,
        eventType: event.eventType,
        status: "PENDING",
        enqueuedAt: new Date().toISOString(),
        priority: event.priority,
        tenantId: event.tenantId,
        retryCount: retryCount + 1,
        runAfter,
      });
    }
  }

  protected abstract decisionEngine(
    event: BusinessEvent,
    memory: any,
  ): Promise<boolean>;

  protected abstract execute(
    event: BusinessEvent,
    memory: any,
  ): Promise<OfficeExecutionResult>;

  protected async logDecisions(
    decisions: import("./RuntimeTypes.js").AIDecisionRecord[],
  ) {
    if (!db) return;
    const batch = db.batch();
    for (const decision of decisions) {
      const ref = db.collection("ai_decision_records").doc(decision.decisionId);
      batch.set(ref, decision);
    }
    await batch.commit();
  }

  protected async loadMemory(tenantId: string): Promise<any> {
    if (!db) return {};
    const memoryCollection = `${this.name.toLowerCase()}_memory`;
    const snap = await db.collection(memoryCollection).doc(tenantId).get();
    return snap.exists ? snap.data() : { version: 1 };
  }

  protected async saveMemory(tenantId: string, memory: any): Promise<void> {
    if (!db) return;
    const memoryCollection = `${this.name.toLowerCase()}_memory`;
    memory.lastUpdated = new Date().toISOString();
    await db
      .collection(memoryCollection)
      .doc(tenantId)
      .set(memory, { merge: true });
  }

  protected async updateLifecycleState(state: OfficeLifecycleState) {
    if (!db) return;
    await db.collection("office_status").doc(this.name).set(
      {
        state,
        lastUpdatedAt: new Date().toISOString(),
      },
      { merge: true },
    );
  }

  protected async writeTelemetry(
    event: BusinessEvent,
    status: string,
    reason: string,
    tokensUsed: number,
    model?: string,
    startTime?: number,
    enqueuedTime?: number,
    workerId?: string,
  ) {
    if (!db) return;
    const now = Date.now();
    const executionTimeMs = startTime ? now - startTime : 0;
    const queueWaitTimeMs = enqueuedTime
      ? (startTime || now) - enqueuedTime
      : 0;

    await db.collection("office_telemetry").add({
      office: this.name,
      workerId: workerId || "unknown",
      eventId: event.eventId,
      correlationId: event.correlationId,
      tenantId: event.tenantId,
      status,
      reason,
      tokensUsed,
      model: model || "none",
      executionTimeMs,
      queueWaitTimeMs,
      retries: event.retryCount || 0,
      executedAt: new Date().toISOString(),
    });
  }

  /**
   * Processes events in the `office_inbox` for this office
   */
  public async processQueue() {
    if (!db) return;

    const snap = await db
      .collection("office_inbox")
      .where("office", "==", this.name)
      .where("status", "==", "PENDING")
      .orderBy("enqueuedAt", "asc")
      .limit(10)
      .get();

    if (snap.empty) return;

    const now = Date.now();
    const validDocs = snap.docs.filter((doc) => {
      const data = doc.data();
      return !data.runAfter || data.runAfter <= now;
    });

    if (validDocs.length === 0) return;

    const batch = db.batch();
    const activeTasks = validDocs.map((doc) => {
      batch.update(doc.ref, {
        status: "PROCESSING",
        processedAt: new Date().toISOString(),
      });
      return { id: doc.id, data: doc.data(), ref: doc.ref };
    });
    await batch.commit();

    for (const task of activeTasks) {
      try {
        const eventDoc = await db
          .collection("business_events")
          .doc(task.data.eventId)
          .get();
        if (eventDoc.exists) {
          const event = eventDoc.data() as BusinessEvent;
          await this.executeItem(task.id, event);
        }
        await task.ref.update({ status: "COMPLETED" });
      } catch (e: any) {
        console.error(`[${this.name}] Error processing task ${task.id}`, e);
        await task.ref.update({ status: "FAILED", error: e.message });
      }
    }
  }
}
