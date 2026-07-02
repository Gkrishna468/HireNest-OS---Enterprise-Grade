import { db } from "../../lib/firebase-admin.js";

interface AITelemetryPayload {
    requestId: string;
    workspaceId: string;
    model: string;
    promptVersion: string;
    promptText: string;
    responseText: string;
    latencyMs: number;
    tokenUsage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    confidenceScore?: number;
    hallucinationRisk?: 'LOW' | 'MEDIUM' | 'HIGH';
    metadata?: Record<string, any>;
}

export class AITelemetry {
    static async logExecution(payload: AITelemetryPayload) {
        try {
            console.log(JSON.stringify({
                type: 'AI_OBSERVABILITY_LOG',
                timestamp: new Date().toISOString(),
                ...payload
            }));

            if (db) {
                await db.collection("ai_observability_logs").add({
                    ...payload,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("Failed to log AI execution telemetry", e);
        }
    }
}
