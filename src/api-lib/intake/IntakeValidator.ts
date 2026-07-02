import { IntakeEnvelope } from "./IntakeEnvelope.js";
import { ClassificationResult } from "./EntityClassifier.js";

export class IntakeValidator {
  static validate(
    envelope: IntakeEnvelope,
    classification: ClassificationResult,
  ): boolean {
    // Validation business logic
    if (classification.confidence < 80) {
      return false; // Escalate to manual review queue
    }

    if (classification.type === "Unknown") {
      return false;
    }

    return true;
  }
}
