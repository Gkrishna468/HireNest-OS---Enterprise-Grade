import { IEventBus } from '../IEventBus.js';
import { IEventHandler } from '../EventHandlerRegistry.js';
import { EventEnvelope } from '../types/EventEnvelope.js';
import { EventTypes } from '../../lib/events/EventTypes.js';

export class SubmissionEventHandler implements IEventHandler {
  handlerId = 'SubmissionEventHandler';

  register(eventBus: IEventBus): void {
    eventBus.subscribe(EventTypes.SUBMISSION_CREATED, this.handlerId, this.handleSubmissionCreated.bind(this));
    eventBus.subscribe(EventTypes.SUBMISSION_MATCHED, this.handlerId, this.handleSubmissionMatched.bind(this));
    eventBus.subscribe(EventTypes.SUBMISSION_ARCHIVED, this.handlerId, this.handleSubmissionArchived.bind(this));
  }

  private async handleSubmissionCreated(event: EventEnvelope<any>): Promise<void> {
    console.log(`[SubmissionEventHandler] Processing SUBMISSION_CREATED: ${event.id}`);
  }

  private async handleSubmissionMatched(event: EventEnvelope<any>): Promise<void> {
    console.log(`[SubmissionEventHandler] Processing SUBMISSION_MATCHED: ${event.id}`);
  }

  private async handleSubmissionArchived(event: EventEnvelope<any>): Promise<void> {
    console.log(`[SubmissionEventHandler] Processing SUBMISSION_ARCHIVED: ${event.id}`);
    const submissionId = event.payload.submissionId;
    if (!submissionId) return;
    
    // Update DealRoom status to CLOSED
    try {
      const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase.js');
      await updateDoc(doc(db, "dealRooms", `DR-${submissionId}`), {
        status: "CLOSED",
        updatedAt: serverTimestamp()
      });
      console.log(`[SubmissionEventHandler] Closed Deal Room DR-${submissionId}`);
    } catch (err: any) {
      console.warn(`[SubmissionEventHandler] Deal room could not be closed (might not exist): ${err.message}`);
    }
  }
}
