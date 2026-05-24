import { adminDb } from "../../src/lib/firebase-admin";

/**
 * Global Distributed Tracing
 * Propagates execution context (Trace IDs, Span IDs) across
 * workflows, sagas, queues, and agent boundaries.
 * Inspired by OpenTelemetry.
 */

export interface TraceContext {
   traceId: string;
   spanId: string;
   parentSpanId?: string;
   service: string;
}

export function generateTraceId(): string {
   return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateSpanId(): string {
   return `span_${Math.random().toString(36).substring(2, 9)}`;
}

export async function logTraceSpan(context: TraceContext, operation: string, metadata: any = {}) {
   if (!adminDb) return;
   
   try {
      await adminDb.collection("distributedTraces").add({
         ...context,
         operation,
         metadata,
         timestamp: new Date().toISOString()
      });
      console.log(`[TRACING] [${context.traceId}] ${context.service}::${operation} (Span: ${context.spanId})`);
   } catch (err) {
      console.error("[TRACING_ERR] Failed to log span:", err);
   }
}
