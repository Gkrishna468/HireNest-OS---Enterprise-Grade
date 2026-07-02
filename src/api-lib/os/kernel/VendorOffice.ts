import { BaseAIOffice } from "./BaseAIOffice.js";
import { BusinessEvent, OfficeExecutionResult } from "./RuntimeTypes.js";
import { ModelGateway } from "./ModelGateway.js";
import { db } from "../../../lib/firebase-admin.js";

export class VendorOffice extends BaseAIOffice {
  readonly name = "VendorOffice";

  readonly policy = {
    supportedEvents: ["MATCH_COMPLETED", "VENDOR_PERFORMANCE_UPDATE"],
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
      if (event.eventType === "MATCH_COMPLETED") {
        // Broadcast to vendors based on requirement matching
        const reqData = event.payload;

        const prompt = `Analyze this requirement match result and generate a vendor broadcasting message.
JSON with:
- broadcastMessage: string
- targetVendorTier: 'TIER_1' | 'TIER_2' | 'ALL'
- priority: 'URGENT' | 'NORMAL'

Data: ${JSON.stringify(reqData)}`;

        const response = await ModelGateway.generate({
          prompt,
          modelAlias: "flash",
          temperature: 0.2,
          schema: {
            type: "object",
            properties: {
              broadcastMessage: { type: "string" },
              targetVendorTier: { type: "string" },
              priority: { type: "string" },
            },
            required: ["broadcastMessage", "targetVendorTier", "priority"],
          },
        });

        const strategy = JSON.parse(response.text);

        // Record Vendor Broadcast
        if (db) {
            await db.collection("vendor_broadcasts").add({
                requirementId: event.entityId,
                tenantId: event.tenantId,
                broadcastMessage: strategy.broadcastMessage,
                targetVendorTier: strategy.targetVendorTier,
                priority: strategy.priority,
                status: "SENT",
                createdAt: new Date().toISOString()
            });
        }

        return {
          success: true,
          actionTaken: `Broadcasted to ${strategy.targetVendorTier} Vendors`,
          tokensUsed: response.tokensUsed,
          model: response.model,
          decisions: [{
            decisionId: `dec-vendor-${Date.now()}`,
            office: this.name,
            eventId: event.eventId,
            decision: `Targeted ${strategy.targetVendorTier} vendors.`,
            confidence: 0.95,
            reasoning: ["Match completed event triggered vendor sourcing"],
            evidence: [],
            rulesApplied: ["Vendor Broadcasting v1"],
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
