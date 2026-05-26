import { adminDb } from '../lib/firebase-admin.js';

/**
 * Agent Arbitration Layer
 * Handles conflict resolution, priority arbitration, and execution governance
 * between autonomous AI agents operating in the same workspace.
 */

export interface ArbitrationRequest {
    agentId: string;
    targetResource: string;
    proposedAction: string;
    priorityWeight: number; // 0-100
}

export async function arbitrateAgentAction(request: ArbitrationRequest): Promise<{ approved: boolean, reason: string }> {
    if (!adminDb) return { approved: false, reason: "ADMIN_OFFLINE" };

    try {
        console.log(`[ARBITRATION] Agent ${request.agentId} requesting ${request.proposedAction} on ${request.targetResource} (Weight: ${request.priorityWeight})`);
        
        // 1. Check for Active Locks on the resource
        const lockRef = adminDb.collection("arbitrationLocks").doc(request.targetResource);
        const lockDoc = await lockRef.get();
        
        if (lockDoc.exists) {
            const lockData = lockDoc.data();
            if (lockData?.lockedBy !== request.agentId && lockData?.weight >= request.priorityWeight) {
                 return { approved: false, reason: "RESOURCE_LOCKED_BY_HIGHER_PRIORITY" };
            }
        }
        
        // 2. Grant temporary exclusive lock
        await lockRef.set({
            lockedBy: request.agentId,
            weight: request.priorityWeight,
            action: request.proposedAction,
            lockedAt: new Date().toISOString()
        });

        return { approved: true, reason: "ARBITRATION_GRANTED" };
    } catch (err) {
        console.error("[ARBITRATION_ERR]", err);
        return { approved: false, reason: "ARBITRATION_FAULT" };
    }
}
