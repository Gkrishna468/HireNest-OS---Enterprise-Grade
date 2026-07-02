import { db } from "../../lib/firebase-admin.js";

interface ErrorTelemetryPayload {
    requestId?: string;
    workspaceId?: string;
    userId?: string;
    context: string;
    errorType: 'FRONTEND_CRASH' | 'BACKEND_EXCEPTION' | 'AI_FAILURE' | 'GMAIL_SYNC' | 'FIRESTORE_DENIAL' | 'OCR_FAILURE';
    errorMessage: string;
    stackTrace?: string;
    metadata?: Record<string, any>;
}

export class ErrorMonitor {
    static async captureError(payload: ErrorTelemetryPayload) {
        try {
            console.error(JSON.stringify({
                type: 'SYSTEM_ERROR_LOG',
                timestamp: new Date().toISOString(),
                ...payload
            }));

            if (db) {
                await db.collection("error_monitoring_logs").add({
                    ...payload,
                    timestamp: new Date().toISOString(),
                    resolved: false
                });
            }
        } catch (e) {
            console.error("Failed to capture error telemetry", e);
        }
    }
}
