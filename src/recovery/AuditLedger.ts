import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { TemporalContext } from '../temporal/config/temporalConfig';

export interface AuditEntry {
  traceId: string;
  workflowId: string;
  actorId: string;
  tenantId?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: any;
}

export class AuditLedger {
  static async log(context: TemporalContext, action: string, entityType: string, entityId: string, changes: any): Promise<void> {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        traceId: context.traceId,
        workflowId: context.workflowId,
        actorId: context.actorId,
        tenantId: context.tenantId || null,
        action,
        entityType,
        entityId,
        changes: JSON.stringify(changes),
        timestamp: serverTimestamp()
      });
      console.log(`[AuditLedger] Logged ${action} on ${entityType}/${entityId} by ${context.actorId}`);
    } catch (e) {
      console.error('[AuditLedger] Failed to write audit log', e);
    }
  }
}
