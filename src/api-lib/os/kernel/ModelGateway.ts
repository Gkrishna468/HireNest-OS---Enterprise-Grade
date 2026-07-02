import { GoogleGenAI } from "@google/genai";
import { headroomOptimizer } from "../../services/HeadroomOptimizer.js";

export interface ModelRequest {
  prompt: string;
  modelAlias?: "flash" | "pro";
  temperature?: number;
  systemInstruction?: string;
  schema?: any;
  compressContext?: boolean; // Uses Headroom if true
}

export interface ModelResponse {
  text: string;
  tokensUsed: number;
  model: string;
  estimatedCost: number;
  tokensSaved?: number; // Headroom metrics
}

// Global instance since ModelGateway is static
let aiClient: GoogleGenAI | null = null;

export class ModelGateway {
  /**
   * Centralized gateway for AI models.
   * Could eventually route to OpenAI, Anthropic, or Local models.
   */
  static async generate(request: ModelRequest): Promise<ModelResponse> {
    if (!aiClient) {
      aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }

    // Defaults
    const modelAlias = request.modelAlias || "flash";
    const temperature = request.temperature ?? 0.2;

    // For now, always route to Gemini
    const modelName =
      modelAlias === "pro" ? "gemini-2.5-pro" : "gemini-2.5-flash";

    let finalPrompt = request.prompt;
    let tokensSaved = 0;

    if (request.compressContext) {
      const compressed = await headroomOptimizer.compress(request.prompt);
      finalPrompt = compressed.data;
      tokensSaved = compressed.metrics.savedTokens;
      console.log(`[ModelGateway] Headroom compression saved ${tokensSaved} tokens.`);
    }

    try {
      const config: any = {
        temperature,
      };
      if (request.systemInstruction) {
        config.systemInstruction = request.systemInstruction;
      }
      if (request.schema) {
        config.responseMimeType = "application/json";
        config.responseSchema = request.schema;
      }

      const response = await aiClient!.models.generateContent({
        model: modelName,
        contents: finalPrompt,
        config,
      });

      const text = response.text || "";
      const usage = response.usageMetadata;

      const promptTokens = usage?.promptTokenCount || 0;
      const candidateTokens = usage?.candidatesTokenCount || 0;
      const totalTokens = usage?.totalTokenCount || 0;

      // Rough estimate cost
      // Flash: ~$0.075 / 1M prompt, $0.30 / 1M completion
      // Pro: ~$3.50 / 1M prompt, $10.50 / 1M completion
      let estimatedCost = 0;
      if (modelAlias === "flash") {
        estimatedCost =
          (promptTokens / 1_000_000) * 0.075 +
          (candidateTokens / 1_000_000) * 0.3;
      } else {
        estimatedCost =
          (promptTokens / 1_000_000) * 3.5 +
          (candidateTokens / 1_000_000) * 10.5;
      }

      return {
        text,
        tokensUsed: totalTokens,
        model: modelName,
        estimatedCost,
        tokensSaved,
      };
    } catch (err: any) {
      console.error("[ModelGateway] Generation error:", err);
      throw err;
    }
  }
}
