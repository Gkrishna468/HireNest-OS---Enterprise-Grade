import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';
import { AnalyticsService } from '../../services/AnalyticsService';

export class AnalyticsEventHandler implements IEventHandler {
  handlerId = 'AnalyticsEventHandler';

  register(eventBus: IEventBus): void {
    eventBus.subscribe(EventTypes.SUBMISSION_CREATED, this.handlerId, this.handleEvent.bind(this));
    eventBus.subscribe(EventTypes.INTERVIEW_SCHEDULED, this.handlerId, this.handleEvent.bind(this));
    // We listen to a wildcard of placement closure to ensure operational counts are updated
    eventBus.subscribe('PLACEMENT_CLOSED' as any, this.handlerId, this.handleEvent.bind(this));
    eventBus.subscribe('CANDIDATE_REJECTED' as any, this.handlerId, this.handleEvent.bind(this));
    eventBus.subscribe('SUBMISSION_ADVANCED' as any, this.handlerId, this.handleEvent.bind(this));
  }

  private async handleEvent(event: EventEnvelope<any>): Promise<void> {
    console.log(`[AnalyticsEventHandler] Processing event for analytics: ${event.type}`);
    
    // Log operational event
    await AnalyticsService.logOperationalEvent(event.tenantId, event.type, event.payload);

    // AI Learning Signal detection
    if (event.type === 'CANDIDATE_REJECTED' || event.type === 'SUBMISSION_ADVANCED') {
       const { submissionId, candidateId, requirementId, matchScore } = event.payload;
       
       if (candidateId && requirementId) {
          await AnalyticsService.logAILearningSignal(
            candidateId, 
            requirementId, 
            event.payload.previousStatus || 'UNKNOWN',
            event.payload.newStatus || 'UNKNOWN',
            event.type === 'CANDIDATE_REJECTED' ? 'REJECTED' : 'ADVANCED',
            matchScore || 0
          );
       }
    }
  }
}
