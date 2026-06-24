import { db } from "./firebase";
import { collection, addDoc, doc, setDoc, getDoc, runTransaction } from "firebase/firestore";

export type Severity = "INFO" | "WARN" | "ERROR" | "CRITICAL";

export interface BaseTelemetry {
  tenantId?: string;
  orgId?: string;
  traceId?: string;
  correlationId?: string;
}

export interface RuntimeErrorParams extends BaseTelemetry {
  sourceSystem: string;
  actorId?: string;
  message: string;
  stack?: string;
  storageRef?: string;
  severity: Severity;
}

export interface WorkflowFailureParams extends BaseTelemetry {
  workflowId: string;
  workflowType: string;
  failureReason: string;
  stack?: string;
  severity: Severity;
}

export class FrontendTelemetry {
  async logRuntimeError(params: RuntimeErrorParams) {
    try {
      const docData = {
        tenantId: params.tenantId || "UNKNOWN",
        orgId: params.orgId || "UNKNOWN",
        traceId: params.traceId || null,
        correlationId: params.correlationId || null,
        sourceSystem: params.sourceSystem,
        actorId: params.actorId || null,
        message: params.message,
        stackPreview: params.stack ? params.stack.substring(0, 500) : null,
        storageRef: params.storageRef || null,
        severity: params.severity,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, "runtime_errors"), docData);
      await this.incrementSystemHealth("runtimeErrors");
    } catch (e) {
      console.warn("Telemetry log failure:", e);
    }
  }

  async logWorkflowFailure(params: WorkflowFailureParams) {
    try {
      const docData = {
        tenantId: params.tenantId || "UNKNOWN",
        orgId: params.orgId || "UNKNOWN",
        traceId: params.traceId || null,
        correlationId: params.correlationId || null,
        workflowId: params.workflowId,
        workflowType: params.workflowType,
        failureReason: params.failureReason,
        severity: params.severity,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, "workflow_failures"), docData);
      await this.incrementSystemHealth("workflowFailures");
    } catch (e) {
      console.warn("Telemetry log failure:", e);
    }
  }

  async incrementSystemHealth(
    metric: "oauthFailures" | "oauthSuccesses" | "workflowFailures" | "runtimeErrors" | "matchEngineRuns" | "eventBusBacklog" | "eventBusProcessed" | "matchOpportunitiesGenerated",
    amount: number = 1
  ) {
    try {
      const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const docRef = doc(db, "system_health", dateStr);
      await runTransaction(db, async (t) => {
        const docSnap = await t.get(docRef);
        if (!docSnap.exists()) {
          t.set(docRef, {
            id: dateStr,
            oauthFailures: 0,
            oauthSuccesses: 0,
            workflowFailures: 0,
            runtimeErrors: 0,
            matchEngineRuns: 0,
            eventBusBacklog: 0,
            eventBusProcessed: 0,
            matchOpportunitiesGenerated: 0,
            timestamp: new Date().toISOString(),
            [metric]: amount,
          });
        } else {
          const currentVal = docSnap.data()?.[metric] || 0;
          t.update(docRef, {
            [metric]: currentVal + amount,
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (e) {
      console.warn("Failed to increment system health metric", e);
    }
  }
}

export const frontendTelemetry = new FrontendTelemetry();
