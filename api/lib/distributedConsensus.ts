import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Phase 8: Distributed Memory Consensus
 * Requires consensus across governance, confidence, and memory curator before writing L3 persona changes.
 */

export interface ConsensusRequest {
    tenantId: string;
    recruiterId: string;
    targetNodeId: string;
    proposedChange: string;
    confidence: number;
}

export async function requestL3PersonaMutation(request: ConsensusRequest): Promise<{ approved: boolean, reason: string }> {
    if (!adminDb) return { approved: false, reason: "ADMIN_DB_OFFLINE" };

    try {
        console.log(`[CONSENSUS] Evaluating L3 Persona Mutation for ${request.targetNodeId}...`);

        // 1. Confidence Threshold
        if (request.confidence < 0.85) {
            console.warn(`[CONSENSUS] Rejected: Confidence ${request.confidence} below 0.85 threshold.`);
            return { approved: false, reason: "LOW_CONFIDENCE" };
        }

        // 2. Memory Curator Confirmation
        const recentMemories = await adminDb.collection("cognitiveMemoryPyramid")
            .where("referenceId", "==", request.recruiterId)
            .where("layer", "in", ["L1_ATOM", "L2_SCENARIO"])
            .orderBy("createdAt", "desc")
            .limit(10)
            .get();

        if (recentMemories.empty) {
            console.warn(`[CONSENSUS] Rejected: Insufficient supporting memory lineage.`);
            return { approved: false, reason: "INSUFFICIENT_LINEAGE" };
        }

        // 3. Governance Approval (Simulated policy check)
        const inDrift = false; // Simulated check against Governance Engine
        if (inDrift) {
             console.warn(`[CONSENSUS] Rejected: Recruiter is in active persona drift.`);
             return { approved: false, reason: "ACTIVE_DRIFT" };
        }

        // Approved - log consensus
        await adminDb.collection("consensusLogs").add({
            ...request,
            approved: true,
            timestamp: new Date().toISOString()
        });

        console.log(`[CONSENSUS] ✅ L3 Persona Mutation Approved.`);
        return { approved: true, reason: "CONSENSUS_REACHED" };

    } catch (error) {
        console.error("[CONSENSUS] Error during evaluation:", error);
        return { approved: false, reason: "SYSTEM_ERROR" };
    }
}
