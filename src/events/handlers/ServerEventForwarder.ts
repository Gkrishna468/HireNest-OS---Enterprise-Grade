import { IEventBus } from '../IEventBus';
import { IEventHandler } from '../EventHandlerRegistry';
import { EventEnvelope } from '../types/EventEnvelope';
import { EventTypes } from '../../lib/events/EventTypes';

/**
 * ServerEventForwarder bridges specific client-side events to the backend Business Event Bus.
 */
export class ServerEventForwarder implements IEventHandler {
  handlerId = 'ServerEventForwarder';

  register(eventBus: IEventBus): void {
    // List of events that should be persisted and handled by the backend Offices
    const eventsToForward = [
      EventTypes.INTERVIEW_REQUESTED,
      EventTypes.INTERVIEW_SCHEDULED,
      EventTypes.SUBMISSION_CREATED,
      EventTypes.CANDIDATE_UPLOADED
    ];

    eventsToForward.forEach(type => {
      eventBus.subscribe(type, this.handlerId, this.forwardToServer.bind(this));
    });
  }

  private async forwardToServer(event: EventEnvelope<any>): Promise<void> {
    console.log(`[ServerEventForwarder] Forwarding event to server: ${event.type}`);
    
    try {
      const response = await fetch('/api/events/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: event.type,
          payload: event.payload,
          source: 'CLIENT_UI',
          orgId: event.tenantId || 'GLOBAL'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish event to server');
      }

      const result = await response.json();
      console.log(`[ServerEventForwarder] Event published to server event bus. ID: ${result.eventId}`);
    } catch (err) {
      console.error('[ServerEventForwarder] Failed to forward event:', err);
    }
  }
}
