import { adminDb } from '../../../src/lib/firebase-admin.js';
import crypto from "crypto";

export interface CandidateVariant {
    variantId: string;
    globalCandidateId?: string;
    sourceOrgId: string;
    uploadedBy: string;
    resumeText: string;
    name: string;
    email?: string;
    phone?: string;
    linkedin?: string;
    skills: string[];
}

export async function processCandidateIdentity(variant: CandidateVariant) {
    if (!adminDb) return;
    
    console.log(`[IDENTITY_RESOLVER] Processing identity for ${variant.name}`);

    // Generate normalizations & hashes for deterministic matching
    const emailHash = variant.email ? crypto.createHash('sha256').update(variant.email.toLowerCase().trim()).digest('hex') : null;
    const phoneHash = variant.phone ? crypto.createHash('sha256').update(variant.phone.replace(/[^0-9]/g, '')).digest('hex') : null;
    
    // 1. Deterministic Match Lookup
    let matchedGlobalId = null;
    let duplicateConfidence = 0;

    if (emailHash) {
       const emailQuery = await adminDb.collection("global_candidate_identity").where("primaryEmailHash", "==", emailHash).get();
       if (!emailQuery.empty) {
           matchedGlobalId = emailQuery.docs[0].id;
           duplicateConfidence = 0.99;
       }
    }
    
    if (!matchedGlobalId && phoneHash) {
       const phoneQuery = await adminDb.collection("global_candidate_identity").where("phoneHash", "==", phoneHash).get();
       if (!phoneQuery.empty) {
           matchedGlobalId = phoneQuery.docs[0].id;
           duplicateConfidence = 0.95; 
       }
    }

    if (matchedGlobalId) {
       console.log(`[IDENTITY_RESOLVER] Found deterministic match: ${matchedGlobalId} (${duplicateConfidence})`);
       
       // Record Variant to matched Global Identity
       await adminDb.collection("candidate_variants").doc(variant.variantId).set({
           ...variant,
           globalCandidateId: matchedGlobalId,
           resolutionStatus: "MERGED",
           matchConfidence: duplicateConfidence,
           resolvedAt: new Date().toISOString()
       });
       
    } else {
       console.log(`[IDENTITY_RESOLVER] No match found. Provisioning new global identity.`);
       
       const newGlobalRef = await adminDb.collection("global_candidate_identity").add({
           normalizedName: variant.name.toLowerCase().trim(),
           primaryEmailHash: emailHash,
           phoneHash: phoneHash,
           createdAt: new Date().toISOString(),
           variantCount: 1,
           fingerprintScore: 100 // New canonical baseline
       });
       
       await adminDb.collection("candidate_variants").doc(variant.variantId).set({
           ...variant,
           globalCandidateId: newGlobalRef.id,
           resolutionStatus: "NEW_GLOBAL",
           resolvedAt: new Date().toISOString()
       });
    }
}
