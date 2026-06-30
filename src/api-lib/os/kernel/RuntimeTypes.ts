export interface BusinessEvent {
  eventId: string;
  eventType: string;
  eventVersion: number;
  correlationId: string;
  causationId: string;
  entityType: string;
  entityId: string;
  tenantId: string;
  source: string;
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "BACKGROUND";
  createdAt: string;
  publishedAt: string;
  retryCount: number;
  traceId: string;
  payload: any;
  metadata: any;
  // Backwards compatible fields
  type: string;
  orgId?: string;
}

export interface OfficeCapability {
  name: string;
  description: string;
  parameters: any;
  latency: "LOW" | "MEDIUM" | "HIGH";
  cost: "LOW" | "MEDIUM" | "HIGH";
  version: string;
}

export interface OfficePolicy {
  supportedEvents: string[];
  capabilities?: OfficeCapability[];
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "BACKGROUND";
  concurrency: number;
  maximumRuntimeMs: number;
  dependencies: string[];
  maxRetries: number;
  retryDelayMs: number;
  backoffMultiplier: number;
  maximumDelayMs: number;
  retryableErrorTypes: string[];
  permanentErrorTypes: string[];
  healthCheckIntervalMs: number;
  heartbeatIntervalMs: number;
  governance?: OfficeGovernance;
  permissions?: OfficePermissions;
  sla?: OfficeSLA;
}

export interface OfficeSLA {
  maxLatencyMs: number;
  maxQueueDepth: number;
  fallbackAction: string; // e.g., 'Deterministic Matching'
}

export interface OfficeGovernance {
  maxHourlyExecutions: number;
  maxCostPerHour: number;
  businessHoursOnly: boolean;
}

export interface OfficePermissions {
  canRead: string[];
  canWrite: string[];
}

export interface PromptDefinition {
  promptId: string;
  version: string;
  content: string;
  model: string;
  temperature: number;
}

export type OfficeLifecycleState =
  | "STARTING"
  | "IDLE"
  | "PROCESSING"
  | "WAITING"
  | "RETRYING"
  | "DEGRADED"
  | "FAILED"
  | "STOPPED";

export interface AIDecisionRecord {
  decisionId: string;
  office: string;
  eventId: string;
  decision: string;
  confidence: number;
  reasoning: string[];
  evidence: any[];
  rulesApplied: string[];
  alternativeOptionsConsidered: string[];
  fallbackUsed: boolean;
  executionTimeMs: number;
  model: string;
  promptVersion: string;
  runtimeVersion: string; // e.g., 'v1.0'
  decisionEngineVersion: string; // e.g., 'v3.1'
  capabilityBrokerVersion: string; // e.g., 'v2.0'
  context: any;
  createdAt: string;
}

export interface OfficeExecutionResult {
  success: boolean;
  reason?: string;
  actionTaken?: string;
  tokensUsed?: number;
  model?: string;
  errorType?: string;
  errorStack?: string;
  decisions?: AIDecisionRecord[];
}

export type WorkflowState =
  | "PENDING"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "COMPENSATING"
  | "COMPENSATED";

export interface WorkflowInstance {
  workflowId: string;
  name: string;
  tenantId: string;
  entityId: string;
  entityType: string;
  state: WorkflowState;
  currentStepId: string;
  context: any;
  createdAt: string;
  updatedAt: string;
  correlationId: string;
}

export interface WorkflowStep {
  stepId: string;
  workflowId: string;
  name: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "COMPENSATED";
  office?: string;
  humanTaskRequired?: boolean;
  compensatingAction?: string; // event type to trigger for compensation
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface HumanTask {
  taskId: string;
  workflowId: string;
  stepId: string;
  tenantId: string;
  assignedTo: string; // role or userId
  dueDate?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "ESCALATED";
  context: any;
  createdAt: string;
  resolvedAt?: string;
}
