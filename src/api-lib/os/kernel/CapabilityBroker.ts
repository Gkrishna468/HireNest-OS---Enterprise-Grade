import { ModelGateway, ModelRequest, ModelResponse } from "./ModelGateway.js";

export interface CapabilityRequest {
  capabilityName: string; // e.g. 'candidate.semantic_match'
  promptContext: any;
  promptTemplate?: string;
  expectedSchema?: any;
  priority?: "HIGH" | "NORMAL" | "LOW";
}

export interface CapabilityResponse {
  success: boolean;
  result?: any;
  confidence: number;
  tokensUsed: number;
  model: string;
  reasoning?: string[];
  error?: string;
}

export class CapabilityBroker {
  public static readonly VERSION = "v2.0";

  /**
   * AI Service Mesh execution layer.
   * Offices ask for a capability, the broker decides how to resolve it.
   */
  static async executeCapability(
    request: CapabilityRequest,
  ): Promise<CapabilityResponse> {
    // 1. Check Capability Cache
    const cacheResult = await this.checkCache(request);
    if (cacheResult) {
      return cacheResult;
    }

    // 2. Resolve Prompt from Registry or Template
    const prompt = request.promptTemplate
      ? this.interpolatePrompt(request.promptTemplate, request.promptContext)
      : JSON.stringify(request.promptContext); // Fallback

    // 3. Safety Validation
    const isSafe = await this.validateSafety(prompt);
    if (!isSafe) {
      return {
        success: false,
        confidence: 0,
        tokensUsed: 0,
        model: "none",
        error: "Safety policy violation",
      };
    }

    // 4. Model Routing
    const modelReq: ModelRequest = {
      prompt,
      schema: request.expectedSchema,
      temperature: 0.1, // Default for deterministic-ish reasoning
    };

    try {
      // 5. Gateway Execution
      const response = await ModelGateway.generate(modelReq);
      let parsedResult = null;

      try {
        parsedResult = request.expectedSchema
          ? JSON.parse(response.text)
          : response.text;
      } catch (e) {
        // If parsing fails, the response validator will catch it
      }

      // 6. Response Validation
      const isValid = await this.validateResponse(
        parsedResult,
        request.expectedSchema,
      );
      if (!isValid) {
        return {
          success: false,
          confidence: 0,
          tokensUsed: response.tokensUsed,
          model: response.model,
          error: "Response failed schema validation",
        };
      }

      const finalResponse: CapabilityResponse = {
        success: true,
        result: parsedResult,
        confidence: parsedResult?.confidence ?? 0.85, // Extract confidence if available
        tokensUsed: response.tokensUsed,
        model: response.model,
        reasoning: parsedResult?.reasoning ?? [],
      };

      // 7. Update Cache
      await this.updateCache(request, finalResponse);

      return finalResponse;
    } catch (error: any) {
      console.error(
        `[CapabilityBroker] Execution failed for ${request.capabilityName}`,
        error,
      );
      return {
        success: false,
        confidence: 0,
        tokensUsed: 0,
        model: "none",
        error: error.message,
      };
    }
  }

  private static interpolatePrompt(template: string, context: any): string {
    // Simple interpolation placeholder
    return `${template}\n\nContext: ${JSON.stringify(context)}`;
  }

  private static async checkCache(
    request: CapabilityRequest,
  ): Promise<CapabilityResponse | null> {
    // In real impl: redis or firestore cache based on hash(request)
    return null;
  }

  private static async updateCache(
    request: CapabilityRequest,
    response: CapabilityResponse,
  ) {
    // In real impl: store in cache with TTL
  }

  private static async validateSafety(prompt: string): Promise<boolean> {
    // E.g. check for PII or harmful content
    return true;
  }

  private static async validateResponse(
    result: any,
    expectedSchema: any,
  ): Promise<boolean> {
    if (!expectedSchema) return true;
    if (!result) return false;
    // Basic check
    if (typeof result !== "object") return false;
    return true;
  }
}
