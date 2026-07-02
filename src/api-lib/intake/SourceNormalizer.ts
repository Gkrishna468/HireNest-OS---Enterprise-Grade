import { IntakeEnvelope } from "./IntakeEnvelope.js";

export class SourceNormalizer {
  static normalize(rawPayload: any, source: string): IntakeEnvelope {
    return {
      id: rawPayload.id || `intake-${Date.now()}`,
      tenantId: rawPayload.tenantId || "system",
      correlationId: rawPayload.correlationId || `corr-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channel: rawPayload.channel || "unknown",
      source: source as any,
      sender: rawPayload.sender || "unknown",
      subject: rawPayload.subject || "",
      body: rawPayload.body || "",
      attachments: rawPayload.attachments || [],
      receivedAt: rawPayload.receivedAt || new Date().toISOString(),
      metadata: rawPayload.metadata || {},
    };
  }
}
