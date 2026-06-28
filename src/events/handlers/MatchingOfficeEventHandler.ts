import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';
import { MatchingOfficeService } from '../../api-lib/services/MatchingOfficeService';

export class MatchingOfficeEventHandler implements IEventHandler {
  public handlerId = 'MatchingOfficeEventHandler';

  public register(eventBus: IEventBus): void {
    // 1. Requirement Created -> Run Matching
    eventBus.subscribe(EventTypes.REQUIREMENT_CREATED, this.handlerId, async (event: EventEnvelope<any>) => {
      console.log(`[MatchingOfficeEventHandler] Reacting to REQUIREMENT_CREATED: ${event.payload.id || event.payload.requirementId}`);
      const requirementId = event.payload.id || event.payload.requirementId;
      if (requirementId) {
        await MatchingOfficeService.processRequirement(requirementId, event.tenantId);
      }
    });

    // 2. Requirement Updated -> Re-run Matching
    eventBus.subscribe(EventTypes.REQUIREMENT_UPDATED, this.handlerId, async (event: EventEnvelope<any>) => {
      console.log(`[MatchingOfficeEventHandler] Reacting to REQUIREMENT_UPDATED: ${event.payload.id || event.payload.requirementId}`);
      const requirementId = event.payload.id || event.payload.requirementId;
      if (requirementId) {
        await MatchingOfficeService.processRequirement(requirementId, event.tenantId);
      }
    });

    // 3. Candidate Created -> Run Matching
    eventBus.subscribe(EventTypes.CANDIDATE_CREATED, this.handlerId, async (event: EventEnvelope<any>) => {
      console.log(`[MatchingOfficeEventHandler] Reacting to CANDIDATE_CREATED: ${event.payload.id || event.payload.candidateId}`);
      const candidateId = event.payload.id || event.payload.candidateId;
      if (candidateId) {
        await MatchingOfficeService.processCandidate(candidateId, event.tenantId);
      }
    });

    // 4. Candidate Uploaded (Email ingestion fallback) -> Run Matching
    eventBus.subscribe(EventTypes.CANDIDATE_UPLOADED, this.handlerId, async (event: EventEnvelope<any>) => {
      console.log(`[MatchingOfficeEventHandler] Reacting to CANDIDATE_UPLOADED: ${event.payload.id || event.payload.candidateId}`);
      const candidateId = event.payload.id || event.payload.candidateId;
      if (candidateId) {
        await MatchingOfficeService.processCandidate(candidateId, event.tenantId);
      }
    });
  }
}
