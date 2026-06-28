import { BusinessEvent } from "../../types.ts";

export class EventBus {
  private static instance: EventBus | null = null;
  private listeners: ((event: BusinessEvent) => void)[] = [];

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public subscribe(listener: (event: BusinessEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public publish(event: BusinessEvent): void {
    console.log(`[EventBus] Publishing event ${event.type}:`, event);
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (err) {
        console.error("[EventBus] Listener error:", err);
      }
    });
  }
}
