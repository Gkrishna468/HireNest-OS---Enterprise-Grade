import { IntakeEnvelope } from "./IntakeEnvelope";
import { ClassificationResult } from "./EntityClassifier";

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
