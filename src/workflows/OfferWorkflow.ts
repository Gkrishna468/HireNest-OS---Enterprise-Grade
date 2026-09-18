import { IWorkflow } from './types/IWorkflow.js';
import { WorkflowContext } from './types/WorkflowContext.js';
import { WorkflowResult } from './types/WorkflowResult.js';
import { WorkflowStatus } from './types/WorkflowStatus.js';
import { EventTypes } from '../lib/events/EventTypes.js';

export class OfferWorkflow implements IWorkflow {
  name = 'OfferWorkflow';

  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      if (context.triggerEvent === EventTypes.OFFER_STATUS_UPDATED) {
         console.log(`[OfferWorkflow] Processing offer status update...`);
      } else if (context.triggerEvent === EventTypes.JOINING_STATUS_UPDATED) {
         console.log(`[OfferWorkflow] Processing joining status update...`);
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
