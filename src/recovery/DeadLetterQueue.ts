import { TemporalContext } from '../temporal/config/temporalConfig';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface DLQEvent {
  workflowId: string;
  eventType: string;
  error: string;
  retries: number;
  tenantId?: string;
  payload: any;
  timestamp: number;
}

export const DeadLetterQueue = {
  async routeToDLQ(context: TemporalContext, eventType: string, error: Error, payload: any, retries: number): Promise<void> {
    console.error(`[DLQ] Routing failure for ${eventType} (Trace: ${context.traceId}) to DLQ. Error: ${error.message}`);
    
    try {
      await addDoc(collection(db, 'dlq_events'), {
        workflowId: context.workflowId,
        traceId: context.traceId,
        eventType,
        error: error.message,
        stack: error.stack,
        retries,
        tenantId: context.tenantId || null,
        payload: JSON.stringify(payload),
        timestamp: serverTimestamp()
      });
    } catch (e) {
      console.error('[DLQ] Critical failure: Unable to write to DLQ collection.', e);
    }
  }
};
