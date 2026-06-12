import { IEventBus } from './IEventBus';
import { LocalEventBus } from './LocalEventBus';

export class EventDispatcher {
  private static instance: IEventBus;

  public static getInstance(): IEventBus {
    if (!EventDispatcher.instance) {
      EventDispatcher.instance = new LocalEventBus();
    }
    return EventDispatcher.instance;
  }
}
