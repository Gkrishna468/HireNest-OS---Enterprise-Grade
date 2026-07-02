import { IntakeEnvelope } from "./IntakeEnvelope";
import { ClassificationResult } from "./EntityClassifier";
import { adminDb } from "../../lib/firebase-admin";

export class ManualReviewQueue {
    static async enqueue(
        envelope: IntakeEnvelope,
        classification: ClassificationResult,
        reason: string
    ) {
        if (!adminDb) return;
        
        try {
            await adminDb.collection("intake_review_queue").add({
                intakeId: envelope.id,
                tenantId: envelope.tenantId,
                correlationId: envelope.correlationId,
                source: envelope.source,
                reason,
                confidence: classification.confidence,
                classificationType: classification.type,
                status: "PENDING_REVIEW",
                envelopeSummary: {
                    sender: envelope.sender,
                    subject: envelope.subject,
                    receivedAt: envelope.receivedAt,
                    attachmentsCount: envelope.attachments?.length || 0
                },
                createdAt: new Date().toISOString()
            });
            console.log(`[ManualReviewQueue] Enqueued intake ${envelope.id} for manual review.`);
        } catch (e) {
            console.error("[ManualReviewQueue] Failed to enqueue", e);
        }
    }
}
