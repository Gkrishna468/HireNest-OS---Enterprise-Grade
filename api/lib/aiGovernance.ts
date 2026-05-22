import { adminDb } from "../../src/lib/firebase-admin";

/**
 * AI Agent Governance
 * Enforces action permissions, logs explainability paths, and 
 * records confidence scoring for governance oversight.
 */

export interface AIAuditRecord {
   agentId: string;
   action: string;
   confidenceScore: number;  // 0-100
   explainabilityLog: string[];
   decisionMetadata: any;
   governanceApproved: boolean;
   timestamp: string;
}

/**
 * Validates whether an AI Agent has sufficient governance permission 
 * and confidence to perform an autonomous action.
 */
export async function authorizeAIAction(agentId: string, actionCategory: string, confidence: number): Promise<boolean> {
   // Simulated Governance Limits:
   // Example: Autonomous shortlisting requires 85% confidence,
   // while automated rejection requires 95% confidence.
   let requiredConfidence = 80;
   
   if (actionCategory === 'RECOMMEND_CANDIDATE') requiredConfidence = 70;
   if (actionCategory === 'SHORTLIST_CANDIDATE') requiredConfidence = 85;
   if (actionCategory === 'REJECT_CANDIDATE') requiredConfidence = 95;
   if (actionCategory === 'FINANCIAL_ADJUSTMENT') requiredConfidence = 99;

   if (confidence < requiredConfidence) {
       console.warn(`[AI_GOVERNANCE] Action ${actionCategory} denied. Confidence ${confidence}% below required ${requiredConfidence}%.`);
       return false;
   }
   return true;
}

/**
 * Appends an AI decision trace to the immutuable governance log.
 */
export async function logAIExplainability(record: Omit<AIAuditRecord, "timestamp">): Promise<void> {
   if (!adminDb) return;
   
   try {
      await adminDb.collection("aiGovernanceLogs").add({
         ...record,
         timestamp: new Date().toISOString()
      });
      console.log(`[AI_GOVERNANCE] Trace logged for ${record.agentId} -> ${record.action} [Conf: ${record.confidenceScore}]`);
   } catch (err) {
      console.error("[AI_GOVERNANCE_ERR] Audit log failure:", err);
   }
}
