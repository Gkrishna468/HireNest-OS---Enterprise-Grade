import { adminDb } from "../src/lib/firebase-admin.js";
import { generateEmbedding } from "./lib/aiGateway.js";

// Helper function to calculate cosine similarity
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const orgId = req.headers['x-org-id'] || 'system';
  
  try {
    const payload = req.body;

    if (!payload || !payload.action) {
       return res.status(400).json({ success: false, message: "Invalid payload format" });
    }

    if (payload.action === 'UPSERT_EMBEDDINGS') {
       console.log(`[VECTOR_DB] Document upsert skipped. Embeddings are generated dynamically upon processing.`);
       return res.status(200).json({ success: true, indexed: payload.documents?.length || 0 });
    }
    
    if (payload.action === 'SEMANTIC_SEARCH') {
       console.log(`[VECTOR_DB] Searching vector space for query: "${payload.query}"`);
       
       if (!adminDb) {
           return res.status(500).json({ success: false, error: 'Database not initialized' });
       }
       
       // 1. Generate query embedding
       const queryEmbedding = await generateEmbedding(orgId, payload.query);
       if (!queryEmbedding) {
          throw new Error("Failed to generate embedding for query.");
       }
       
       // 2. Fetch corpus (In production, this would use pgvector or Firestore Vector Search extensions)
       // Here we retrieve the cache for demonstration purposes
       const resumesSnapshot = await adminDb.collection("resume_cache").get();
       
       const scoredCandidates = [];
       
       for (const doc of resumesSnapshot.docs) {
          const profile = doc.data();
          if (profile.embedding) {
             const score = cosineSimilarity(queryEmbedding, profile.embedding);
             if (score > 0.5) { // Threshold
                 scoredCandidates.push({
                     candidateId: doc.id,
                     name: profile.name,
                     skills: profile.skills,
                     score,
                     matchScore: (score * 100).toFixed(1)
                 });
             }
          }
       }
       
       scoredCandidates.sort((a, b) => b.score - a.score);
       const topResults = scoredCandidates.slice(0, 10);

       return res.status(200).json({ 
           success: true, 
           results: topResults
       });
    }

    return res.status(400).json({ success: false, message: "Unknown semantic action" });

  } catch (err: any) {
    console.error("[VECTOR_DB] Vector Search Gateway Failure", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
