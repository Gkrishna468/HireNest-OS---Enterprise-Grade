import { EventType, EventPayload } from './EventTypes.js';
import { TenantContext } from './TenantContext.js';

export interface EventEnvelope {
  id: string; // Unique event ID
  type: EventType;
  timestamp: number;
  payload: EventPayload;
  context: TenantContext;
}
