import { adminDb } from '../../src/lib/firebase-admin.js';

/**
 * Consensus & Coordination Protocols
 * Implementation of distributed leases, quorum governance, and leadership election
 * for multi-agent arbitration and sharded infrastructure coordination.
 */

export interface DistributedLease {
    leaseId: string;
    resource: string;
    acquiredBy: string;
    termEpoch: number;
    expiresAt: string;
}

export async function acquireDistributedLease(nodeId: string, resource: string, ttlMs: number = 30000): Promise<boolean> {
    if (!adminDb) return false;
    
    const leaseId = `lease_${resource}`;
    const now = Date.now();
    
    try {
        const leaseRef = adminDb.collection("consensusLeases").doc(leaseId);
        
        await adminDb.runTransaction(async (t) => {
            const doc = await t.get(leaseRef);
            if (doc.exists) {
                const data = doc.data() as DistributedLease;
                const expires = new Date(data.expiresAt).getTime();
                if (expires > now && data.acquiredBy !== nodeId) {
                    throw new Error("LEASE_HELD_BY_OTHER_NODE");
                }
            }
            
            t.set(leaseRef, {
                leaseId,
                resource,
                acquiredBy: nodeId,
                termEpoch: doc.exists ? (doc.data()?.termEpoch || 0) + 1 : 1,
                acquiredAt: new Date(now).toISOString(),
                expiresAt: new Date(now + ttlMs).toISOString()
            });
        });
        
        console.log(`[CONSENSUS] Node ${nodeId} acquired lease on ${resource}`);
        return true;
    } catch (err) {
        console.warn(`[CONSENSUS] Lease acquisition failed for ${resource} by ${nodeId}: ${err}`);
        return false;
    }
}
