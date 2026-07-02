import { BaseAIOffice } from "./BaseAIOffice.js";
import { BusinessEvent, OfficeExecutionResult } from "./RuntimeTypes.js";
import { ModelGateway } from "./ModelGateway.js";
import { EventBus } from "../../services/EventBus.js";

export class ClientOffice extends BaseAIOffice {
  readonly name = "ClientOffice";

  readonly policy = {
    supportedEvents: ["SUBMISSION_APPROVED", "INTERVIEW_REQUESTED"],
    priority: "HIGH" as const,
    concurrency: 5,
    maximumRuntimeMs: 30000,
    dependencies: [],
    maxRetries: 3,
    retryDelayMs: 2000,
    backoffMultiplier: 2,
    maximumDelayMs: 30000,
    retryableErrorTypes: ["timeout"],
    permanentErrorTypes: ["validation_error"],
    healthCheckIntervalMs: 60000,
    heartbeatIntervalMs: 15000,
  };

  protected async decisionEngine(
    event: BusinessEvent,
    memory: any,
  ): Promise<boolean> {
    return this.policy.supportedEvents.includes(event.eventType);
  }

  protected async execute(
    event: BusinessEvent,
    memory: any,
  ): Promise<OfficeExecutionResult> {
    const startTime = Date.now();
    try {
      if (event.eventType === "SUBMISSION_APPROVED") {
        const payload = event.payload;

        const prompt = `Analyze this approved submission for client presentation.
JSON with:
- presentationStrategy: 'DIRECT_EMAIL', 'PORTAL_UPLOAD', 'REVIEW_WITH_MANAGER'
- summary: string

Data: ${JSON.stringify(payload)}`;

        const response = await ModelGateway.generate({
          prompt,
          modelAlias: "flash",
          temperature: 0.1,
          schema: {
            type: "object",
            properties: {
              presentationStrategy: { type: "string" },
              summary: { type: "string" },
            },
            required: ["presentationStrategy", "summary"],
          },
        });

        const strategy = JSON.parse(response.text);

        await EventBus.publishInternal({
          eventId: `evt-client-pres-${Date.now()}`,
          eventType: "CLIENT_PRESENTATION_READY",
          eventVersion: 1,
          correlationId: event.correlationId,
          causationId: event.eventId,
          entityType: "SUBMISSION",
          entityId: event.entityId,
          tenantId: event.tenantId,
          source: this.name,
          priority: "HIGH",
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          retryCount: 0,
          traceId: event.traceId,
          payload: { ...payload, strategy: strategy.presentationStrategy, summary: strategy.summary },
          metadata: {},
          type: "CLIENT_PRESENTATION_READY",
        });

        return {
          success: true,
          actionTaken: `Client presentation prepared: ${strategy.presentationStrategy}`,
          tokensUsed: response.tokensUsed,
          model: response.model,
        };
      }

      return { success: true, actionTaken: "No specific action required" };
    } catch (error: any) {
      return {
        success: false,
        reason: error.message,
        errorType: "SYSTEM_ERROR",
        errorStack: error.stack,
      };
    }
  }
}
