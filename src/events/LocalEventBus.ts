import { IEventBus } from './IEventBus';
import { EventEnvelope } from './types/EventEnvelope';

export class LocalEventBus implements IEventBus {
  private handlers: Map<string, Map<string, (event: EventEnvelope<any>) => Promise<void>>> = new Map();

  async publish<T>(event: EventEnvelope<T>): Promise<void> {
    const eventHandlers = this.handlers.get(event.type);
    if (!eventHandlers) return;

    const promises = Array.from(eventHandlers.values()).map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[LocalEventBus] Error in handler for event ${event.type}:`, err);
        // Retries and DLQ logic for Phase 5 distributed tracking
      }
    });

    await Promise.allSettled(promises);
  }

  subscribe<T>(eventType: string, handlerId: string, callback: (event: EventEnvelope<T>) => Promise<void>): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Map());
    }
    this.handlers.get(eventType)!.set(handlerId, callback);
  }

  unsubscribe(eventType: string, handlerId: string): void {
    const eventHandlers = this.handlers.get(eventType);
    if (eventHandlers) {
      eventHandlers.delete(handlerId);
    }
  }
}
