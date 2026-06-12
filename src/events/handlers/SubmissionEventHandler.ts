import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';

export class SubmissionEventHandler implements IEventHandler {
  handlerId = 'SubmissionEventHandler';

  register(eventBus: IEventBus): void {
    eventBus.subscribe(EventTypes.SUBMISSION_CREATED, this.handlerId, this.handleSubmissionCreated.bind(this));
    eventBus.subscribe(EventTypes.SUBMISSION_MATCHED, this.handlerId, this.handleSubmissionMatched.bind(this));
  }

  private async handleSubmissionCreated(event: EventEnvelope<any>): Promise<void> {
    console.log(`[SubmissionEventHandler] Processing SUBMISSION_CREATED: ${event.id}`);
  }

  private async handleSubmissionMatched(event: EventEnvelope<any>): Promise<void> {
    console.log(`[SubmissionEventHandler] Processing SUBMISSION_MATCHED: ${event.id}`);
  }
}
