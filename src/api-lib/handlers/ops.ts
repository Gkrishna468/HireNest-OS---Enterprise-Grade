import { Request, Response } from "express";
import { RuntimeMetricsService } from "../services/RuntimeMetricsService.js";

export default async function opsHandler(req: Request, res: Response) {
  const path = req.path.replace(/^\//, "");
  const method = req.method;

  try {
    if (path === "ops" && method === "POST") {
        const action = req.query.action;
        if (action === "process_coo") {
            const { OutboxDispatcher } = await import("../os/kernel/OutboxDispatcher.js");
            await OutboxDispatcher.dispatchOutbox();

            const { AICOORuntime } = await import("../os/kernel/AICOORuntime.js");
            await AICOORuntime.processInbox();
            return res.json({ success: true });
        }
        if (action === "process_offices") {
            // Trigger matching office processing, and other offices
            const { MatchingOffice } = await import("../os/kernel/MatchingOffice.js");
            const matchingOffice = new MatchingOffice();
            await matchingOffice.processQueue();

            const { RecruitmentOffice } = await import("../os/kernel/RecruitmentOffice.js");
            const recruitmentOffice = new RecruitmentOffice();
            await recruitmentOffice.processQueue();
            
            return res.json({ success: true });
        }
    }

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

    if (path === "ops/governance" && method === "GET") {
      const office = req.query.office as string;
      const { CircuitBreaker } = await import("../os/kernel/CircuitBreaker.js");
      const { AIBudgetManager } = await import("../os/kernel/AIBudgetManager.js");
      const circuit = await CircuitBreaker.checkCircuit(office || "MatchingOffice");
      const budget = await AIBudgetManager.checkBudget(office || "MatchingOffice");
      return res.json({ success: true, circuit, budget });
    }

    if (path === "ops/replay" && method === "POST") {
      const { eventId, office } = req.body;
      const { EventReplay } = await import("../os/kernel/EventReplay.js");
      if (eventId) {
        await EventReplay.replayEvent(eventId);
      } else if (office) {
        await EventReplay.replayDeadLetters(office);
      }
      return res.json({ success: true });
    }

    return res.status(404).json({ error: `Ops path not found: ${path}` });
  } catch (err: any) {
    console.error(`[opsHandler] Error handling ${path}:`, err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
