import { adminDb } from "../../lib/firebase-admin.js";
import { AIGateway } from "../services/AIGateway.js";

export default async function copilotHandler(req: any, res: any) {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    // 1. Context Gathering: Fetch high-level summary of the database to feed Gemini
    // For performance, we fetch counts or top records.
    let summary = "System Context:\n";

    try {
      const reqSnap = await adminDb
        .collection("requirements_public")
        .where("status", "==", "OPEN")
        .limit(50)
        .get();
      summary += `- Open Requirements: ${reqSnap.size}\n`;

      const candsSnap = await adminDb
        .collection("candidatePool")
        .limit(10)
        .get();
      summary += `- Total Candidates (sample limit 10): ${candsSnap.size}\n`;

      const dealRoomsSnap = await adminDb
        .collection("dealRooms")
        .where("status", "!=", "CLOSED")
        .limit(50)
        .get();
      summary += `- Active Deal Rooms: ${dealRoomsSnap.size}\n`;

      const matchSnap = await adminDb
        .collection("candidate_matches")
        .limit(50)
        .get();
      summary += `- Candidate Matches (sample): ${matchSnap.size}\n`;

      const vendorSnap = await adminDb.collection("vendor_performance").get();
      summary += `- Active Vendors: ${vendorSnap.size}\n`;

      const invoiceSnap = await adminDb
        .collection("invoices")
        .where("status", "==", "ISSUED")
        .get();
      summary += `- Pending Invoices: ${invoiceSnap.size}\n`;
    } catch (e) {
      console.error("Failed to gather copilot context", e);
    }

    // 2. Query AIGateway
    const prompt = `You are the AI Copilot for HireNestOS, an AI Staffing Operating System.
You help the Managing Director and Admins understand their business metrics, search for entities, and identify risks.
You have access to the following current system context summary:
${summary}

User query: "${query}"

Provide a concise, professional, and actionable insight based on the query. If the query asks for specific numbers you don't have, give an approximate status based on the context summary provided.
Format your response as a JSON object with the following properties:
- insight (string): The main answer or finding.
- reason (string): Brief explanation of why or the underlying data.
- sources (array of strings): Which collections or data points were used (e.g., ["requirements_public", "dealRooms"]).
- action (string): A recommended action to take in the system.

JSON format only.`;

    const aiResponse = await AIGateway.analyze({
      prompt: prompt,
      modelPreference: "fast",
      schema: true,
    });

    if (aiResponse.outcome === "failed") {
      return res
        .status(500)
        .json({ error: "AI Gateway failed to generate copilot insight." });
    }

    return res.json(aiResponse.data);
  } catch (error: any) {
    console.error("Copilot Handler error:", error);
    return res.status(500).json({ error: error.message });
  }
}
