import { Request, Response } from "express";
import { RuntimeMetricsService } from "../services/RuntimeMetricsService.js";

export default async function opsHandler(req: Request, res: Response) {
  const path = req.path.replace(/^\//, "");
  const method = req.method;

  try {
    if (path === "ops/heartbeats" && method === "GET") {
      const heartbeats = await RuntimeMetricsService.getHeartbeats("hq");
      return res.json({ success: true, heartbeats });
    }

    if (path === "ops/heartbeats/publish" && method === "POST") {
      const heartbeats = await RuntimeMetricsService.publishHeartbeats("hq");
      return res.json({ success: true, heartbeats, message: "Heartbeats published successfully." });
    }

    if (path === "ops/queue" && method === "GET") {
      const queueData = await RuntimeMetricsService.getQueueInspectorData();
      return res.json({ success: true, ...queueData });
    }

    if (path === "ops/timeline" && method === "GET") {
      const timeline = await RuntimeMetricsService.getEventTimeline();
      return res.json({ success: true, timeline });
    }

    if (path === "ops/trends" && method === "GET") {
      const trends = await RuntimeMetricsService.getHistoricalTrends();
      return res.json({ success: true, trends });
    }

    return res.status(404).json({ error: `Ops path not found: ${path}` });
  } catch (err: any) {
    console.error(`[opsHandler] Error handling ${path}:`, err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
