export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const traces = req.body;

    if (!Array.isArray(traces) || traces.length === 0) {
       return res.status(400).json({ success: false, message: "Invalid trace array payload" });
    }

    // STUB: Telemetry ingestion 
    console.log(`[OTLP SINK] Ingested ${traces.length} distributed spans.`);
    
    return res.status(200).json({ success: true, processedCount: traces.length });

  } catch (err: any) {
    console.error("[OTLP SINK] Telemetry Sink Failure", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
