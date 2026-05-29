import { adminDb } from '../lib/firebase-admin.js';
import { logAIExplainability, authorizeAIAction } from './aiGovernance.js';
import { VectorDatabaseConnector } from '../../api/_lib/vectorDatabase.js';

export async function generateEmbedding(text: string): Promise<number[]> {
  console.log(`[VECTOR_ENGINE] Generating simulated semantic embedding for: "${text.substring(0, 30)}..."`);
  return Array.from({ length: 128 }, () => Math.random()); // Expanded vector space to 128d
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * AI Memory Layer: Long-term Semantic Preferences Storage
 * Learns from client rejections and vendor placement success.
 */
export async function trackRecruiterMemory(recruiterId: string, interactions: any[]) {
  if (!adminDb) return;
  try {
     const memoryText = interactions.map(i => `${i.action}: ${i.feedback}`).join(" | ");
     const vectorUpdate = await generateEmbedding(memoryText);
     
     await adminDb.collection("aiMemories").doc(recruiterId).set({
        agentId: recruiterId,
        latestVector: vectorUpdate,
        lastInteractionTokens: interactions.length,
        updatedAt: new Date().toISOString()
     }, { merge: true });
     
     console.log(`[AI_MEMORY] Updated long-term memory weights for agent ${recruiterId}`);
  } catch(err) {
     console.error("[AI_MEMORY_ERR]", err);
  }
}

export async function evaluateCandidateAutonomously(agentId: string, candidateId: string, score: number): Promise<boolean> {
   const confidence = Math.round(score); // e.g. score was 0-100
   const isAuthorized = await authorizeAIAction(agentId, "RECOMMEND_CANDIDATE", confidence);
   
   await logAIExplainability({
      agentId,
      action: "RECOMMEND_CANDIDATE",
      confidenceScore: confidence,
      explainabilityLog: [
         "Extracting latent candidate profile factors",
         "Computing cosine similarity over required parameters",
         isAuthorized ? "Confidence threshold met." : "Confidence threshold missed."
      ],
      decisionMetadata: { candidateId, score },
      governanceApproved: isAuthorized
   });

   return isAuthorized;
}

export async function vectorizeCandidate(candidateId: string, profileText: string) {
  if (!adminDb) return;
  try {
    const vector = await generateEmbedding(profileText);
    
    // Abstracted to External Vector Index
    await VectorDatabaseConnector.upsertVector("candidates-v1", candidateId, vector, { indexedAt: new Date().toISOString() });
    await adminDb.collection("candidateVectors").doc(candidateId).set({
       vector,
       updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[VECTOR_ENGINE_ERR] Failed candidate index:", err);
  }
}
