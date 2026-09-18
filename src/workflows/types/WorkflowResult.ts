import { WorkflowStatus } from './WorkflowStatus.js';

export interface WorkflowResult {
  workflowId: string;
  status: WorkflowStatus;
  output?: Record<string, any>;
  error?: Error | string;
  completedAt: Date;
}
