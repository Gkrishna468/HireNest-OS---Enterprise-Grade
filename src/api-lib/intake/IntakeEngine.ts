import { IntakeEnvelope } from "./IntakeEnvelope";
import { SourceNormalizer } from "./SourceNormalizer";
import { EntityClassifier } from "./EntityClassifier";
import { IntakeValidator } from "./IntakeValidator";
import { DuplicateResolver } from "./DuplicateResolver";
import { OrganizationResolver } from "./OrganizationResolver";
import { IntakeEventType } from "./IntakeEvents";
import { adminDb } from "../../lib/firebase-admin";
import { IntakeMetrics } from "./IntakeMetrics";
import { IntakeAudit } from "./IntakeAudit";
import { ManualReviewQueue } from "./ManualReviewQueue";
import { RelationshipBuilder } from "./RelationshipBuilder";

export class IntakeEngine {
  static async process(rawPayload: any, source: string): Promise<any> {
    const startTime = Date.now();
    console.log(`[IntakeEngine] Processing intake from ${source}`);

    // 1. Normalize
    const envelope = SourceNormalizer.normalize(rawPayload, source);
    await this.logEvent(envelope, IntakeEventType.INTAKE_RECEIVED, {
      source: envelope.source,
    });
    await IntakeMetrics.increment(envelope.tenantId, `source_${envelope.source}`);

    // 2. Classify
    const classification = await EntityClassifier.classify(envelope);
    await this.logEvent(
      envelope,
      IntakeEventType.ENTITY_CLASSIFIED,
      classification,
    );

    // 3. Resolve Organization
    const orgContext = await OrganizationResolver.resolve(
      envelope.sender,
      envelope.tenantId,
    );

    // 4. Validate
    const isValid = IntakeValidator.validate(envelope, classification);
    if (!isValid) {
      await this.logEvent(envelope, IntakeEventType.INTAKE_FAILED, {
        reason: "Validation Failed or Low Confidence",
        classification,
      });
      await ManualReviewQueue.enqueue(envelope, classification, "Validation Failed or Low Confidence");
      await IntakeMetrics.increment(envelope.tenantId, `status_manual_review`);
      
      await IntakeAudit.log(envelope, {
          correlationId: envelope.correlationId,
          source: envelope.source,
          confidence: classification.confidence,
          rulesUsed: classification.evidence,
          executionTimeMs: Date.now() - startTime,
          status: "MANUAL_REVIEW",
          createdEntities: [],
          relationships: []
      });
      
      return { status: "manual_review_required", envelope, classification };
    }

    // 5. Deduplicate
    const isDup = await DuplicateResolver.isDuplicate(
      envelope.body,
      classification.type,
      envelope.tenantId,
    );
    if (isDup) {
      await this.logEvent(envelope, IntakeEventType.INTAKE_FAILED, {
        reason: "Duplicate Detected",
      });
      await IntakeMetrics.increment(envelope.tenantId, `status_duplicate`);
      
      await IntakeAudit.log(envelope, {
          correlationId: envelope.correlationId,
          source: envelope.source,
          confidence: classification.confidence,
          rulesUsed: classification.evidence,
          executionTimeMs: Date.now() - startTime,
          status: "DUPLICATE",
          createdEntities: [],
          relationships: []
      });
      
      return { status: "duplicate", envelope };
    }

    // 6. Create Entities (Placeholder)
    await this.logEvent(envelope, IntakeEventType.ENTITY_CREATED, {
      type: classification.type,
      orgContext,
    });
    const createdEntities = [{ id: "mock-id-1", type: classification.type }];
    await IntakeMetrics.increment(envelope.tenantId, `type_${classification.type.toLowerCase()}`);

    // 7. Business Graph & Match
    await RelationshipBuilder.build(envelope, classification, createdEntities, orgContext);
    await this.logEvent(envelope, IntakeEventType.BUSINESS_GRAPH_UPDATED, {});

    if (
      classification.type === "Requirement" ||
      classification.type === "Resume"
    ) {
      await this.logEvent(envelope, IntakeEventType.MATCH_REQUESTED, {});
    }

    await IntakeMetrics.increment(envelope.tenantId, `status_success`);
    await IntakeAudit.log(envelope, {
          correlationId: envelope.correlationId,
          source: envelope.source,
          confidence: classification.confidence,
          rulesUsed: classification.evidence,
          executionTimeMs: Date.now() - startTime,
          status: "SUCCESS",
          createdEntities,
          relationships: [] // To be populated if needed
    });

    return { status: "success", envelope, classification, orgContext };
  }

  private static async logEvent(
    envelope: IntakeEnvelope,
    eventType: IntakeEventType,
    data: any,
  ) {
    if (!adminDb) return;
    try {
      await adminDb.collection("intake_events").add({
        intakeId: envelope.id,
        tenantId: envelope.tenantId,
        eventType,
        timestamp: new Date().toISOString(),
        data,
      });
      console.log(
        `[IntakeEngine] Event logged: ${eventType} for ${envelope.id}`,
      );
    } catch (e) {
      console.error("[IntakeEngine] Event log failed", e);
    }
  }
}
