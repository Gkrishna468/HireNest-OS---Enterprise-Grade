import { EventEnvelope } from './types/EventEnvelope';

export interface IEventBus {
  publish<T>(event: EventEnvelope<T>): Promise<void>;
  subscribe<T>(eventType: string, handlerId: string, callback: (event: EventEnvelope<T>) => Promise<void>): void;
  unsubscribe(eventType: string, handlerId: string): void;
}
