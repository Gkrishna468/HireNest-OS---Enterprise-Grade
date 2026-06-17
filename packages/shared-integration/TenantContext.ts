export interface TenantContext {
  tenantId: string;
  organizationId: string;
  actorId?: string;
  traceId: string;
  correlationId?: string;
}
