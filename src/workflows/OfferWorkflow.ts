import { IWorkflow } from './types/IWorkflow';
import { WorkflowContext } from './types/WorkflowContext';
import { WorkflowResult } from './types/WorkflowResult';
import { WorkflowStatus } from './types/WorkflowStatus';
import { EventTypes } from '../lib/events/EventTypes';

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
