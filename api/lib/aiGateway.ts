import { GoogleGenAI, Type, Schema } from "@google/genai";
import { logAiUsage, checkQuota } from "./tenantGovernance.js";
import { meterExecution } from "./tenantBilling.js";
import crypto from "crypto";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export interface AIGatewayOptions {
  model?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: Schema;
  operation?: string;
}

export async function generateAIPayload(orgId: string, systemPrompt: string, userPrompt: string, options: AIGatewayOptions = {}) {
  // 1. Quota Check (Shock Absorber)
  const quotaCheck = await checkQuota(orgId);
  if (!quotaCheck.ok) {
     console.warn(`[AI_GATEWAY] Quota exhausted for org ${orgId}. Triggering shock absorber.`);
     throw new Error("AI token limit exhausted for this billing cycle.");
  }

  // 2. Provider Routing (Currently Gemini exclusively, but architecture is ready for multi-model)
  const activeModel = options.model || "gemini-2.5-flash";
  
  // 3. Execution
  let contents = systemPrompt;
  if (userPrompt) {
     contents += `\n\n${userPrompt}`;
  }
  
  const response = await ai.models.generateContent({
    model: activeModel,
    contents,
    config: {
      temperature: options.temperature,
      responseMimeType: options.responseMimeType,
      responseSchema: options.responseSchema
    }
  });

  // 4. Metering & Telemetry
  // Approximating tokens based on characters
  const estimatedTokens = Math.ceil(contents.length / 4);
  const operationType = options.operation || "GATEWAY_INFERENCE";
  
  await Promise.all([
    logAiUsage({
      traceId: `trc_${Date.now()}`,
      orgId,
      operation: operationType,
      tokensUsed: estimatedTokens,
      model: activeModel,
      costEstimate: (estimatedTokens / 1000) * 0.00125
    }),
    meterExecution(orgId, 'AI_INFERENCE', estimatedTokens)
  ]).catch(e => console.error("[GATEWAY_METERING_ERROR]", e));

  return response.text;
}
