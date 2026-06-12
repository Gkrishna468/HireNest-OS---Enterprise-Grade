import { IWorkflow } from './types/IWorkflow';
import { WorkflowContext } from './types/WorkflowContext';
import { WorkflowResult } from './types/WorkflowResult';
import { WorkflowStatus } from './types/WorkflowStatus';
import { ServiceProvider } from '../lib/providers/ServiceProvider';
import { EventTypes } from '../lib/events/EventTypes';

export class SubmissionWorkflow implements IWorkflow {
  name = 'SubmissionWorkflow';

  async execute(context: WorkflowContext): Promise<WorkflowResult> {
    try {
      if (context.triggerEvent === EventTypes.SUBMISSION_CREATED) {
        // Mocking Orchestration
        const { submissionId, candidateId, requirementId } = context.metadata;

        console.log(`[SubmissionWorkflow] Processing Submission Created: ${submissionId}`);

        // Call Service to get matching info or trigger AI (stubbed for now - orchestrational only)
        // const candidate = await ServiceProvider.candidateService.getCandidate(candidateId);
        // Do Matching...

        // Event emitting simulation
        await ServiceProvider.eventService.emitEvent(
          EventTypes.SUBMISSION_MATCHED,
          'SUBMISSION',
          submissionId,
          context.actorId || 'SYSTEM',
          'SYSTEM',
          { requirementId, candidateId }
        );
        
      }
      return {
        workflowId: context.workflowId,
        status: WorkflowStatus.COMPLETED,
        output: { result: 'Processed submission orchestration.' },
        completedAt: new Date()
      };
    } catch (e: any) {
      throw e;
    }
  }

  async compensate(context: WorkflowContext, error: any): Promise<WorkflowResult> {
    console.log(`[SubmissionWorkflow] Compensating submission failure: ${context.workflowId}`);
    return {
      workflowId: context.workflowId,
      status: WorkflowStatus.COMPENSATED,
      error: error?.message || 'Workflow compensation executed.',
      completedAt: new Date()
    };
  }
}
