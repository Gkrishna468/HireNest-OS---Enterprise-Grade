import { IEventBus } from './IEventBus.js';
import { LocalEventBus } from './LocalEventBus.js';

export class EventDispatcher {
  private static instance: IEventBus;

  public static getInstance(): IEventBus {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new LocalEventBus();
    }
    return EventDispatcher.instance;
  }
}
