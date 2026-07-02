import { BaseAIOffice } from "./BaseAIOffice.js";
import { BusinessEvent, OfficeExecutionResult } from "./RuntimeTypes.js";
import { ModelGateway } from "./ModelGateway.js";
import { EventBus } from "../../services/EventBus.js";

export class SubmissionOffice extends BaseAIOffice {
  readonly name = "SubmissionOffice";

  readonly policy = {
    supportedEvents: ["CANDIDATE_CREATED", "CANDIDATE_UPDATED", "VENDOR_SUBMISSION"],
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
      if (event.eventType === "CANDIDATE_CREATED" || event.eventType === "VENDOR_SUBMISSION") {
        const payload = event.payload;

        const prompt = `Analyze this new submission and determine routing.
JSON with:
- action: 'APPROVE', 'REJECT', 'MANUAL_REVIEW'
- reason: string
- matchScore: number (0-100)

Data: ${JSON.stringify(payload)}`;

        const response = await ModelGateway.generate({
          prompt,
          modelAlias: "flash",
          temperature: 0.1,
          schema: {
            type: "object",
            properties: {
              action: { type: "string" },
              reason: { type: "string" },
              matchScore: { type: "number" },
            },
            required: ["action", "reason", "matchScore"],
          },
        });

        const strategy = JSON.parse(response.text);

        if (strategy.action === "APPROVE") {
           await EventBus.publishInternal({
            eventId: `evt-sub-app-${Date.now()}`,
            eventType: "SUBMISSION_APPROVED",
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
            payload: { ...payload, matchScore: strategy.matchScore },
            metadata: {},
            type: "SUBMISSION_APPROVED",
          });
        }

        return {
          success: true,
          actionTaken: `Submission ${strategy.action} with score ${strategy.matchScore}`,
          tokensUsed: response.tokensUsed,
          model: response.model,
          decisions: [{
            decisionId: `dec-sub-${Date.now()}`,
            office: this.name,
            eventId: event.eventId,
            decision: `Submission ${strategy.action}`,
            confidence: 0.85,
            reasoning: [strategy.reason],
            evidence: [],
            rulesApplied: ["Submission Routing v1"],
            alternativeOptionsConsidered: [],
            fallbackUsed: false,
            executionTimeMs: Date.now() - startTime,
            model: response.model,
            promptVersion: "v1",
            runtimeVersion: "v1.0",
            decisionEngineVersion: "v3.1",
            capabilityBrokerVersion: "v2.0",
            context: {},
            createdAt: new Date().toISOString(),
          }]
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
