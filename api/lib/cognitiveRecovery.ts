import { adminDb } from "../../src/lib/firebase-admin.js";
import { MemoryPyramidEntry } from "./tencentMemoryPyramid.js";

/**
 * Phase 9: Cognitive Recovery Engine (Git for Cognition)
 * Rollback corrupted memory, revert hallucinated personas, restore trust states.
 */

export async function rollbackCognitiveState(nodeId: string, targetTimestamp: string): Promise<boolean> {
    if (!adminDb) return false;

    console.log(`[RECOVERY] Initiating cognitive rollback for ${nodeId} to ${targetTimestamp}...`);

    try {
        const memoryRef = adminDb.collection("cognitiveMemoryPyramid").doc(nodeId);
        const memorySnap = await memoryRef.get();

        if (!memorySnap.exists) {
            console.warn(`[RECOVERY] Target node ${nodeId} not found.`);
            return false;
        }

        const data = memorySnap.data() as MemoryPyramidEntry;
        
        // Find historical versions (requires a history collection or event sourcing)
        const historyRef = adminDb.collection("cognitiveMemoryHistory")
            .where("nodeId", "==", nodeId)
            .where("timestamp", "<=", targetTimestamp)
            .orderBy("timestamp", "desc")
            .limit(1);

        const historySnap = await historyRef.get();

        if (historySnap.empty) {
            console.warn(`[RECOVERY] No valid historical state found before ${targetTimestamp}. Attempting soft archive instead.`);
            
            // Soft archive corrupted memory
            await memoryRef.update({
                accessScope: "governance", // Isolate it
                confidence: 0,
                updatedAt: new Date().toISOString()
            });

            return true;
        }

        const historicalState = historySnap.docs[0].data();

        // Restore historical state
        await memoryRef.update({
            content: historicalState.content,
            confidence: historicalState.confidence,
            source: "cognitive-recovery",
            lineage: historicalState.lineage,
            updatedAt: new Date().toISOString()
        });

        console.log(`[RECOVERY] ✅ Node ${nodeId} restored to state from ${historicalState.timestamp}`);
        
        // Log recovery event
        await adminDb.collection("cognitiveRecoveryLogs").add({
            nodeId,
            restoredTo: historicalState.timestamp,
            executedAt: new Date().toISOString()
        });

        return true;
    } catch (error) {
        console.error("[RECOVERY] Error during cognitive rollback:", error);
        return false;
    }
}
