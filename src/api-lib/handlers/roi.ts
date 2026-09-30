import { Request, Response } from "express";
import { roiEngine } from "../../services/roiEngine.js";

/**
 * ROI API Handler (HN-ROI Layer)
 * Provides business event recording and economic intelligence summary.
 */
export async function roiHandler(req: Request, res: Response) {
  try {
    const action = req.path.replace(/^\//, '').split('/')[0] || req.query.action || 'summary';

    switch (action) {
      case "summary": {
        const isAdmin = (req as any).user?.role === 'admin' || (req as any).user?.role === 'super_admin';
        if (!isAdmin) {
          return res.status(403).json({ success: false, error: "Access denied" });
        }
        const tenantId = (req.query?.tenantId as string) || (req as any).user?.tenantId || undefined;
        const summary = await roiEngine.getSummary(tenantId);
        return res.json({ success: true, summary });
      }

      case "record-event": {
        const { 
          requirementId, 
          eventType, 
          stage, 
          candidateId, 
          vendorId, 
          recruiterId, 
          estimatedValue, 
          realizedValue, 
          cost, 
          metadata 
        } = req.body || {};

        if (!requirementId || !eventType || !stage) {
          return res.status(400).json({ 
            success: false, 
            error: "Missing required parameters: requirementId, eventType, stage" 
          });
        }

        const tenantId = (req as any).user?.tenantId || "tenant-default";
        const actorId = (req as any).user?.uid || "admin_user";
        const actorType = (req as any).user?.role === "vendor" ? "VENDOR" : (req as any).user?.role === "recruiter" ? "RECRUITER" : "ADMIN";

        // Strict Admin-Only ROI Governance: Vendors cannot record commercial revenue realization or manipulate costs
        if (actorType === "VENDOR" && (stage === "BOOKED" || stage === "REALIZED" || realizedValue > 0 || cost)) {
          return res.status(403).json({
            success: false,
            error: "FORBIDDEN: Vendors and external actors cannot record commercial revenue realization or manipulate operating costs."
          });
        }

        // Strict P0 Invariant: recruiterId is null unless explicitly provided
        const event = await roiEngine.recordEvent({
          tenantId,
          requirementId,
          eventType,
          stage,
          actorType,
          actorId,
          recruiterId: recruiterId || null,
          vendorId: vendorId || null,
          candidateId: candidateId || null,
          estimatedValue: estimatedValue || 0,
          realizedValue: realizedValue || 0,
          cost,
          metadata
        });

        return res.status(201).json({ success: true, event });
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown action ${action}` });
    }
  } catch (error: any) {
    console.error("[ROIHandler] Error handling ROI request:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal error in ROI engine" });
  }
}
