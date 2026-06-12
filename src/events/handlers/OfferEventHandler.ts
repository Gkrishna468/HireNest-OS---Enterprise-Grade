import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';

export class OfferEventHandler implements IEventHandler {
  handlerId = 'OfferEventHandler';

  register(eventBus: IEventBus): void {
    eventBus.subscribe(EventTypes.OFFER_STATUS_UPDATED, this.handlerId, this.handleOfferStatusUpdated.bind(this));
    eventBus.subscribe(EventTypes.JOINING_STATUS_UPDATED, this.handlerId, this.handleJoiningStatusUpdated.bind(this));
  }

  private async handleOfferStatusUpdated(event: EventEnvelope<any>): Promise<void> {
    console.log(`[OfferEventHandler] Processing OFFER_STATUS_UPDATED: ${event.id}`);
  }

  private async handleJoiningStatusUpdated(event: EventEnvelope<any>): Promise<void> {
    console.log(`[OfferEventHandler] Processing JOINING_STATUS_UPDATED: ${event.id}`);
  }
}
