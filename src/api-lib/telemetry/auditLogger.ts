import { db } from "../../lib/firebase-admin.js";

export interface AuditEvent {
    userId?: string;
    workspaceId?: string;
    action: 'CANDIDATE_CREATED' | 'RESUME_UPLOADED' | 'AI_RECOMMENDATION' | 'REQUIREMENT_UPDATED' | 'VENDOR_ACCESS' | 'OFFER_RELEASED' | 'GENERAL_ACTION';
    resourceId?: string;
    details?: string;
    metadata?: Record<string, any>;
}

export class AuditLogger {
    static async log(event: AuditEvent) {
        try {
            const payload = {
                type: 'AUDIT_LOG',
                timestamp: new Date().toISOString(),
                ...event
            };
            
            console.log(JSON.stringify(payload));

            if (db) {
                await db.collection("audit_logs").add(payload);
            }
        } catch (e) {
            console.error("Failed to log audit event", e);
        }
    }
}
