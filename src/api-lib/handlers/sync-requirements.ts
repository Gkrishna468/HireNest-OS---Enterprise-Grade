import express from "express";
import { RequirementSyncService } from "../../services/requirementSyncService.js";
import { WhatsAppSyndicationService } from "../../services/WhatsAppSyndicationService.js";
import { db } from "../../lib/firebase-admin.js";

const syncRequirementsHandler = express.Router();

/**
 * Helper to extract and validate authorization context
 */
function verifySyncAuthorization(req: any): { authorized: boolean; reason?: string } {
  // If user object is populated by authMiddleware
  if (req.user) {
    const role = (req.user.role || "").toLowerCase();
    if (["admin", "super_admin", "recruiter", "system"].includes(role)) {
      return { authorized: true };
    }
  }

  // System signature or internal API key
  const signature = req.headers["x-hirenest-signature"];
  const syncSecret = req.headers["x-sync-secret"] || req.headers["x-api-key"];
  if (signature || syncSecret) {
    return { authorized: true };
  }

  // Allow standard bearer token if provided
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return { authorized: true };
  }

  // In AI Studio / local preview environments without explicit user session, permit sync
  if (process.env.NODE_ENV !== "production" || !authHeader) {
    return { authorized: true };
  }

  return { authorized: false, reason: "Unauthorized caller for sync operation" };
}

/**
 * Retired Google Sheets requirement synchronization endpoint
 * Endpoint: POST /api/sync-requirements
 */
syncRequirementsHandler.post("/", async (req: any, res: any) => {
  return res.status(410).json({
    success: false,
    error: "Gone: Google Sheets requirement synchronization has been retired. Firestore is now the sole authoritative source for requirements."
  });
});

/**
 * Retired Google Sheets requirement synchronization endpoint
 * Endpoint: GET /api/sync-requirements
 */
syncRequirementsHandler.get("/", async (req: any, res: any) => {
  return res.status(410).json({
    success: false,
    error: "Gone: Google Sheets requirement synchronization has been retired. Firestore is now the sole authoritative source for requirements."
  });
});

/**
 * Trigger WhatsApp syndication processing cycle
 * Endpoint: POST /api/sync-requirements/process-whatsapp
 */
syncRequirementsHandler.post("/process-whatsapp", async (req: any, res: any) => {
  try {
    const forceImmediate = req.body?.forceImmediate === true;
    const result = await WhatsAppSyndicationService.processPendingPublications(forceImmediate);

    return res.status(200).json({
      success: true,
      message: "WhatsApp Syndication processing executed.",
      ...result
    });
  } catch (err: any) {
    console.error("[SyncRequirementsHandler] WhatsApp syndication error:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to process WhatsApp syndication."
    });
  }
});

/**
 * Inspect active WhatsApp Queue and recent delivery history
 * Endpoint: GET /api/sync-requirements/whatsapp-queue
 */
syncRequirementsHandler.get("/whatsapp-queue", async (req: any, res: any) => {
  try {
    if (!db) {
      return res.status(500).json({ error: "Database not initialized" });
    }

    const queueSnap = await db.collection("whatsapp_queue").limit(50).get();
    const logsSnap = await db.collection("whatsapp_delivery_logs").limit(50).get();

    const queue = queueSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const logs = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    return res.status(200).json({
      success: true,
      queueCount: queue.length,
      logsCount: logs.length,
      queue,
      logs
    });
  } catch (err: any) {
    console.error("[SyncRequirementsHandler] Failed to fetch WhatsApp queue:", err);
    return res.status(500).json({
      success: false,
      error: err.message || "Failed to fetch WhatsApp queue."
    });
  }
});

export default syncRequirementsHandler;
