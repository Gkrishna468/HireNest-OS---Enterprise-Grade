import { WorkflowContext } from './WorkflowContext';
import { WorkflowResult } from './WorkflowResult';

export interface IWorkflow {
  name: string;
  execute(context: WorkflowContext): Promise<WorkflowResult>;
  compensate(context: WorkflowContext, error: any): Promise<WorkflowResult>;
}
