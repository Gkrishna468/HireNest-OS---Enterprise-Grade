import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

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

export interface OAuthEventParams extends BaseTelemetry {
  provider: string;
  status: "success" | "failure";
  metadata?: Record<string, any>;
  severity: Severity;
  actorId?: string;
}

function hashError(message: string, stack?: string): string {
  const content = `${message}::${stack || ""}`;
  return crypto.createHash("sha256").update(content).digest("hex");
}

export class ObservabilityService {
  private db: FirebaseFirestore.Firestore;

  constructor(db?: FirebaseFirestore.Firestore) {
    this.db = db || getFirestore();
  }

  async logRuntimeError(params: RuntimeErrorParams) {
    const errorHash = hashError(params.message, params.stack);
    
    const doc = {
      tenantId: params.tenantId || "UNKNOWN",
      orgId: params.orgId || "UNKNOWN",
      traceId: params.traceId || null,
      correlationId: params.correlationId || null,
      sourceSystem: params.sourceSystem,
      actorId: params.actorId || null,
      errorHash,
      message: params.message,
      stackPreview: params.stack ? params.stack.substring(0, 500) : null,
      storageRef: params.storageRef || null,
      severity: params.severity,
      timestamp: new Date().toISOString(),
    };

    await this.db.collection("runtime_errors").add(doc);
    await this.incrementSystemHealth("runtimeErrors");
  }

  async logWorkflowFailure(params: WorkflowFailureParams) {
    const errorHash = hashError(params.failureReason, params.stack);

    const doc = {
      tenantId: params.tenantId || "UNKNOWN",
      orgId: params.orgId || "UNKNOWN",
      traceId: params.traceId || null,
      correlationId: params.correlationId || null,
      workflowId: params.workflowId,
      workflowType: params.workflowType,
      failureReason: params.failureReason,
      errorHash,
      severity: params.severity,
      timestamp: new Date().toISOString(),
    };

    await this.db.collection("workflow_failures").add(doc);
    await this.incrementSystemHealth("workflowFailures");
  }

  async logOAuthEvent(params: OAuthEventParams) {
    // Ensure no sensitive tokens are logged
    const safeMetadata = { ...params.metadata };
    delete safeMetadata.accessToken;
    delete safeMetadata.refreshToken;
    delete safeMetadata.clientSecret;
    delete safeMetadata.authorizationCode;

    const doc = {
      tenantId: params.tenantId || "UNKNOWN",
      orgId: params.orgId || "UNKNOWN",
      traceId: params.traceId || null,
      correlationId: params.correlationId || null,
      actorId: params.actorId || null,
      provider: params.provider,
      status: params.status,
      metadata: safeMetadata,
      severity: params.severity,
      timestamp: new Date().toISOString(),
    };

    await this.db.collection("oauth_events").add(doc);

    if (params.status === "success") {
      await this.incrementSystemHealth("oauthSuccesses");
    } else {
      await this.incrementSystemHealth("oauthFailures");
    }
  }

  async logSecurityEvent(params: BaseTelemetry & { action: string, resource: string, severity: Severity }) {
    const doc = {
      tenantId: params.tenantId || "UNKNOWN",
      orgId: params.orgId || "UNKNOWN",
      traceId: params.traceId || null,
      correlationId: params.correlationId || null,
      action: params.action,
      resource: params.resource,
      severity: params.severity,
      timestamp: new Date().toISOString(),
    };
    await this.db.collection("security_events").add(doc);
  }

  async incrementSystemHealth(
    metric: "oauthFailures" | "oauthSuccesses" | "workflowFailures" | "runtimeErrors" | "matchEngineRuns" | "eventBusBacklog" | "eventBusProcessed" | "matchOpportunitiesGenerated",
    amount: number = 1
  ) {
    const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const docRef = this.db.collection("system_health").doc(dateStr);

    try {
      await this.db.runTransaction(async (t) => {
        const doc = await t.get(docRef);
        if (!doc.exists) {
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
          const currentVal = doc.data()?.[metric] || 0;
          t.update(docRef, {
            [metric]: currentVal + amount,
            timestamp: new Date().toISOString(),
          });
        }
      });
    } catch (error) {
      console.error("Failed to increment system health metric", error);
    }
  }
}

// Export singleton instance
export const observabilityService = new ObservabilityService();
