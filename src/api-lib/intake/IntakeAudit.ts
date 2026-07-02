import { IntakeEnvelope } from "./IntakeEnvelope.js";
import { ClassificationResult } from "./EntityClassifier.js";
import { adminDb } from "../../lib/firebase-admin.js";

export interface IntakeAuditRecord {
    correlationId: string;
    source: string;
    confidence: number;
    rulesUsed: string[];
    promptVersion?: string;
    provider?: string;
    executionTimeMs: number;
    status: string;
    createdEntities: any[];
    relationships: any[];
}

export class IntakeAudit {
    static async log(envelope: IntakeEnvelope, record: IntakeAuditRecord) {
        if (!adminDb) return;
        
        try {
            await adminDb.collection("intake_audit").add({
                intakeId: envelope.id,
                tenantId: envelope.tenantId,
                ...record,
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            console.error("[IntakeAudit] Failed to log audit", e);
        }
    }
}
