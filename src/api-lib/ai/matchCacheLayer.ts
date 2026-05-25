import { adminDb } from "../../lib/firebase-admin.js";
import crypto from "crypto";

export async function getCachedMatchResult(globalCandidateId: string, requirementId: string, weightsVersion: string): Promise<any | null> {
    if (!adminDb) return null;
    
    const hash = crypto.createHash("sha256").update(`${globalCandidateId}_${requirementId}_${weightsVersion}`).digest("hex");
    const cacheRef = await adminDb.collection("candidate_match_cache").doc(hash).get();
    
    if (cacheRef.exists) {
        const data = cacheRef.data();
        if (data && new Date().getTime() < new Date(data.expiresAt).getTime()) {
            return data.matchResult;
        }
    }
    return null;
}

export async function setCachedMatchResult(globalCandidateId: string, requirementId: string, weightsVersion: string, matchResult: any, ttlHours: number = 24): Promise<void> {
    if (!adminDb) return;

    const hash = crypto.createHash("sha256").update(`${globalCandidateId}_${requirementId}_${weightsVersion}`).digest("hex");
    const expiresAt = new Date(Date.now() + (ttlHours * 60 * 60 * 1000)).toISOString();
    
    await adminDb.collection("candidate_match_cache").doc(hash).set({
        matchResult,
        createdAt: new Date().toISOString(),
        expiresAt,
        globalCandidateId,
        requirementId,
        weightsVersion
    });
}
