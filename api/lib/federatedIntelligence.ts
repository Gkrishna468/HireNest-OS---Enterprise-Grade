import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Phase 12: Federated Tenant Intelligence
 * Privacy-Preserving Intelligence Sharing across tenants without exposing PII/raw cognition.
 */

export interface FederatedPattern {
    patternId: string;
    sourceTenantId: string; // Used for origin tracking, stripped on global read
    patternType: "negotiation_success" | "attrition_warning" | "optimal_contact_time";
    anonymizedVector: number[];
    confidenceLevel: number;
    extractedAt: string;
}

export async function publishFederatedPattern(pattern: FederatedPattern) {
    if (!adminDb) return;

    try {
        // Strip sensitive data, push to global federated pool
        await adminDb.collection("federatedIntelligence").doc(pattern.patternId).set({
            patternType: pattern.patternType,
            anonymizedVector: pattern.anonymizedVector, // Abstract representation
            confidenceLevel: pattern.confidenceLevel,
            extractedAt: new Date().toISOString()
        });
        console.log(`[FEDERATION] Published privacy-preserving pattern: ${pattern.patternType}`);
    } catch(err) {
        console.error("[FEDERATION] Error publishing pattern:", err);
    }
}
