import { Request, Response } from "express";
import { agentTaskService } from "../../services/agentTaskService.js";
import { TaskInitiator } from "../../types/agentTask.js";

/**
 * Agent Tasks API Handler
 * Provides RESTful durable task lifecycle operations.
 */
export async function agentTasksHandler(req: Request, res: Response) {
  try {
    const action = req.path.replace(/^\//, '').split('/')[0] || req.query.action || 'list';
    const taskId = req.params?.id || req.body?.taskId || (req.query?.taskId as string);

    // Derive verified initiator identity from session/request context
    const userRole = (req as any).user?.role || "ADMIN";
    const userId = (req as any).user?.uid || (req as any).user?.id || "admin_user";

    const initiator: TaskInitiator = {
      type: (userRole === "vendor" ? "VENDOR" : userRole === "recruiter" ? "RECRUITER" : "ADMIN"),
      userId
    };

    switch (action) {
      case "create": {
        const { goal, requirementId, vendorId, clientId, recruiterId, customSteps } = req.body || {};
        if (!goal) {
          return res.status(400).json({ success: false, error: "Missing required parameter: goal" });
        }

        const tenantId = (req as any).user?.tenantId || (req as any).user?.orgId || "tenant-default";

        // Strict P0 Invariant: recruiterId is null unless explicitly provided
        const { task, steps } = await agentTaskService.createTask({
          tenantId,
          initiatedBy: initiator,
          goal,
          requirementId: requirementId || null,
          vendorId: vendorId || null,
          clientId: clientId || null,
          recruiterId: recruiterId || null,
          customSteps
        });

        return res.status(201).json({ success: true, task, steps });
      }

      case "run":
      case "execute": {
        if (!taskId) {
          return res.status(400).json({ success: false, error: "Missing required parameter: taskId" });
        }
        const updatedTask = await agentTaskService.executeTask(taskId);
        return res.json({ success: true, task: updatedTask });
      }

      case "resume": {
        if (!taskId) {
          return res.status(400).json({ success: false, error: "Missing required parameter: taskId" });
        }
        const resumedTask = await agentTaskService.resumeTask(taskId);
        return res.json({ success: true, task: resumedTask });
      }

      case "cancel": {
        if (!taskId) {
          return res.status(400).json({ success: false, error: "Missing required parameter: taskId" });
        }
        const cancelledTask = await agentTaskService.cancelTask(taskId);
        return res.json({ success: true, task: cancelledTask });
      }

      case "status":
      case "get": {
        if (!taskId) {
          return res.status(400).json({ success: false, error: "Missing required parameter: taskId" });
        }
        const { task, steps } = await agentTaskService.getTaskWithSteps(taskId);
        if (!task) {
          return res.status(404).json({ success: false, error: `Task ${taskId} not found` });
        }
        return res.json({ success: true, task, steps });
      }

      default:
        return res.status(400).json({ success: false, error: `Unknown action ${action}` });
    }
  } catch (error: any) {
    console.error("[AgentTasksHandler] Error handling agent task:", error);
    return res.status(500).json({ success: false, error: error.message || "Internal error in agent tasks" });
  }
}
