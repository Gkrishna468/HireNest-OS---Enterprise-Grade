import { NextRequest, NextResponse } from "next/server";

/**
 * OpenTelemetry Sink (Stub)
 * 
 * This endpoint simulates an OTLP HTTP receiver for distributed traces.
 * In a production Node.js/Cloud Run environment, you would use the 
 * official @opentelemetry/sdk-node and configure an OTLPTraceExporter
 * to stream spans directly to Google Cloud Trace, Datadog, or Honeycomb.
 */
export async function POST(req: NextRequest) {
  try {
    const traces = await req.json();

    if (!Array.isArray(traces) || traces.length === 0) {
       return NextResponse.json({ success: false, message: "Invalid trace array payload" }, { status: 400 });
    }

    // STUB: Telemetry ingestion 
    console.log(`[OTLP SINK] Ingested ${traces.length} distributed spans.`);
    
    return NextResponse.json({ success: true, processedCount: traces.length }, { status: 200 });

  } catch (err: any) {
    console.error("[OTLP SINK] Telemetry Sink Failure", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
