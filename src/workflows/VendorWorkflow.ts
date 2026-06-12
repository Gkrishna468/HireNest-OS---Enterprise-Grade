import { IWorkflow } from './types/IWorkflow';
import { WorkflowContext } from './types/WorkflowContext';
import { WorkflowResult } from './types/WorkflowResult';
import { WorkflowStatus } from './types/WorkflowStatus';
import { EventTypes } from '../lib/events/EventTypes';

export class VendorWorkflow implements IWorkflow {
  name = 'VendorWorkflow';

  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      if (context.triggerEvent === EventTypes.JOB_PUBLISHED) {
         console.log(`[VendorWorkflow] Routing job notification to vendors`);
      }
      return {
        workflowId: context.workflowId,
        status: WorkflowStatus.COMPLETED,
        completedAt: new Date()
      };
    } catch (e) {
      throw e;
    }
  }

  async compensate(context: WorkflowContext, error: any): Promise<WorkflowResult> {
    return {
      workflowId: context.workflowId,
      status: WorkflowStatus.COMPENSATED,
      error,
      completedAt: new Date()
    };
  }
}
