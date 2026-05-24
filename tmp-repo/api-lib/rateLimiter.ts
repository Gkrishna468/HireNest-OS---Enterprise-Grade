import { adminDb } from "../src/lib/firebase-admin";

/**
 * Distributed Token Rate Limiter
 * Provides quota enforcement for embedding generation and AI operations.
 */
export async function enforceRateLimit(orgId: string, tokensRequired: number): Promise<boolean> {
  if (!adminDb) return false;
  
  const currentMonth = new Date().toISOString().substring(0, 7); // e.g., "2026-05"
  const quotaRef = adminDb.collection("quotas").doc(`${orgId}_${currentMonth}`);
  
  try {
     const quotaDoc = await quotaRef.get();
     const data = quotaDoc.data() || { tokensUsed: 0, maxTokens: 1000000 };
     
     if (data.tokensUsed + tokensRequired > data.maxTokens) {
         console.warn(`[RATE_LIMIT] Quota exceeded for org ${orgId}. Used: ${data.tokensUsed}`);
         return false;
     }

     // Optimistic update without transaction for speed in stub design
     await quotaRef.set({
        orgId,
        month: currentMonth,
        tokensUsed: (data.tokensUsed || 0) + tokensRequired,
        maxTokens: data.maxTokens || 1000000,
        lastAccessedAt: new Date().toISOString()
     }, { merge: true });
     
     return true;
  } catch (err) {
     console.error("[RATE_LIMIT_ERR]", err);
     return false; // Fail secure
  }
}
