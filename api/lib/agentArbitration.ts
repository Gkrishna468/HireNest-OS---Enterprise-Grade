import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Agent Arbitration Layer & Orchestration Engine (Phase 6)
 * Handles conflict resolution, duplicate writes, contradictory personas,
 * recursive loops, and orchestration collision mitigation.
 */

export interface ArbitrationRequest {
    agentId: string;
    targetResource: string;
    proposedAction: string;
    priorityWeight: number; // 0-100
    agentRole: "RecruiterAgent" | "GovernanceValidator" | "MemoryCurator" | "OrchestrationLayer";
}

export interface DistributedLock {
    lockedBy: string;
    weight: number;
    action: string;
    lockedAt: string;
    role: string;
}

export async function arbitrateAgentAction(request: ArbitrationRequest): Promise<{ approved: boolean, reason: string }> {
    if (!adminDb) return { approved: false, reason: "ADMIN_OFFLINE" };

    try {
        console.log(`[ARBITRATION] Agent ${request.agentId} (${request.agentRole}) requesting ${request.proposedAction} on ${request.targetResource} (Weight: ${request.priorityWeight})`);
        
        // Anti-recursion / Collision check: Look at recent arbitration history to prevent recursive loops
        const recentActionRef = adminDb.collection("arbitrationLogs").doc(`${request.agentId}_${request.targetResource}_${request.proposedAction}`);
        const recentDoc = await recentActionRef.get();
        if (recentDoc.exists) {
            const data = recentDoc.data();
            const timeSinceLast = Date.now() - new Date(data?.timestamp).getTime();
            if (timeSinceLast < 5000) { // Same action within 5 seconds -> recursive loop mitigation
                console.warn(`[ARBITRATION] Recursive loop detected for ${request.agentId}. Blocking.`);
                return { approved: false, reason: "RECURSIVE_LOOP_DETECTED" };
            }
        }

        // 1. Check for Active Locks on the resource
        const lockRef = adminDb.collection("arbitrationLocks").doc(request.targetResource);
        const lockDoc = await lockRef.get();
        
        if (lockDoc.exists) {
            const lockData = lockDoc.data() as DistributedLock;
            
            // Priority Arbitration Layer
            // Governance > Memory > Recruiter
             if (lockData.lockedBy !== request.agentId) {
                if (request.agentRole === "GovernanceValidator" && lockData.role !== "GovernanceValidator") {
                   // Governance can preempt recruiter
                   console.log(`[ARBITRATION] GovernanceValidator preempting lock from ${lockData.role}`);
                } else if (lockData.weight >= request.priorityWeight) {
                     return { approved: false, reason: "RESOURCE_LOCKED_BY_HIGHER_PRIORITY" };
                }
             }
        }
        
        // Grant temporary exclusive lock
        await lockRef.set({
            lockedBy: request.agentId,
            weight: request.priorityWeight,
            action: request.proposedAction,
            lockedAt: new Date().toISOString(),
            role: request.agentRole
        });
        
        // Log action to prevent recursion
        await recentActionRef.set({
            agentId: request.agentId,
            resource: request.targetResource,
            action: request.proposedAction,
            timestamp: new Date().toISOString()
        });

        return { approved: true, reason: "ARBITRATION_GRANTED" };
    } catch (err) {
        console.error("[ARBITRATION_ERR]", err);
        return { approved: false, reason: "ARBITRATION_FAULT" };
    }
}

