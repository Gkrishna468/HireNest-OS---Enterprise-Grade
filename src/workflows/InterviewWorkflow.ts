import { IWorkflow } from './types/IWorkflow';
import { WorkflowContext } from './types/WorkflowContext';
import { WorkflowResult } from './types/WorkflowResult';
import { WorkflowStatus } from './types/WorkflowStatus';
import { ServiceProvider } from '../lib/providers/ServiceProvider';
import { EventTypes } from '../lib/events/EventTypes';

const ILLEGAL_TRANSITIONS: Record<string, string[]> = {
  'REJECTED': ['SCHEDULED', 'REQUESTED', 'INTERVIEW_REQUESTED'],
  'PASSED': ['FEEDBACK_PENDING', 'SCHEDULED'],
  'COMPLETED': ['REQUESTED', 'INTERVIEW_REQUESTED', 'SCHEDULING']
};

export class InterviewWorkflow implements IWorkflow {
  name = 'InterviewWorkflow';

  private validateTransition(currentStatus: string, newStatus: string): boolean {
     if (ILLEGAL_TRANSITIONS[currentStatus] && ILLEGAL_TRANSITIONS[currentStatus].includes(newStatus)) {
        return false;
     }
     return true;
  }

  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      // Validate Transitions
      const currentStatus = context.metadata?.currentStatus || '';
      const newStatus = context.metadata?.newStatus || '';
      if (currentStatus && newStatus && !this.validateTransition(currentStatus, newStatus)) {
         throw new Error(`Illegal state transition from ${currentStatus} to ${newStatus}`);
      }

      if (context.triggerEvent === EventTypes.INTERVIEW_REQUESTED) {
         console.log(`[InterviewWorkflow] Orchestrating INTERVIEW_REQUESTED: ${context.metadata.submissionId}`);
         
         // Dynamically create a deal room entry / message using the InterviewOrchestrator
         const { InterviewOrchestrator } = await import('../lib/workflows/InterviewOrchestrator');
         const req = {
            submissionId: context.metadata.submissionId,
            candidateId: context.metadata.candidateId || 'unknown',
            requirementId: context.metadata.requirementId || 'unknown',
            dealRoomId: context.metadata.dealRoomId || `DR-${context.metadata.submissionId}`,
            clientId: context.metadata.clientId || 'unknown',
            vendorId: context.metadata.vendorId || 'unknown',
            roundName: context.metadata.round || 'Initial Interview',
            interviewerName: context.metadata.interviewer,
            requestedDates: [context.metadata.date],
         };
         
         await InterviewOrchestrator.requestInterview(req);
         
      } else if (context.triggerEvent === EventTypes.INTERVIEW_SCHEDULED) {
         console.log(`[InterviewWorkflow] Orchestrating interview scheduled: ${context.metadata.interviewId}`);
         // Orchestrate scheduling specifics across Client and Candidate notifications
      } else if (context.triggerEvent === EventTypes.INTERVIEW_FEEDBACK_ADDED) {
         console.log(`[InterviewWorkflow] Orchestrating feedback capture: ${context.metadata.interviewId}`);
         // Example orchestration logic ...
      }

      return {
        workflowId: context.workflowId,
        status: WorkflowStatus.COMPLETED,
        completedAt: new Date()
      };
    } catch (e: any) {
      console.error(`[InterviewWorkflow] Error: ${e.message}`);
      throw e;
    }
  }

  async compensate(context: WorkflowContext, error: any): Promise<WorkflowResult> {
    console.log(`[InterviewWorkflow] Compensating error: ${error}`);
    return {
      workflowId: context.workflowId,
      status: WorkflowStatus.COMPENSATED,
      error,
      completedAt: new Date()
    };
  }
}

