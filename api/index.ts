import adminHandler from "./lib/admin";
import matchDetailedHandler from "./lib/match-candidates-detailed";
import matchingGlobalHandler from "./lib/matching-global";
import bulkParseHandler from "./lib/bulk-parse-resumes";
import eventReplayHandler from "./lib/event-replay";
import extractTextHandler from "./lib/extract-text";
import intelHandler from "./lib/intel";
import userHandler from "./lib/user";
import parseJdHandler from "./lib/parse-jd";
import candidatesHandler from "./lib/candidates";
import telemetrySinkHandler from "./lib/telemetry-sink";
import bigquerySinkHandler from "./lib/bigquery-sink";
import vectorSearchHandler from "./lib/vector-search";

export default async function handler(req: any, res: any) {
  const path = req.url || "";

  try {
    // Admin routes
    if (
      path.includes("/api/admin") ||
      path.includes("/api/governance") ||
      path.includes("/api/approve-request") ||
      path.includes("/api/finalize-onboarding") ||
      path.includes("/api/onboard-request") ||
      path.includes("/api/metrics") ||
      path.includes("/api/diagnostics") ||
      path.includes("/api/pre-flight") ||
      path.includes("/api/notify-approval") ||
      path.includes("/api/approve-requirement") ||
      path.includes("/api/notifications")
    ) {
      return adminHandler(req, res);
    }
    
    // User routes
    if (path.includes("/api/create-user") || path.includes("/api/delete-user") || path.includes("/api/assign-role") || path.includes("/api/user-context") || (path.includes("/api/user") && !path.includes("candidates"))) {
      return userHandler(req, res);
    }

    if (path.includes("/candidates")) {
      return candidatesHandler(req, res);
    }
    if (path.includes("/api/match-candidates-detailed")) {
      return matchDetailedHandler(req, res);
    }
    if (path.includes("/matching") || path.includes("/api/matching/global")) {
      return matchingGlobalHandler(req, res);
    }
    if (path.includes("/api/bulk-parse-resumes")) {
      return bulkParseHandler(req, res);
    }
    if (path.includes("/api/event-replay")) {
      return eventReplayHandler(req, res);
    }
    if (path.includes("/api/extract-text")) {
      return extractTextHandler(req, res);
    }
    if (path.includes("/api/intel") || path.includes("/api/deal-intelligence") || path.includes("/api/strategy/analyze")) {
      return intelHandler(req, res);
    }
    if (path.includes("/api/parse-jd")) {
      return parseJdHandler(req, res);
    }
    if (path.includes("/api/telemetry") || path.includes("/api/telemetry-sink")) {
      return telemetrySinkHandler(req, res);
    }
    if (path.includes("/api/bigquery") || path.includes("/api/bigquery-sink")) {
      return bigquerySinkHandler(req, res);
    }
    if (path.includes("/api/vector-search") || path.includes("/api/search")) {
      return vectorSearchHandler(req, res);
    }

    return res.status(404).json({ error: "Route not found in central router", path });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error", details: err.message });
  }
}
