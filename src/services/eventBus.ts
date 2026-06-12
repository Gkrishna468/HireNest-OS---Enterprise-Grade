import { ServiceProvider } from "../lib/providers/ServiceProvider";
import { EventTypes } from "../lib/events/EventTypes";

export type EventType = keyof typeof EventTypes;

export async function emitEvent(
  type: string,
  entityType: 'CANDIDATE' | 'JOB' | 'SUBMISSION' | 'DEAL_ROOM' | 'VENDOR' | 'SYSTEM',
  entityId: string,
  actorId: string,
  actorRole: string,
  metadata: Record<string, any> = {}
) {
  return ServiceProvider.eventService.emitEvent(type, entityType, entityId, actorId, actorRole, metadata);
}

export function subscribeToEvents(
  callback: (events: any[]) => void, 
  limitCount = 50,
  orgId?: string,
  role?: string
) {
  return ServiceProvider.eventService.subscribeToEvents(callback, limitCount, orgId, role);
}
