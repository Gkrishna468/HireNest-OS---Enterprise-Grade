import { EventTypes } from '../../lib/events/EventTypes';

export interface EventEnvelope<T> {
  id: string;
  type: string;
  timestamp: string;
  tenantId: string;
  actorId?: string;
  correlationId?: string;
  payload: T;
}
