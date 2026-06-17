import { TemporalContext } from '../../temporal/config/temporalConfig';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface ApprovalRequest {
  targetEntityId: string;
  targetEntityType: string;
  proposedAction: string;
  payload: any;
  reasoning: string;
}

/**
 * AI Agents cannot bypass human-in-the-loop for state mutations.
 * They must route actions through the ApprovalEngine.
 */
export class ApprovalEngine {
  static async requestHumanApproval(context: TemporalContext, request: ApprovalRequest): Promise<void> {
    console.log(`[ApprovalEngine] AI Agent requesting approval for ${request.proposedAction} on ${request.targetEntityId}`);
    
    try {
      await addDoc(collection(db, 'approvals_queue'), {
        workflowId: context.workflowId,
        actorId: context.actorId, // e.g. system:ai-agent:recruiter
        tenantId: context.tenantId || null,
        status: 'PENDING_APPROVAL',
        targetEntityId: request.targetEntityId,
        targetEntityType: request.targetEntityType,
        proposedAction: request.proposedAction,
        payload: JSON.stringify(request.payload),
        reasoning: request.reasoning,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error('[ApprovalEngine] Failed to route to approval queue', e);
      throw e;
    }
  }
}
