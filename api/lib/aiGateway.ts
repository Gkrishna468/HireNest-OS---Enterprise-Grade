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

export async function generateEmbedding(orgId: string, text: string) {
  const quotaCheck = await checkQuota(orgId);
  if (!quotaCheck.ok) {
     throw new Error("AI token limit exhausted for this billing cycle.");
  }

  const response = await ai.models.embedContent({
    model: "text-embedding-004",
    contents: text,
  });

  const estimatedTokens = Math.ceil(text.length / 4);
  
  await Promise.all([
    logAiUsage({
      traceId: `trc_emb_${Date.now()}`,
      orgId,
      operation: "EMBED_CONTENT",
      tokensUsed: estimatedTokens,
      model: "text-embedding-004",
      costEstimate: (estimatedTokens / 1000) * 0.00002
    }),
    meterExecution(orgId, 'AI_INFERENCE', estimatedTokens)
  ]).catch(e => console.error("[GATEWAY_METERING_ERROR]", e));

  return response.embeddings?.[0]?.values;
}

export async function generateAIPayload(orgId: string, systemPrompt: string, userPrompt: string, options: AIGatewayOptions = {}) {
  // 1. Quota Check (Shock Absorber)
  const quotaCheck = await checkQuota(orgId);
  if (!quotaCheck.ok) {
     console.warn(`[AI_GATEWAY] Quota exhausted for org ${orgId}. Triggering shock absorber.`);
     throw new Error("AI token limit exhausted for this billing cycle.");
  }

  // 2. Execution with Provider Failover Routing
  let contents = systemPrompt;
  if (userPrompt) {
     contents += `\n\n${userPrompt}`;
  }
  
  const estimatedTokens = Math.ceil(contents.length / 4);
  const operationType = options.operation || "GATEWAY_INFERENCE";
  
  // Model Fallback Hierarchy
  const activeModel = options.model || "gemini-2.5-flash";
  const fallbackModels = [activeModel, "gemini-2.0-flash", "gemini-1.5-pro"]; 
  // In a full implementation, you would swap SDKs for OpenAI or Claude if Gemini fails completely 
  
  let rawResponse = null;
  let usedModel = activeModel;
  let lastError = null;

  for (const modelId of fallbackModels) {
     try {
       console.log(`[AI_GATEWAY] Attempting completion via ${modelId}...`);
       const response = await ai.models.generateContent({
         model: modelId,
         contents,
         config: {
           temperature: options.temperature,
           responseMimeType: options.responseMimeType,
           responseSchema: options.responseSchema
         }
       });
       rawResponse = response.text;
       usedModel = modelId;
       break; // Success, exit retry loop
     } catch (e: any) {
       console.error(`[AI_GATEWAY] Error with model ${modelId}:`, e.message);
       lastError = e;
       // Continue to next model in the fallback array
     }
  }

  if (!rawResponse) {
     throw new Error(`AI_GATEWAY_EXHAUSTED: All models failed. Last error: ${lastError?.message}`);
  }

  // 3. Metering & Telemetry
  await Promise.all([
    logAiUsage({
      traceId: `trc_${Date.now()}`,
      orgId,
      operation: operationType,
      tokensUsed: estimatedTokens,
      model: usedModel,
      costEstimate: (estimatedTokens / 1000) * 0.00125
    }),
    meterExecution(orgId, 'AI_INFERENCE', estimatedTokens)
  ]).catch(e => console.error("[GATEWAY_METERING_ERROR]", e));

  return rawResponse;
}
