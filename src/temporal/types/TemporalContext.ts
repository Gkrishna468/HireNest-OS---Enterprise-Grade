export interface TemporalContext {
  traceId: string;
  correlationId: string;
  workflowId: string;
  tenantId: string;
  actorId?: string;
  requestId?: string;
}
