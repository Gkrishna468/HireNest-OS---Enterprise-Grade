/**
 * Lightweight Distributed Tracing Wrapper (OpenTelemetry Stub)
 * 
 * Provides trace correlation and span lifecycle management.
 */

export interface SpanContext {
  traceId: string;
  spanId: string;
  tenantId?: string;
  startTime: number;
}

export const Telemetry = {
  startSpan: (name: string, attributes?: Record<string, any>, parent?: SpanContext): SpanContext => {
    const context: SpanContext = {
      traceId: parent?.traceId || `trc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      spanId: `spn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      tenantId: attributes?.vendorId || parent?.tenantId,
      startTime: Date.now()
    };
    
    // In production, start actual OTel span here.
    return context;
  },

  endSpan: (context: SpanContext, attributes?: Record<string, any>, error?: Error) => {
    const durationMs = Date.now() - context.startTime;
    
    const spanPayload = {
      ...context,
      durationMs,
      ...attributes,
      error: error ? error.message : undefined,
      timestamp: new Date().toISOString()
    };

    // Fire-and-forget background export stub
    fetch('/api/admin?action=telemetry', {
      method: "POST",
      body: JSON.stringify([spanPayload]),
      headers: { "Content-Type": "application/json" }
    }).catch(() => {}); // Catch silent failure for async observability
  }
};
