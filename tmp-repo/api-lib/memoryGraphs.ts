import { adminDb } from "../src/lib/firebase-admin";

/**
 * Persistent Agent Memory Graphs
 * Long-horizon episodic execution recall and semantic operational memory.
 */

export interface MemoryNode {
    nodeId: string;
    type: "EPISODE" | "SEMANTIC" | "RULE";
    content: string;
    associations: string[]; // Edge pointers
    confidence: number;
}

export async function storeMemoryEpidsode(agentId: string, node: Omit<MemoryNode, "nodeId">): Promise<string | null> {
    if (!adminDb) return null;
    
    const nodeId = `mem_${agentId}_${Date.now()}`;
    try {
        await adminDb.collection("cognitiveMemoryGraphs").doc(nodeId).set({
            nodeId,
            agentId,
            ...node,
            createdAt: new Date().toISOString()
        });
        
        console.log(`[COGNITION] Stored ${node.type} memory episode for agent ${agentId}: ${nodeId}`);
        return nodeId;
    } catch(err) {
        console.error("[COGNITION_ERR] Failed to store memory point:", err);
        return null;
    }
}

export async function recallContext(agentId: string, topic: string) {
    if (!adminDb) return [];
    try {
        console.log(`[COGNITION] Recall triggered by ${agentId} for topic: ${topic}`);
        // Mock semantic recall lookup
        const query = await adminDb.collection("cognitiveMemoryGraphs")
            .where("agentId", "==", agentId)
            .limit(5)
            .get();
            
        return query.docs.map(d => d.data());
    } catch (err) {
        console.error("[COGNITION_ERR]", err);
        return [];
    }
}
