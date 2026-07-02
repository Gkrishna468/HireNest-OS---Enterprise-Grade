import { IntakeEnvelope } from "./IntakeEnvelope.js";
import { AIRuntime } from "../services/AIRuntime.js";

export type EntityClassification =
  | "Requirement"
  | "Resume"
  | "Vendor"
  | "Client"
  | "Invoice"
  | "Offer"
  | "Interview"
  | "Contract"
  | "Joining"
  | "Partnership"
  | "Unknown";

export interface ClassificationResult {
  type: EntityClassification;
  confidence: number;
  evidence: string[];
}

export class EntityClassifier {
  static async classify(
    envelope: IntakeEnvelope,
  ): Promise<ClassificationResult> {
    const text = (
      (envelope.subject || "") +
      " " +
      (envelope.body || "")
    ).toLowerCase();

    // Deterministic Checks
    if (text.includes("invoice") && text.includes("amount")) {
      return {
        type: "Invoice",
        confidence: 90,
        evidence: ['Contains "invoice" and "amount"'],
      };
    }

    if (envelope.attachments && envelope.attachments.length > 0) {
      const hasPdf = envelope.attachments.some((a) =>
        a.filename.toLowerCase().endsWith(".pdf"),
      );
      if (
        hasPdf &&
        (text.includes("resume") ||
          text.includes("cv") ||
          text.includes("profile"))
      ) {
        return {
          type: "Resume",
          confidence: 85,
          evidence: ["PDF attachment", "Contains resume keywords"],
        };
      }
    }

    if (
      text.includes("requirement") ||
      text.includes("job description") ||
      text.includes("jd")
    ) {
      return {
        type: "Requirement",
        confidence: 80,
        evidence: ["Contains requirement keywords"],
      };
    }

    // AI Fallback
    try {
      const prompt = `Classify this intake message into one of: Requirement, Resume, Vendor, Client, Invoice, Offer, Interview, Contract, Joining, Partnership, Unknown.
Subject: ${envelope.subject}
Body: ${envelope.body}
Attachments: ${envelope.attachments?.map((a) => a.filename).join(", ") || "None"}

Return strictly a JSON object: { "type": "...", "confidence": <number 0-100>, "evidence": ["..."] }`;

      const aiRes = await AIRuntime.analyze({
        prompt,
        capability: "intake.classify" as any,
        modelPreference: "fast",
        schema: true,
        compressContext: true,
      });

      if (aiRes.outcome === "success" && aiRes.data) {
        let parsed = aiRes.data;
        if (typeof parsed === "string") {
          try {
            parsed = JSON.parse(parsed);
          } catch (e) {}
        }
        return {
          type: parsed.type || "Unknown",
          confidence: parsed.confidence || 50,
          evidence: parsed.evidence || ["AI Classification"],
        };
      }
    } catch (e) {
      console.error("[EntityClassifier] AI Classification failed", e);
    }

    return {
      type: "Unknown",
      confidence: 10,
      evidence: ["Failed to classify deterministically or via AI"],
    };
  }
}
