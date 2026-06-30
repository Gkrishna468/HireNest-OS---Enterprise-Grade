import { BaseAIOffice } from "./BaseAIOffice.js";
import {
  BusinessEvent,
  OfficeExecutionResult,
  AIDecisionRecord,
} from "./RuntimeTypes.js";
import { EventBus } from "../../services/EventBus.js";
import { WorkflowEngine } from "./WorkflowEngine.js";
import { db } from "../../../lib/firebase-admin.js";
import { ModelGateway } from "./ModelGateway.js";

export class RecruitmentOffice extends BaseAIOffice {
  readonly name = "RecruitmentOffice";
  readonly policy = {
    supportedEvents: [
      "REQUIREMENT_CREATED",
      "REQUIREMENT_UPDATED",
      "SOURCING_SLA_BREACH",
      "SUBMISSION_CREATED",
      "PIPELINE_STALLED",
    ],
    priority: "HIGH" as const,
    concurrency: 5,
    maximumRuntimeMs: 30000,
    dependencies: [],
    maxRetries: 3,
    retryDelayMs: 2000,
    backoffMultiplier: 2,
    maximumDelayMs: 30000,
    retryableErrorTypes: ["NETWORK_ERROR", "TIMEOUT"],
    permanentErrorTypes: ["VALIDATION_ERROR"],
    healthCheckIntervalMs: 60000,
    heartbeatIntervalMs: 15000,
    governance: {
      maxHourlyExecutions: 2000,
      maxCostPerHour: 50,
      businessHoursOnly: false,
    },
  };

  protected async decisionEngine(
    event: BusinessEvent,
    memory: any,
  ): Promise<boolean> {
    // Decide if we should act on this event
    const allowedTypes = this.policy.supportedEvents;
    return allowedTypes.includes(event.eventType);
  }

  protected async execute(
    event: BusinessEvent,
    memory: any,
  ): Promise<OfficeExecutionResult> {
    const decisions: AIDecisionRecord[] = [];
    const startTime = Date.now();

    try {
      if (event.eventType === "REQUIREMENT_CREATED") {
        const reqData = event.payload;

        // 1. Determine Sourcing Strategy
        const strategyPrompt = `Analyze the following job requirement and determine the best sourcing strategy. 
Provide a JSON response with:
- strategyType: 'INTERNAL_ONLY', 'VENDOR_BROADCAST', 'HYBRID', 'TARGETED_HEADHUNTING'
- reason: brief explanation
- estimatedTimeToFillDays: integer

Requirement:
${JSON.stringify(reqData)}`;

        const strategyResponse = await ModelGateway.generate({
          prompt: strategyPrompt,
          modelAlias: "flash",
          temperature: 0.1,
          schema: {
            type: "object",
            properties: {
              strategyType: { type: "string" },
              reason: { type: "string" },
              estimatedTimeToFillDays: { type: "number" },
            },
            required: ["strategyType", "reason", "estimatedTimeToFillDays"],
          },
        });

        const strategy = JSON.parse(strategyResponse.text);

        decisions.push({
          decisionId: `dec-${Date.now()}-1`,
          office: this.name,
          eventId: event.eventId,
          decision: `Selected strategy: ${strategy.strategyType}`,
          confidence: 0.9,
          reasoning: [strategy.reason],
          evidence: [reqData.title, reqData.department],
          rulesApplied: ["Strategy Selection v1"],
          alternativeOptionsConsidered: ["VENDOR_BROADCAST"],
          fallbackUsed: false,
          executionTimeMs: Date.now() - startTime,
          model: strategyResponse.model,
          promptVersion: "v1",
          runtimeVersion: "v1.0",
          decisionEngineVersion: "v3.1",
          capabilityBrokerVersion: "v2.0",
          context: {},
          createdAt: new Date().toISOString(),
        });

        // 2. Start Workflow
        const workflowId = await WorkflowEngine.startWorkflow(
          "RequirementLifecycle",
          event.tenantId,
          event.entityId,
          "REQUIREMENT",
          { strategy: strategy.strategyType },
          event.correlationId,
        );

        // 3. Assign Recruiter
        // Simplified assignment: just picking a recruiter from DB or default
        let assignedRecruiterId = "recruiter-default";
        if (db) {
          const snap = await db
            .collection("users")
            .where("role", "==", "recruiter")
            .limit(1)
            .get();
          if (!snap.empty) {
            assignedRecruiterId = snap.docs[0].id;
          }
        }

        // Publish Domain Event
        await EventBus.publishInternal({
          eventId: `evt-${Date.now()}-2`,
          eventType: "RecruiterAssigned",
          eventVersion: 1,
          correlationId: event.correlationId,
          causationId: event.eventId,
          entityType: "REQUIREMENT",
          entityId: event.entityId,
          tenantId: event.tenantId,
          source: this.name,
          priority: "HIGH",
          createdAt: new Date().toISOString(),
          publishedAt: new Date().toISOString(),
          retryCount: 0,
          traceId: event.traceId,
          payload: {
            requirementId: event.entityId,
            recruiterId: assignedRecruiterId,
          },
          metadata: {},
          type: "RecruiterAssigned",
        });

        await WorkflowEngine.startStep(
          workflowId,
          "Sourcing",
          this.name,
          false,
        );

        return {
          success: true,
          actionTaken: "Determined Strategy and Started Workflow",
          tokensUsed: strategyResponse.tokensUsed,
          model: strategyResponse.model,
          decisions,
        };
      }

      if (event.eventType === "PIPELINE_STALLED") {
        const reqData = event.payload;

        const prompt = `Analyze this stalled pipeline and recommend next actions.
JSON with:
- recommendation: string
- escalationRequired: boolean

Pipeline context: ${JSON.stringify(reqData)}`;

        const response = await ModelGateway.generate({
          prompt,
          modelAlias: "flash",
          temperature: 0.2,
          schema: {
            type: "object",
            properties: {
              recommendation: { type: "string" },
              escalationRequired: { type: "boolean" },
            },
            required: ["recommendation", "escalationRequired"],
          },
        });

        const rec = JSON.parse(response.text);

        decisions.push({
          decisionId: `dec-${Date.now()}-2`,
          office: this.name,
          eventId: event.eventId,
          decision: `Stalled pipeline action: ${rec.recommendation}`,
          confidence: 0.85,
          reasoning: ["Pipeline has not moved for 3 days"],
          evidence: [reqData],
          rulesApplied: ["Pipeline Stalled SLA v1"],
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
        });

        if (rec.escalationRequired) {
          await EventBus.publishInternal({
            eventId: `evt-${Date.now()}-3`,
            eventType: "PipelineEscalated",
            eventVersion: 1,
            correlationId: event.correlationId,
            causationId: event.eventId,
            entityType: "REQUIREMENT",
            entityId: event.entityId,
            tenantId: event.tenantId,
            source: this.name,
            priority: "HIGH",
            createdAt: new Date().toISOString(),
            publishedAt: new Date().toISOString(),
            retryCount: 0,
            traceId: event.traceId,
            payload: {
              requirementId: event.entityId,
              recommendation: rec.recommendation,
            },
            metadata: {},
            type: "PipelineEscalated",
          });
        }

        return {
          success: true,
          actionTaken: "Evaluated Stalled Pipeline",
          tokensUsed: response.tokensUsed,
          model: response.model,
          decisions,
        };
      }

      return { success: true, actionTaken: "No specific action required" };
    } catch (error: any) {
      return {
        success: false,
        reason: error.message,
        errorType: "SYSTEM_ERROR",
        errorStack: error.stack,
        decisions,
      };
    }
  }
}
