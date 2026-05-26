import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Enterprise Priority 4: Observability Stack
 * Simulating LangSmith / Sentry tracing for AI runtime execution.
 */

export function startAiTraceSpan(spanName: string) {
    const startTime = Date.now();
    console.log(`[TRACER] Starting span: ${spanName}`);
    
    return {
        end: async (metadata?: any) => {
            const duration = Date.now() - startTime;
            console.log(`[TRACER] Ended span: ${spanName} (${duration}ms)`);
            if (adminDb) {
                await adminDb.collection("tracingSpans").add({
                    spanName,
                    durationMs: duration,
                    metadata: metadata || {},
                    timestamp: new Date().toISOString()
                });
            }
        }
    };
}
