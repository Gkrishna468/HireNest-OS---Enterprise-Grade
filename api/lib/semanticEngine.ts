import { adminDb } from "../../src/lib/firebase-admin";

/**
 * Semantic Vector Engine (Stub/Orchestrator)
 * This service handles vector embeddings for true semantic matching.
 * When a candidate or job is added, their textual data is sent to an embedding model.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // In production, instantiate Vertex AI or OpenAI embeddings client here.
  // Example: 
  // const model = ai.models.get("text-embedding-004");
  // const res = await model.embedContent(text);
  // return res.embedding.values;
  
  // Return mock dimensionality (e.g., 256d or 768d vector)
  console.log(`[VECTOR_ENGINE] Generating simulated semantic embedding for: "${text.substring(0, 30)}..."`);
  return Array.from({ length: 10 }, () => Math.random());
}

/**
 * Calculates Cosine Similarity between two semantic vectors.
 */
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
 * Index a candidate's latent profile semantic vector.
 */
export async function vectorizeCandidate(candidateId: string, profileText: string) {
  if (!adminDb) return;
  try {
    const vector = await generateEmbedding(profileText);
    await adminDb.collection("candidateVectors").doc(candidateId).set({
       vector,
       updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.warn("[VECTOR_ENGINE_ERR] Failed candidate index:", err);
  }
}
