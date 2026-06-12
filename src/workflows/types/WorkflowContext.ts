export interface WorkflowContext {
  workflowId: string;
  triggerEvent: string;
  correlationId: string;
  metadata: Record<string, any>;
  tenantId?: string;
  actorId?: string;
  actorRole?: string;
  timestamp: Date;
}
