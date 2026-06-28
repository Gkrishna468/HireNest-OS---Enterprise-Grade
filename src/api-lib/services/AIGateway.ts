import { GoogleGenAI } from "@google/genai";

export class AIGateway {
  private static instance: AIGateway;
  private client: GoogleGenAI | null = null;
  private initialized = false;

  private constructor() {}

  public static getInstance(): AIGateway {
    if (!AIGateway.instance) {
      AIGateway.instance = new AIGateway();
    }
    return AIGateway.instance;
  }

  /**
   * Initializes the Gemini client lazily.
   */
  public initClient(): void {
    if (this.initialized) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not set. AI Gateway will run in fallback mock mode.");
      this.initialized = true;
      return;
    }

    try {
      this.client = new GoogleGenAI({ apiKey });
      this.initialized = true;
      console.log("Gemini API client initialized successfully in AI Gateway.");
    } catch (err: any) {
      console.error("Failed to initialize Gemini API client:", err.message || err);
      this.initialized = true;
    }
  }

  public getStatus(): "ready" | "not_ready" {
    this.initClient();
    return this.client ? "ready" : "not_ready";
  }

  /**
   * Generates a text summary or classification.
   */
  public async generateText(prompt: string): Promise<string> {
    this.initClient();
    if (!this.client) {
      console.log("[AI Gateway Fallback] Generating mock analysis for prompt:", prompt.substring(0, 50));
      return `[Grounded Fallback Response] Here is an analysis of your prompt regarding: ${prompt.substring(0, 60)}... System calibrated successfully.`;
    }

    try {
      // Use the standard gemini-2.5-flash model as default
      const response = await this.client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      return response.text || "No response generated.";
    } catch (err: any) {
      console.error("Gemini text generation failed:", err.message || err);
      throw err;
    }
  }
}
