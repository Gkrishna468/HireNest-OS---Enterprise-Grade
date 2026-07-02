import { IntakeAttachment } from "./IntakeEnvelope";

export class AttachmentProcessor {
  static async process(attachment: IntakeAttachment): Promise<string> {
    // Fallback or interface for extracting text via PDF parsing, DOCX reading, OCR, etc.
    // In a real implementation this would stream to a parsing service.
    return `[Extracted Content for ${attachment.filename}]`;
  }
}
