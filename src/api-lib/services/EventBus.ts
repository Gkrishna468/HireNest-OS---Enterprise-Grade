type EventHandler = (data: any) => void;

export class EventBus {
  private static instance: EventBus;
  private status: "running" | "stopped" = "stopped";
  private handlers: Map<string, EventHandler[]> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public start(): void {
    this.status = "running";
    console.log("Event Bus started successfully.");
  }

  public stop(): void {
    this.status = "stopped";
    this.handlers.clear();
    console.log("Event Bus stopped.");
  }

  public getStatus(): "running" | "stopped" {
    return this.status;
  }

  public publish(event: string, data: any): void {
    if (this.status !== "running") {
      console.warn(`Event Bus is not running. Event '${event}' was ignored.`);
      return;
    }
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(data);
        } catch (err) {
          console.error(`Error handling event '${event}':`, err);
        }
      });
    }
  }

  public subscribe(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);

    return () => {
      const eventHandlers = this.handlers.get(event);
      if (eventHandlers) {
        this.handlers.set(
          event,
          eventHandlers.filter((h) => h !== handler)
        );
      }
    };
  }
}
