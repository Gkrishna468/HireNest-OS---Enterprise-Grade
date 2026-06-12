import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';

export class InterviewEventHandler implements IEventHandler {
  handlerId = 'InterviewEventHandler';

  register(eventBus: IEventBus): void {
    eventBus.subscribe(EventTypes.INTERVIEW_REQUESTED, this.handlerId, this.handleInterviewRequested.bind(this));
    eventBus.subscribe(EventTypes.INTERVIEW_SCHEDULED, this.handlerId, this.handleInterviewScheduled.bind(this));
    eventBus.subscribe(EventTypes.INTERVIEW_FEEDBACK_ADDED, this.handlerId, this.handleFeedbackAdded.bind(this));
  }

  private async handleInterviewRequested(event: EventEnvelope<any>): Promise<void> {
    console.log(`[InterviewEventHandler] Processing INTERVIEW_REQUESTED: ${event.id}`);
    
    // Instead of directly calling DealRoomWorkflow, we can trigger the global WorkflowRegistry
    const { WorkflowRegistry } = await import('../../workflows/WorkflowRegistry');
    const registry = WorkflowRegistry.getInstance();
    
    await registry.dispatch({
       workflowId: `wf_${Date.now()}`,
       triggerEvent: EventTypes.INTERVIEW_REQUESTED,
       correlationId: event.payload.submissionId,
       metadata: event.payload,
       timestamp: new Date()
    });
  }

  private async handleInterviewScheduled(event: EventEnvelope<any>): Promise<void> {
    console.log(`[InterviewEventHandler] Processing INTERVIEW_SCHEDULED: ${event.id}`);
  }

  private async handleFeedbackAdded(event: EventEnvelope<any>): Promise<void> {
    console.log(`[InterviewEventHandler] Processing INTERVIEW_FEEDBACK_ADDED: ${event.id}`);
  }
}
