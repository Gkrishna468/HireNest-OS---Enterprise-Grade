import { IntakeEnvelope } from "./IntakeEnvelope";
import { ClassificationResult } from "./EntityClassifier";
import { adminDb } from "../../lib/firebase-admin";

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
