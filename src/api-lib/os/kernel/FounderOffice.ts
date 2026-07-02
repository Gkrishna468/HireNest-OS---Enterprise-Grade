import { BaseAIOffice } from "./BaseAIOffice.js";
import { BusinessEvent, OfficeExecutionResult } from "./RuntimeTypes.js";
import { db } from "../../../lib/firebase-admin.js";

export class FounderOffice extends BaseAIOffice {
  readonly name = "FounderOffice";

  readonly policy = {
    supportedEvents: ["REQUIREMENT_CREATED", "SUBMISSION_APPROVED", "OFFER_ACCEPTED", "PIPELINE_STALLED"],
    priority: "HIGH" as const,
    concurrency: 2,
    maximumRuntimeMs: 30000,
    dependencies: [],
    maxRetries: 1,
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
      // The Founder Office provides high-level executive summaries and metrics updates
      // This is the "Executive Dashboard" data feed.
      if (db) {
          await db.collection('executive_briefings').add({
              eventId: event.eventId,
              eventType: event.eventType,
              tenantId: event.tenantId,
              timestamp: new Date().toISOString(),
              summary: `Executive milestone reached: ${event.eventType}`,
              data: event.payload
          });
      }

      return {
        success: true,
        actionTaken: `Logged milestone to Executive Briefings`,
        tokensUsed: 0,
        model: "N/A",
      };
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
