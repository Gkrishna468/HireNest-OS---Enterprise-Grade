import { temporal } from "../temporal/engine.js";
import "../temporal/workflows/candidate-lifecycle.js";
import "../temporal/workflows/vendor-governance.js";
import "../temporal/workflows/ai-copilot.js";
import "../temporal/workflows/sla-escalation.js";
import "../temporal/workflows/interview-coordination.js";
import { adminDb } from "../../lib/firebase-admin.js";
import { AIRuntime } from "../services/AIRuntime.js";

export default async function workflowsHandler(req: any, res: any) {
  if (req.method === "POST") {
    const { action, workflowType, input, workflowId, signalName, signalData } =
      req.body;

    switch (action) {
      case "start":
        const newId = await temporal.startWorkflow(workflowType, input);
        return res.json({ success: true, workflowId: newId });

      case "signal":
        await temporal.signalWorkflow(workflowId, signalName, signalData);
        return res.json({ success: true });

      case "generate-rule": {
        const { description } = input || {};
        if (!description) {
          return res.status(400).json({ error: "Description is required for rule generation" });
        }

        const prompt = `You are the Workflow Automation Architect for HireNestOS.
Your task is to parse a natural language description and generate a high-precision, compliant SOP Automation Rule.

Natural Language Requirement: "${description}"

Generate a single automation rule matching the system's strict schema:
- Trigger events MUST be one of:
  * "REQUIREMENT_CREATED": requirement created in the system
  * "CANDIDATE_MATCHED": candidate matched to a job requirement
  * "SUBMISSION_RECEIVED": candidate submission dossier received
  * "INTERVIEW_SCHEDULED": candidate interview scheduled
  * "REVENUE_ALERT": revenue threshold reached or budget limits breached
  * "SLA_RISK_DETECTED": SLA feedback window risk identified
- Category MUST be one of: "Recruiter" | "Vendor" | "Client" | "Executive"
- Priority MUST be one of: "High" | "Medium" | "Low"
- Approval Policy MUST be one of: "Auto" | "Requires Recruiter Approval" | "Requires Admin Approval"
- Conditions must be an array of objects with:
  * field (e.g., "matchScore", "unfilledDays", "daysInStatus", "aiTokenUsageCost", "contractValue", "riskScore")
  * operator (one of: "==", ">=", "<=", "contains", "!=")
  * value (as a string, e.g., "90", "14", "3", "100", "50000")
- Actions must be an array of objects with:
  * type (one of: "GENERATE_DRAFT" | "SEND_EMAIL" | "SEND_SMS" | "BROADCAST" | "TRIGGER_ALERT" | "ESCALATE" | "NOTIFY_SLACK")
  * target (e.g., "Client Panel", "Admins", "Hiring Manager", "VIP Recruiting Lead")
  * template (e.g., "SOP-100: ... detail guidelines or instruct AI to draft a check-in")

Return a raw JSON object with these fields (and no markdown formatting wrapped except the JSON block):
{
  "name": "Standard, humble descriptive name",
  "category": "category string",
  "trigger": "trigger string",
  "priority": "priority string",
  "enabled": true,
  "approvalPolicy": "policy string",
  "owner": "e.g., System Auto Generator or SLA Board",
  "version": "1.0",
  "conditions": [ ... ],
  "actions": [ ... ],
  "explanation": "Provide a brief 1-2 sentence justification explaining why this automation saves time and keeps SLAs intact."
}`;

        try {
          const aiResponse = await AIRuntime.analyze({
            prompt: prompt,
            modelPreference: "fast",
            schema: true
          });

          if (aiResponse.outcome === "failed") {
            return res.status(500).json({ error: "AI Rule Generation failed." });
          }

          // Return parsed JSON data
          return res.json({ success: true, rule: aiResponse.data });
        } catch (error: any) {
          console.error("AI rule generation handler error:", error);
          return res.status(500).json({ error: error.message });
        }
      }

      default:
        return res.status(400).json({ error: "Invalid action" });
    }
  } else if (req.method === "GET") {
    const snapshot = await adminDb
      .collection("workflows")
      .orderBy("updatedAt", "desc")
      .limit(20)
      .get();

    const workflows = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      };
    });

    return res.json({ workflows });
  }
}
