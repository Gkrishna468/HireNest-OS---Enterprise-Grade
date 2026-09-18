import { WorkflowContext } from './WorkflowContext.js';
import { WorkflowResult } from './WorkflowResult.js';

export interface IWorkflow {
  name: string;
  execute(context: WorkflowContext): Promise<WorkflowResult>;
  compensate(context: WorkflowContext, error: any): Promise<WorkflowResult>;
}
