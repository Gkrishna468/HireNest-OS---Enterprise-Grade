export interface NotificationEvent {
  type: "info" | "warning" | "success" | "urgent";
  title: string;
  message: string;
  actionUrl?: string;
  recipients: string[];
}

export interface IEventService {
  publishEvent(event: NotificationEvent): Promise<void>;
  
  emitEvent(
    type: string,
    entityType: 'CANDIDATE' | 'JOB' | 'SUBMISSION' | 'DEAL_ROOM' | 'VENDOR' | 'SYSTEM',
    entityId: string,
    actorId: string,
    actorRole: string,
    metadata?: Record<string, any>
  ): Promise<void>;
  
  subscribeToEvents(
    callback: (events: any[]) => void, 
    limitCount?: number,
    orgId?: string,
    role?: string
  ): () => void;
}
