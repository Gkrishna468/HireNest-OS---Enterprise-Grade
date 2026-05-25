import { adminDb } from "../../src/lib/firebase-admin.js";
import { detectRecursiveHallucination } from "./governanceEngine.js";

/**
 * TencentDB-Inspired L0-L3 Memory Pyramid for AI Interactions
 * 
 * L0 Conversation (Raw dialogues)
 * L1 Atom (Atomic facts)
 * L2 Scenario (Scene blocks)
 * L3 Persona (User profile)
 */

export interface MemoryPyramidEntry {
    nodeId: string;
    tenantId: string;
    recruiterId?: string;
    layer: "L0_CONVERSATION" | "L1_ATOM" | "L2_SCENARIO" | "L3_PERSONA";
    content: any; // Object or text
    confidence: number;
    verification: boolean;
    source: "conversation" | "resume" | "email" | "manual" | "agent-generated";
    staleAfter?: number;
    linkedEntities?: string[];
    lineage: string[]; // Crucial: Pointers to lower layer node_ids (e.g., L0 -> L1)
    accessScope: "tenant" | "recruiter" | "candidate" | "governance";
    referenceId: string; // Primary user reference
    createdAt: string;
    updatedAt: string;
}

export async function insertMemoryNode(
    layer: MemoryPyramidEntry["layer"], 
    referenceId: string, 
    content: any, 
    extraData: Partial<MemoryPyramidEntry> = {}
): Promise<string | null> {
    if (!adminDb) return null;
    
    // Evaluate Governance Rules before insertion
    const confidence = extraData.confidence || 0.9;
    if (layer === "L2_SCENARIO" && confidence < 0.6) {
        await detectRecursiveHallucination(layer, confidence, String(content));
    }
    
    const nodeId = `mem_${layer}_${referenceId}_${Date.now()}`;
    try {
        await adminDb.collection("cognitiveMemoryPyramid").doc(nodeId).set({
            nodeId,
            layer,
            referenceId,
            content,
            tenantId: extraData.tenantId || "default",
            recruiterId: extraData.recruiterId || null,
            confidence: confidence,
            verification: extraData.verification || false,
            source: extraData.source || "agent-generated",
            staleAfter: extraData.staleAfter || null,
            linkedEntities: extraData.linkedEntities || [],
            lineage: extraData.lineage || [],
            accessScope: extraData.accessScope || "tenant",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        
        console.log(`[MEMORY_PYRAMID] Stored ${layer} node for ${referenceId}`);
        return nodeId;
    } catch(err) {
        console.error("[MEMORY_PYRAMID] Failed to store node:", err);
        return null;
    }
}

export async function fetchMemoryPyramid(referenceId: string) {
    if (!adminDb) return [];
    try {
        const query = await adminDb.collection("cognitiveMemoryPyramid")
            .where("referenceId", "==", referenceId)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get();
        return query.docs.map(d => d.data());
    } catch (err) {
        console.warn("[MEMORY_PYRAMID] Fetch error:", err);
        return [];
    }
}
