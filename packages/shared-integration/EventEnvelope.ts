import { EventType, EventPayload } from './EventTypes';
import { TenantContext } from './TenantContext';

export interface EventEnvelope {
  id: string; // Unique event ID
  type: EventType;
  timestamp: number;
  payload: EventPayload;
  context: TenantContext;
}
