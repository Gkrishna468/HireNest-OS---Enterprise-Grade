import { IEventBus } from './IEventBus';

export interface IEventHandler {
  handlerId: string;
  register(eventBus: IEventBus): void;
}

export class EventHandlerRegistry {
  private static instance: EventHandlerRegistry;
  private handlers: IEventHandler[] = [];
  
  private constructor() {}

  public static getInstance(): EventHandlerRegistry {
    if (!EventHandlerRegistry.instance) {
      EventHandlerRegistry.instance = new EventHandlerRegistry();
    }
    return EventHandlerRegistry.instance;
  }

  public registerHandler(eventBus: IEventBus, handler: IEventHandler) {
    this.handlers.push(handler);
    handler.register(eventBus);
    console.log(`[EventHandlerRegistry] Registered handler: ${handler.handlerId}`);
  }
}
