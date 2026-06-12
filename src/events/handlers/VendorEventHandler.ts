import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';

export class VendorEventHandler implements IEventHandler {
  handlerId = 'VendorEventHandler';

  register(eventBus: IEventBus): void {
    eventBus.subscribe(EventTypes.JOB_PUBLISHED, this.handlerId, this.handleJobPublished.bind(this));
  }

  private async handleJobPublished(event: EventEnvelope<any>): Promise<void> {
    console.log(`[VendorEventHandler] Processing JOB_PUBLISHED: ${event.id}`);
  }
}
