import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Enterprise Priority: Candidate Consent & Data Governance Engine
 * Manages DPDP, GDPR, CCPA consent ledger, deletion workflows, and communication preferences.
 */

export interface ConsentRecord {
    candidateId: string;
    tenantId: string;
    consents: {
        dataProcessing: boolean;
        aiMatching: boolean;
        marketing: boolean;
    };
    revokeRequested: boolean;
    deletionStatus: "NONE" | "PENDING" | "COMPLETED";
    timestamp: string;
}

export async function recordConsent(candidateId: string, tenantId: string, consents: ConsentRecord["consents"]) {
    if (!adminDb) return;
    
    console.log(`[CONSENT_LEDGER] Recording immutable consent for candidate ${candidateId} in tenant ${tenantId}`);
    
    const record: ConsentRecord = {
        candidateId,
        tenantId,
        consents,
        revokeRequested: false,
        deletionStatus: "NONE",
        timestamp: new Date().toISOString()
    };

    try {
        await adminDb.collection("consentLedger").doc(`${candidateId}_${Date.now()}`).set(record);
        console.log(`[CONSENT_LEDGER] ✅ Consent recorded successfully.`);
    } catch(err) {
        console.error("[CONSENT_LEDGER] Failed to record consent:", err);
    }
}

export async function requestDataDeletion(candidateId: string, tenantId: string) {
    console.log(`[CONSENT_LEDGER] 🚨 Deletion workflow triggered for candidate ${candidateId} in tenant ${tenantId}`);
    
    // In a real system, this would publish an event to EventBus which Temporal durable workflow picks up to orchestrate:
    // 1. Firestore deletion
    // 2. pgVector embeddings deletion
    // 3. Analytics anonymization
    
    if (adminDb) {
        await adminDb.collection("deletionWorkflows").add({
            candidateId,
            tenantId,
            status: "PENDING",
            timestamp: new Date().toISOString()
        });
    }
}
