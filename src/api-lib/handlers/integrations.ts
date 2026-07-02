import { EventEnvelope } from "../../events/types/EventEnvelope.js";
import { EventDispatcher } from "../../events/EventDispatcher.js";

export default async function integrationsHandler(req: any, res: any) {
  const { path } = req;
  const endpoint = path.replace(/^\/api\/integrations\//, "");

  if (endpoint === "events") {
    const event: EventEnvelope<any> = req.body;
    console.log(`[Integration API] Received event: ${event.type}`);

    // Check connector Auth (stubbed)
    // Validate envelope...

    // Relay to Event Bus
    EventDispatcher.getInstance().publish({
      id: event.id,
      type: event.type,
      timestamp: new Date(event.timestamp).toISOString(),
      tenantId: event.tenantId || "system",
      payload: event.payload,
    });

    return res.status(200).json({ success: true, message: "Event Accepted" });
  }

  if (endpoint === "sync/resolve") {
    // Mock resolving
    return res.status(200).json({ osEntityId: "cli-stub", success: true });
  }

  return res
    .status(404)
    .json({ success: false, error: "Integration endpoint not found" });
}
