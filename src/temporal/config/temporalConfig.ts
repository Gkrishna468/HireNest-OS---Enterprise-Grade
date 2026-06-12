export const TemporalConfig = {
  // Connection Configuration
  address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  namespace: process.env.TEMPORAL_NAMESPACE || 'default',
  
  // Task Queues
  taskQueues: {
    INTERVIEW: 'interview-task-queue',
    SUBMISSION: 'submission-task-queue',
    SLA: 'sla-task-queue',
    DEFAULT: 'default-task-queue'
  },

  // Retries and timeouts
  defaultRetryPolicy: {
    initialInterval: '1s',
    backoffCoefficient: 2.0,
    maximumInterval: '100s',
    maximumAttempts: 3,
  }
};

export interface TemporalContext {
  traceId: string;
  correlationId?: string;
  workflowId: string;
  tenantId?: string;
  actorId: string;
  requestId?: string;
  timestamp: number;
}
