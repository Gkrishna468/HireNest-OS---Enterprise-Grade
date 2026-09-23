import { GoogleGenAI } from "@google/genai";
import { SecretManager } from "../../lib/secretManager.js";
import { headroomOptimizer } from "./HeadroomOptimizer.js";
import { AITelemetry } from "../telemetry/aiTelemetry.js";
import { ErrorMonitor } from "../telemetry/errorMonitor.js";
import { AIGuardrails } from "./AIGuardrails.js";
import { db } from "../../lib/firebase-admin.js";
import crypto from "crypto";
import { redisCache } from "./cache/RedisCache.js";

export type AILevel = 1 | 2;

export type AICapability =
  // Level 1 — Routine / High-Volume Processing (Gemini 3.1 Flash-Lite)
  | "jd_extraction"
  | "jd.extract"
  | "candidate_enrichment"
  | "candidate_summaries"
  | "resume.enrich"
  | "skill_normalization"
  | "experience_extraction"
  | "education_extraction"
  | "notice_period_interpretation"
  | "location_interpretation"
  | "ctc_interpretation"
  | "bulk_screening"
  | "basic_screening"
  | "candidate_screening"
  | "candidate_matching"
  | "screening"
  | "match_candidates"
  | "interview_question_generation"
  | "email_drafting"
  | "boolean_search_generation"
  | "executive_summary"
  // Level 2 — Deep Fitment & Recruiter Decision Support (Gemini 3.7 Flash)
  | "deep_fitment"
  | "detailed_fitment"
  | "deep_screening"
  | "skill_gap_analysis"
  | "transferable_skills"
  | "compare_candidates"
  | "rank_shortlisted"
  | "submission_recommendation"
  | "complex_jd_interpretation"
  | "decision_support"
  | "semantic_reasoning"
  // Prohibited / Deterministic-Only (must not invoke AI)
  | "resume_parsing"
  | "resume.extract"
  // Disabled / Deprecated
  | "salary_analysis"
  | "market_trends"
  | "intake.classify"
  | "intake.extract_entities"
  | "intake.normalize"
  | "intake.validate"
  | "intake.audit"
  | "intake.relationships"
  | "intake.metrics"
  | "vendor.resolve"
  | "client.resolve"
  | "duplicate.detect"
  | "relationship.build"
  | "copilot"
  | "openui"
  | "general";

export type AIIntent =
  | "ASK_COPILOT"
  | "RUN_AI_MATCH"
  | "CANDIDATE_MATCH"
  | "PARSE_RESUME"
  | "SCREEN_CANDIDATE"
  | "CANDIDATE_360"
  | "GENERATE_EMAIL"
  | "EMAIL_CLASSIFICATION"
  | "ANALYZE_REQUIREMENT"
  | "JD_PARSE"
  | "SKILL_EXTRACTION"
  | "CANDIDATE_NORMALIZATION"
  | "REQUIREMENT_AI"
  | "COMPLEX_ANALYSIS"
  | "EXECUTIVE_ANALYSIS";

export interface AIGatewayRequest {
    prompt: string;
    feature?: AICapability;
    level?: AILevel;
    intent?: AIIntent;
    promptVersion?: string;
    requireLocal?: boolean;
    skipCache?: boolean;
    userId?: string;
    office?: string;
    agent?: string;
    model?: string; // Explicit model selection override
    temperature?: number;
    systemInstruction?: string;
    schema?: any;
    compressContext?: boolean; // Uses Headroom if true
    imageParts?: Array<{ inlineData: { data: string; mimeType: string } }>;
    fallbackRuleEngine?: (text: string) => any;
    timeoutMs?: number;
    strategy?: "speed" | "quality" | "cost";
    isAuthorizedUserAction?: boolean;
    isAuthorizedBackgroundJob?: boolean;
}

export interface AIGatewayResponse {
    provider: string;
    model: string;
    level?: AILevel;
    response: string;
    latency: number;
    tokens: number;
    cached: boolean;
    estimatedCost?: number;
    savedCost?: number;
    tokensSaved?: number;
    compressionRatio?: number;
    originalTokens?: number;
}

// ==========================================
// 1. Unified AI Provider Contract
// ==========================================
export interface AIProvider {
    id: string;
    execute(
        prompt: string,
        model: string,
        options: {
            temperature?: number;
            systemInstruction?: string;
            schema?: any;
            imageParts?: any[];
            timeoutMs?: number;
        }
    ): Promise<{ text: string; tokens: number }>;
    health(): Promise<boolean>;
    estimateCost(model: string, tokens: number, isCached: boolean): { estimatedCost: number; savedCost: number };
}

// ==========================================
// 2. Circuit Breaker Implementation
// ==========================================
export interface CircuitBreakerState {
    providerId: string;
    state: "CLOSED" | "OPEN" | "HALF_OPEN";
    failureCount: number;
    lastFailureTime: number;
}

export class CircuitBreaker {
    private static states: Record<string, CircuitBreakerState> = {};
    private static readonly FAILURE_THRESHOLD = 3;
    private static readonly COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown

    static getStatus(providerId: string): "CLOSED" | "OPEN" | "HALF_OPEN" {
        const state = this.states[providerId];
        if (!state) return "CLOSED";

        if (state.state === "OPEN") {
            const timePassed = Date.now() - state.lastFailureTime;
            if (timePassed > this.COOLDOWN_MS) {
                console.log(`[CircuitBreaker] Cooldown elapsed for ${providerId}. Transitioning from OPEN to HALF_OPEN.`);
                state.state = "HALF_OPEN";
                return "HALF_OPEN";
            }
            return "OPEN";
        }
        return state.state;
    }

    static recordSuccess(providerId: string) {
        const state = this.states[providerId];
        if (state) {
            state.failureCount = 0;
            state.state = "CLOSED";
            console.log(`[CircuitBreaker] Successful request. ${providerId} circuit is CLOSED and healthy.`);
        }
    }

    static recordFailure(providerId: string, errorMsg: string, forceOpen: boolean = false) {
        if (!this.states[providerId]) {
            this.states[providerId] = {
                providerId,
                state: "CLOSED",
                failureCount: 0,
                lastFailureTime: 0
            };
        }
        const state = this.states[providerId];
        state.failureCount++;
        state.lastFailureTime = Date.now();

        if (forceOpen || state.failureCount >= this.FAILURE_THRESHOLD) {
            state.state = "OPEN";
            console.warn(`[CircuitBreaker] Circuit for ${providerId} is now OPEN. Cooldown active for ${this.COOLDOWN_MS}ms. Reason: ${errorMsg}`);
        } else {
            console.log(`[CircuitBreaker] Recorded failure for ${providerId} (Count: ${state.failureCount}). State remains: ${state.state}`);
        }
    }
}

// ==========================================
// 3. Google GenAI Provider Implementation
// ==========================================
export class GoogleProvider implements AIProvider {
    id = "google";
    private aiInstance: GoogleGenAI | null = null;

    private async getAIClient(): Promise<GoogleGenAI> {
        if (!this.aiInstance) {
            const apiKey = await SecretManager.getSecret("GEMINI_API_KEY") || process.env.GEMINI_API_KEY || "dummy";
            this.aiInstance = new GoogleGenAI({ apiKey });
        }
        return this.aiInstance;
    }

    async execute(
        prompt: string,
        model: string,
        options: {
            temperature?: number;
            systemInstruction?: string;
            schema?: any;
            imageParts?: any[];
            timeoutMs?: number;
        }
    ): Promise<{ text: string; tokens: number }> {
        const client = await this.getAIClient();
        const contentParts: any[] = [prompt];
        if (options.imageParts && options.imageParts.length > 0) {
            contentParts.push(...options.imageParts);
        }

        const config: any = {
            temperature: options.temperature ?? 0.2,
        };

        if (options.systemInstruction) {
            config.systemInstruction = options.systemInstruction;
        }

        if (options.schema) {
            config.responseMimeType = "application/json";
            if (typeof options.schema === "object") {
                config.responseSchema = options.schema;
            }
        }

        // Validate model: Pro models are strictly disabled
        const lowerModel = (model || "").toLowerCase();
        if (lowerModel.includes("pro") && !AIGateway.isProModelAllowed()) {
            throw new Error("AI_PRO_MODEL_DISABLED: Pro models are disabled. HireNest OS uses Level 1 (gemini-3.1-flash-lite) and Level 2 (gemini-3.8-flash).");
        }

        // Primary and candidate flash fallbacks
        const requestedModel = model || AIGateway.getLevel2Model();
        const candidateModels = Array.from(new Set([
            requestedModel,
            "gemini-3.8-flash",
            "gemini-3.1-flash-lite"
        ]));
        const timeoutMs = options.timeoutMs || 25000;

        let lastError: any = null;
        for (const targetModel of candidateModels) {
            const maxAttempts = 2;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const apiCall = client.models.generateContent({
                        model: targetModel,
                        contents: contentParts,
                        config,
                    });

                    const timeoutPromise = new Promise<never>((_, reject) => {
                        setTimeout(() => {
                            reject(new Error(`Google GenAI request timeout after ${timeoutMs}ms`));
                        }, timeoutMs);
                    });

                    const response = await Promise.race([apiCall, timeoutPromise]);
                    const text = response.text || "";
                    const usage = response.usageMetadata;
                    const totalTokens = usage?.totalTokenCount || Math.ceil((prompt.length + text.length) / 4);

                    return { text, tokens: totalTokens };
                } catch (err: any) {
                    lastError = err;
                    const msg = err?.message || String(err);

                    // Definitive Quota Exhaustion (429 with quota/billing message or RESOURCE_EXHAUSTED)
                    const lowerMsg = msg.toLowerCase();
                    const isQuotaExhausted =
                        lowerMsg.includes("exceeded your current quota") ||
                        lowerMsg.includes("resource_exhausted") ||
                        lowerMsg.includes("quota") ||
                        lowerMsg.includes("rate exceeded") ||
                        lowerMsg.includes("billing_disabled") ||
                        lowerMsg.includes("depleted") ||
                        (lowerMsg.includes("429") && (lowerMsg.includes("quota") || lowerMsg.includes("exceeded") || lowerMsg.includes("billing") || lowerMsg.includes("plan")));

                    if (isQuotaExhausted) {
                        console.warn(`[GoogleProvider] Gemini API Quota Exceeded (429). Fast-failing to deterministic fallback engine.`);
                        CircuitBreaker.recordFailure("google", "Google API Quota/Credits Exhausted (429)", true);
                        throw new Error(`Google API Quota/Credits Exhausted (429)`);
                    }
                    
                    // Permanent errors (404, deprecated models, invalid arg) -> skip immediately to next model
                    const isPermanent = msg.includes("404") || msg.includes("NOT_FOUND") || msg.includes("no longer available") || msg.includes("INVALID_ARGUMENT");
                    if (isPermanent) {
                        console.warn(`[GoogleProvider] Model ${targetModel} is permanently unavailable: ${msg.slice(0, 100)}. Trying next candidate model...`);
                        break;
                    }

                    // Transient rate-limits or backend overload (503 / 500 / UNAVAILABLE / high demand)
                    const isTransient = 
                        msg.includes("503") || 
                        msg.includes("500") ||
                        msg.includes("UNAVAILABLE") || 
                        msg.includes("high demand") || 
                        (msg.includes("429") && !msg.includes("quota"));
                    
                    if (isTransient && attempt < maxAttempts) {
                        const backoffDelay = 600;
                        console.warn(`[GoogleProvider] Model ${targetModel} transient issue (${msg.slice(0, 80)}). Retrying in ${backoffDelay}ms (attempt ${attempt}/${maxAttempts})...`);
                        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
                        continue;
                    }

                    if (isTransient) {
                        console.warn(`[GoogleProvider] Model ${targetModel} capacity issue. Switching to next fallback model...`);
                        break;
                    }

                    console.warn(`[GoogleProvider] Model ${targetModel} failed: ${msg.slice(0, 100)}. Trying next candidate model...`);
                    break;
                }
            }
        }
        
        const lastMsg = lastError?.message || String(lastError);
        if (lastMsg.includes("429") || lastMsg.includes("RESOURCE_EXHAUSTED") || lastMsg.includes("depleted") || lastMsg.includes("quota")) {
            throw new Error(`Google API Quota/Credits Exhausted (429)`);
        }
        throw lastError || new Error("All Google candidate models failed");
    }

    async health(): Promise<boolean> {
        try {
            const apiKey = await SecretManager.getSecret("GEMINI_API_KEY") || process.env.GEMINI_API_KEY;
            return !!apiKey;
        } catch {
            return false;
        }
    }

    estimateCost(model: string, tokens: number, isCached: boolean): { estimatedCost: number; savedCost: number } {
        const lowerModel = (model || "").toLowerCase();
        // Level 1: Gemini 3.1 Flash-Lite: $0.30/1M input, $2.50/1M output, blended ~$0.0000005/token
        // Level 2: Gemini 3.7 Flash: $0.75/1M input, $3.75/1M output, blended ~$0.0000015/token
        let ratePerToken = 0.0000005; // Default Level 1 (Flash-Lite)
        if (lowerModel.includes("3.7") || lowerModel.includes("flash-2") || (!lowerModel.includes("lite") && lowerModel.includes("flash"))) {
            ratePerToken = 0.0000015; // Level 2 (3.7 Flash)
        }
        const cost = Number((tokens * ratePerToken).toFixed(6));
        return isCached ? { estimatedCost: 0, savedCost: cost } : { estimatedCost: cost, savedCost: 0 };
    }
}

// ==========================================
// 4. Centralized AIGateway Orchestrator
// ==========================================
export class AIGateway {
    public static readonly LEVEL_1_MODEL_DEFAULT = "gemini-3.1-flash-lite";
    public static readonly LEVEL_2_MODEL_DEFAULT = "gemini-3.8-flash";

    public static readonly LEVEL_1_CAPABILITIES = new Set<string>([
        "jd_extraction",
        "jd.extract",
        "candidate_enrichment",
        "candidate_summaries",
        "resume.enrich",
        "skill_normalization",
        "experience_extraction",
        "education_extraction",
        "notice_period_interpretation",
        "location_interpretation",
        "ctc_interpretation",
        "bulk_screening",
        "basic_screening",
        "candidate_screening",
        "candidate_matching",
        "screening",
        "match_candidates",
        "interview_question_generation",
        "email_drafting",
        "boolean_search_generation",
        "executive_summary",
        "copilot",
        "openui",
        "general"
    ]);

    public static readonly LEVEL_2_CAPABILITIES = new Set<string>([
        "deep_fitment",
        "detailed_fitment",
        "deep_screening",
        "skill_gap_analysis",
        "transferable_skills",
        "compare_candidates",
        "rank_shortlisted",
        "submission_recommendation",
        "complex_jd_interpretation",
        "decision_support",
        "semantic_reasoning"
    ]);

    private static providers: Record<string, AIProvider> = {
        google: new GoogleProvider()
    };

    // In-memory cache telemetry buffers to avoid write-inflation on Firestore cache hits
    private static inMemoryCacheHitsCount = 0;
    private static inMemorySavedTokens = 0;
    private static inMemorySavedCost = 0;
    private static lastFlushTime = Date.now();
    private static FLUSH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
    private static FLUSH_THRESHOLD_COUNT = 20; // or every 20 cache hits

    private static async recordCacheHitTelemetry(savedTokens: number, savedCost: number) {
        this.inMemoryCacheHitsCount++;
        this.inMemorySavedTokens += savedTokens;
        this.inMemorySavedCost += savedCost;

        const timeSinceLastFlush = Date.now() - this.lastFlushTime;
        if (this.inMemoryCacheHitsCount >= this.FLUSH_THRESHOLD_COUNT || timeSinceLastFlush >= this.FLUSH_INTERVAL_MS) {
            // Run asynchronously to not block the current request execution flow
            this.flushCacheHitTelemetry().catch((err: any) => console.warn("[AIGateway] Async flush cache hits warning:", err?.message));
        }
    }

    public static async flushCacheHitTelemetry() {
        if (this.inMemoryCacheHitsCount === 0 || !db) return;

        const dateStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const hits = this.inMemoryCacheHitsCount;
        const tokens = this.inMemorySavedTokens;
        const cost = this.inMemorySavedCost;

        // Reset in-memory trackers immediately before async call to avoid race conditions
        this.inMemoryCacheHitsCount = 0;
        this.inMemorySavedTokens = 0;
        this.inMemorySavedCost = 0;
        this.lastFlushTime = Date.now();

        try {
            const dailyDocRef = db.collection("ai_usage_daily").doc(dateStr);
            await db.runTransaction(async (transaction: any) => {
                const docSnap = await transaction.get(dailyDocRef);
                if (docSnap.exists) {
                    const currentData = docSnap.data();
                    transaction.update(dailyDocRef, {
                        cacheHits: (currentData?.cacheHits || 0) + hits,
                        savedTokens: (currentData?.savedTokens || 0) + tokens,
                        savedCost: (currentData?.savedCost || 0) + cost,
                        updatedAt: new Date().toISOString()
                    });
                } else {
                    transaction.set(dailyDocRef, {
                        cacheHits: hits,
                        savedTokens: tokens,
                        savedCost: cost,
                        updatedAt: new Date().toISOString()
                    });
                }
            });
            console.log(`[AIGateway] Flushed aggregated cache hit telemetry to ai_usage_daily/${dateStr}: ${hits} hits, ${tokens} tokens saved, $${cost.toFixed(4)} saved.`);
        } catch (err: any) {
            console.warn("[AIGateway] Failed to flush daily cache hit telemetry:", err?.message);
        }
    }

    static getLevel1Model(): string {
        return process.env.AI_LOW_COST_MODEL || process.env.AI_LEVEL_1_MODEL || "gemini-3.1-flash-lite";
    }

    static getLevel2Model(): string {
        return process.env.AI_DEFAULT_MODEL || process.env.AI_LEVEL_2_MODEL || "gemini-3.8-flash";
    }

    static getComplexModel(): string {
        return process.env.AI_COMPLEX_MODEL || "gemini-3.1-pro-preview";
    }

    static isProModelAllowed(): boolean {
        const proConfig = (process.env.AI_PRO_MODEL || "disabled").toLowerCase();
        return proConfig !== "disabled" && proConfig !== "false" && proConfig !== "0";
    }

    /**
     * Resolves the AI Level and corresponding Gemini Model for a given feature/request.
     */
    static resolveLevelAndModel(
        feature: string,
        requestedLevel?: AILevel,
        requestedModel?: string,
        intent?: AIIntent,
        userHasProPermission?: boolean
    ): { level: AILevel; model: string } {
        // Enforce zero-AI deterministic rule for basic resume parsing
        if (feature === "resume_parsing" || feature === "resume.extract") {
            throw new Error("DETERMINISTIC_RESUME_PARSER_REQUIRED: Basic resume parsing is strictly deterministic. Use DeterministicResumeParser without invoking Gemini.");
        }

        // Keep test assertions happy & enforce strict model restrictions
        if (requestedModel) {
            const lower = requestedModel.toLowerCase();
            if (lower.includes("pro") && !this.isProModelAllowed()) {
                throw new Error("AI_PRO_MODEL_DISABLED: Pro models are disabled. HireNest OS uses Level 1 (gemini-3.1-flash-lite) and Level 2 (gemini-3.8-flash).");
            }
            if (lower.includes("gpt") || lower.includes("claude") || lower.includes("llama") || lower.includes("mistral") || lower.includes("grok")) {
                throw new Error("NON_GOOGLE_PROVIDER_DISABLED: Non-Google models are disabled. HireNest OS exclusively uses Google GenAI SDK.");
            }
        }

        // Strictly derive the intent from feature context if not explicitly provided
        let resolvedIntent = intent;
        if (!resolvedIntent) {
            if (feature === "copilot" || feature === "openui" || feature === "general") {
                resolvedIntent = "ASK_COPILOT";
            } else if (feature === "candidate_matching" || feature === "match_candidates" || feature === "compare_candidates" || feature === "rank_shortlisted") {
                resolvedIntent = "CANDIDATE_MATCH";
            } else if (feature === "candidate_screening" || feature === "screening" || feature === "deep_screening" || feature === "deep_fitment" || feature === "detailed_fitment") {
                resolvedIntent = "CANDIDATE_360";
            } else if (feature === "email_drafting" || feature === "email_classification") {
                resolvedIntent = "EMAIL_CLASSIFICATION";
            } else if (feature === "jd_extraction" || feature === "jd.extract" || feature === "complex_jd_interpretation") {
                resolvedIntent = "JD_PARSE";
            } else if (feature === "resume_parsing" || feature === "resume.extract" || feature === "resume.enrich" || feature === "candidate_enrichment") {
                resolvedIntent = "PARSE_RESUME";
            } else if (feature === "skill_extraction") {
                resolvedIntent = "SKILL_EXTRACTION";
            } else if (feature === "executive_analysis" || feature === "executive_summary") {
                resolvedIntent = "EXECUTIVE_ANALYSIS";
            } else if (feature === "complex_analysis" || feature === "complex_candidate_analysis") {
                resolvedIntent = "COMPLEX_ANALYSIS";
            } else if (feature === "candidate_normalization") {
                resolvedIntent = "CANDIDATE_NORMALIZATION";
            } else if (feature === "requirement_ai" || feature === "requirement_summary") {
                resolvedIntent = "REQUIREMENT_AI";
            }
        }

        // Server-Side AI Feature Policy: Select the model purely based on standard intent/function
        // regardless of any client-supplied model selection override.
        let resolvedLevel: AILevel = 1;
        let model = this.getLevel1Model();

        if (resolvedIntent) {
            if (
                resolvedIntent === "PARSE_RESUME" ||
                resolvedIntent === "SKILL_EXTRACTION" ||
                resolvedIntent === "JD_PARSE" ||
                resolvedIntent === "EMAIL_CLASSIFICATION" ||
                resolvedIntent === "CANDIDATE_NORMALIZATION"
            ) {
                model = this.getLevel1Model();
                resolvedLevel = 1;
            } else if (
                resolvedIntent === "CANDIDATE_MATCH" ||
                resolvedIntent === "RUN_AI_MATCH" ||
                resolvedIntent === "CANDIDATE_360" ||
                resolvedIntent === "SCREEN_CANDIDATE" ||
                resolvedIntent === "ASK_COPILOT" ||
                resolvedIntent === "REQUIREMENT_AI" ||
                resolvedIntent === "ANALYZE_REQUIREMENT" ||
                resolvedIntent === "GENERATE_EMAIL"
            ) {
                model = this.getLevel2Model();
                resolvedLevel = 2;
            } else if (resolvedIntent === "COMPLEX_ANALYSIS" || resolvedIntent === "EXECUTIVE_ANALYSIS") {
                const featureAllowsPro = feature === "complex_analysis" || feature === "executive_analysis" || feature === "executive_summary" || feature === "complex_candidate_analysis";
                const adminPolicyAllowsPro = this.isProModelAllowed();
                const userPermission = userHasProPermission === true;
                const explicitAIIntent = resolvedIntent === "COMPLEX_ANALYSIS" || resolvedIntent === "EXECUTIVE_ANALYSIS";

                if (featureAllowsPro && adminPolicyAllowsPro && userPermission && explicitAIIntent) {
                    model = this.getComplexModel();
                    resolvedLevel = 2;
                } else {
                    model = this.getLevel2Model();
                    resolvedLevel = 2;
                }
            } else {
                // Feature-based default legacy mapping for unrecognized intents
                if (this.LEVEL_2_CAPABILITIES.has(feature)) {
                    resolvedLevel = 2;
                    model = this.getLevel2Model();
                } else {
                    resolvedLevel = 1;
                    model = this.getLevel1Model();
                }
            }
        } else {
            // Feature-based default legacy mapping
            if (this.LEVEL_2_CAPABILITIES.has(feature)) {
                resolvedLevel = 2;
                model = this.getLevel2Model();
            } else {
                resolvedLevel = 1;
                model = this.getLevel1Model();
            }
        }

        return { level: resolvedLevel, model };
    }

    static calculateCost(provider: string, model: string, tokens: number, isCached: boolean = false): { estimatedCost: number, savedCost: number } {
        const provInstance = this.providers[provider] || this.providers.google;
        if (provInstance) {
            return provInstance.estimateCost(model, tokens, isCached);
        }
        return { estimatedCost: 0, savedCost: 0 };
    }

    /**
     * Backward compatible helper wrappers
     */
    static async callGoogle(prompt: string, model?: string, options: any = {}) {
        const targetModel = model || this.getLevel1Model();
        return this.providers.google.execute(prompt, targetModel, options);
    }

    static async callOllama(prompt: string, model: string, options: any = {}) {
        throw new Error("NON_GOOGLE_PROVIDER_DISABLED: Ollama is disabled. HireNest OS exclusively uses Google GenAI SDK.");
    }

    static async callOpenAI(prompt: string, model: string, options: any = {}) {
        throw new Error("NON_GOOGLE_PROVIDER_DISABLED: OpenAI is disabled. HireNest OS exclusively uses Google GenAI SDK.");
    }

    public static extractAndParseJSON(text: string): any {
        const trimmed = text.trim();
        try {
            return JSON.parse(trimmed);
        } catch (e) {
            // Continue to robust parsing
        }

        const markdownMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch) {
            try {
                return JSON.parse(markdownMatch[1].trim());
            } catch (e) {
                // Fall through to brace matching on inner content
            }
        }

        const firstBrace = trimmed.indexOf('{');
        const lastBrace = trimmed.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            const potentialJson = trimmed.substring(firstBrace, lastBrace + 1);
            try {
                return JSON.parse(potentialJson);
            } catch (e) {
                let braceCount = 0;
                let insideString = false;
                let escape = false;
                let matchedEnd = -1;

                for (let i = firstBrace; i < trimmed.length; i++) {
                    const char = trimmed[i];
                    if (escape) {
                        escape = false;
                        continue;
                    }
                    if (char === '\\') {
                        escape = true;
                        continue;
                    }
                    if (char === '"') {
                        insideString = !insideString;
                        continue;
                    }
                    if (!insideString) {
                        if (char === '{') {
                            braceCount++;
                        } else if (char === '}') {
                            braceCount--;
                            if (braceCount === 0) {
                                matchedEnd = i;
                                break;
                            }
                        }
                    }
                }

                if (matchedEnd !== -1) {
                    const matchedJson = trimmed.substring(firstBrace, matchedEnd + 1);
                    try {
                        return JSON.parse(matchedJson);
                    } catch (innerErr) {
                        try {
                            const cleanedJson = matchedJson
                                .replace(/,\s*([\]}])/g, '$1')
                                .replace(/\\n/g, ' ')
                                .replace(/\\r/g, ' ');
                            return JSON.parse(cleanedJson);
                        } catch (lastErr) {
                            throw innerErr;
                        }
                    }
                }
            }
        }

        throw new Error("Failed to extract valid JSON from response text.");
    }

    /**
     * Process chat request with Two-Tier Gemini routing, hashed caching,
     * and advanced governance telemetry.
     */
    static async processChat(request: AIGatewayRequest): Promise<AIGatewayResponse> {
        const startTime = Date.now();
        const feature: string = request.feature || "candidate_matching";
        const promptVersion = request.promptVersion || "v1.0";
        const userId = request.userId || "system";
        const office = request.office || "general";
        const agentName = request.agent || feature;

        // 1. Derive/Validate Intent
        let intent: AIIntent | undefined = request.intent;
        if (!intent) {
            // Strictly derive based on feature context
            if (feature === "copilot" || feature === "openui" || feature === "general" || agentName === "copilot" || agentName === "openui" || agentName === "general") {
                intent = "ASK_COPILOT";
            } else if (feature === "candidate_matching" || feature === "match_candidates" || feature === "compare_candidates" || feature === "rank_shortlisted") {
                intent = "CANDIDATE_MATCH";
            } else if (feature === "candidate_screening" || feature === "screening" || feature === "deep_screening" || feature === "deep_fitment" || feature === "detailed_fitment") {
                intent = "CANDIDATE_360";
            } else if (feature === "email_drafting" || feature === "email_classification") {
                intent = "EMAIL_CLASSIFICATION";
            } else if (feature === "jd_extraction" || feature === "jd.extract" || feature === "complex_jd_interpretation") {
                intent = "JD_PARSE";
            } else if (feature === "resume_parsing" || feature === "resume.extract" || feature === "resume.enrich" || feature === "candidate_enrichment") {
                intent = "PARSE_RESUME";
            } else if (feature === "skill_extraction") {
                intent = "SKILL_EXTRACTION";
            } else if (feature === "executive_analysis" || feature === "executive_summary") {
                intent = "EXECUTIVE_ANALYSIS";
            } else if (feature === "complex_analysis" || feature === "complex_candidate_analysis") {
                intent = "COMPLEX_ANALYSIS";
            } else if (feature === "candidate_normalization") {
                intent = "CANDIDATE_NORMALIZATION";
            } else if (feature === "requirement_ai" || feature === "requirement_summary") {
                intent = "REQUIREMENT_AI";
            } else if (feature === "interview_question_generation") {
                intent = "SCREEN_CANDIDATE";
            }
        }

        const VALID_INTENTS = new Set<string>([
            "ASK_COPILOT",
            "RUN_AI_MATCH", // keep for backward compatibility
            "CANDIDATE_MATCH",
            "PARSE_RESUME",
            "SCREEN_CANDIDATE", // keep for backward compatibility
            "CANDIDATE_360",
            "GENERATE_EMAIL", // keep for backward compatibility
            "EMAIL_CLASSIFICATION",
            "ANALYZE_REQUIREMENT", // keep for backward compatibility
            "JD_PARSE",
            "SKILL_EXTRACTION",
            "CANDIDATE_NORMALIZATION",
            "REQUIREMENT_AI",
            "COMPLEX_ANALYSIS",
            "EXECUTIVE_ANALYSIS"
        ]);

        const isValidIntent = intent && VALID_INTENTS.has(intent);

        // 2. Resolve Two-Tier Model Routing & Permissions via server-side Feature Policy
        // Admin or authorized user has Pro permission if request permissions/roles are present or authorized actions are configured.
        const userHasProPermission = userId === "admin" || request.isAuthorizedUserAction === true;
        const { level, model } = this.resolveLevelAndModel(feature, request.level, request.model, intent, userHasProPermission);
        
        // Zero-Token Policy Enforcement
        // Opening HireNestOS, viewing a candidate, or general Firestore updates must NEVER consume live Gemini tokens.
        const isUserAction = request.isAuthorizedUserAction === true;
        const isBackgroundJob = request.isAuthorizedBackgroundJob === true;
        const isManualChat = feature === "copilot" || feature === "openui" || agentName === "copilot" || agentName === "openui" || agentName === "general";
        
        const isAuthorizedExecution = isValidIntent && (isUserAction || isBackgroundJob || isManualChat);

        if (!isAuthorizedExecution) {
            console.warn(`[AIGateway] Blocked automatic/unauthorized Gemini token consumption. Feature: '${feature}', Intent: '${intent}'`);
            const defaultFallbackText = AIGateway.getDefaultDeterministicFallback(feature, level, request.schema);
            return {
                provider: "RuleEngine",
                model: "DeterministicZeroTokenPolicy",
                level,
                response: defaultFallbackText,
                latency: Date.now() - startTime,
                tokens: 0,
                cached: false,
                estimatedCost: 0,
                savedCost: 0
            };
        }
        
        // 3. Pre-flight Guardrails (PII & Toxicity)
        if (AIGuardrails.detectPII(request.prompt)) {
             throw new Error("AI Guardrails: Blocked request due to sensitive PII detection.");
        }
        if (AIGuardrails.detectToxicity(request.prompt)) {
             throw new Error("AI Guardrails: Blocked request due to toxicity detection.");
        }

        // 3. Context Compression (Headroom)
        let finalPrompt = request.prompt;
        let tokensSaved = 0;
        let compressionRatio = 1.0;
        let originalTokens = 0;

        if (request.compressContext) {
            try {
                const compressed = await headroomOptimizer.compress(request.prompt);
                finalPrompt = compressed.data;
                tokensSaved = compressed.metrics.savedTokens;
                compressionRatio = compressed.metrics.compressionRatio;
                originalTokens = compressed.metrics.originalTokens;
                console.log(`[AIGateway] Headroom compression saved ${tokensSaved} tokens.`);
            } catch (err) {
                console.warn("[AIGateway] Headroom compression skipped/failed", err);
            }
        }

        // 4. Check Hashed Cache (incorporates model and level)
        let cacheKeyStr = "";
        let cacheHash = "";
        if (!request.skipCache && db) {
            cacheKeyStr = JSON.stringify({
                agent: agentName,
                feature,
                level,
                model,
                promptVersion,
                normalizedPrompt: finalPrompt.trim(),
                schema: request.schema ? true : false
            });
            cacheHash = crypto.createHash("sha256").update(cacheKeyStr).digest("hex");
            
            try {
                const redisHit = await redisCache.get(cacheHash);
                if (redisHit) {
                    console.log(`[AIGateway] Redis cache hit for agent ${agentName} [L${level}:${model}]`);
                    const latency = Date.now() - startTime;
                    const financialCosts = this.calculateCost(redisHit.provider, redisHit.model, redisHit.tokens, true);
                    this.recordCacheHitTelemetry(tokensSaved, financialCosts.savedCost).catch(() => {});
                    return {
                        ...redisHit,
                        level,
                        latency,
                        cached: true,
                        estimatedCost: financialCosts.estimatedCost,
                        savedCost: financialCosts.savedCost,
                        tokensSaved,
                        compressionRatio,
                        originalTokens
                    };
                }

                const cacheDoc = await db.collection("ai_gateway_cache").doc(cacheHash).get();
                if (cacheDoc.exists) {
                    const cachedData = cacheDoc.data() as AIGatewayResponse & { cachedAt?: string };
                    let isExpired = false;
                    
                    if (cachedData.cachedAt) {
                        const cachedTime = new Date(cachedData.cachedAt).getTime();
                        const CACHE_TTL = 60 * 60 * 1000; // 60 minutes expiry
                        if (Date.now() - cachedTime > CACHE_TTL) {
                            isExpired = true;
                        }
                    }

                    if (isExpired) {
                        console.log(`[AIGateway] Hashed cache expired for agent ${agentName}`);
                    } else {
                        console.log(`[AIGateway] Hashed cache hit for agent ${agentName} [L${level}:${model}]`);
                    
                        const latency = Date.now() - startTime;
                        const financialCosts = this.calculateCost(cachedData.provider, cachedData.model, cachedData.tokens, true);

                        const fullResponse: AIGatewayResponse = {
                            ...cachedData,
                            level,
                            latency,
                            cached: true,
                            estimatedCost: financialCosts.estimatedCost,
                            savedCost: financialCosts.savedCost,
                            tokensSaved,
                            compressionRatio,
                            originalTokens
                        };

                        this.recordCacheHitTelemetry(tokensSaved, financialCosts.savedCost).catch(() => {});

                        // Cache hits are read-only to optimize Firestore write quota and performance
                        return fullResponse;
                    }
                }
            } catch (e) {
                console.warn("[AIGateway] Cache read failed", e);
            }
        }

        // 5. Check Provider Health & Circuit Breakers
        const providerId = "google";
        const providerInstance = this.providers.google;
        const circuitStatus = CircuitBreaker.getStatus(providerId);

        let executionError: any = null;

        if (circuitStatus !== "OPEN") {
            try {
                const timeoutMs = request.timeoutMs || 25000;
                console.log(`[AIGateway] Executing Level ${level} task '${feature}' on ${providerId} (${model}) [Circuit: ${circuitStatus}]`);

                const result = await providerInstance.execute(finalPrompt, model, {
                    temperature: request.temperature,
                    systemInstruction: request.systemInstruction,
                    schema: request.schema,
                    imageParts: request.imageParts,
                    timeoutMs
                });

                // Record successful request on Circuit Breaker
                CircuitBreaker.recordSuccess(providerId);

                const latency = Date.now() - startTime;
                const costs = this.calculateCost(providerId, model, result.tokens, false);

                // Build unified response structure
                const resultObj: AIGatewayResponse = {
                    provider: providerId,
                    model,
                    level,
                    response: result.text,
                    latency,
                    tokens: result.tokens,
                    cached: false,
                    estimatedCost: costs.estimatedCost,
                    savedCost: costs.savedCost,
                    tokensSaved,
                    compressionRatio,
                    originalTokens
                };

                // Output Validation Guardrail
                let parsedData = null;
                const responseText = resultObj.response;
                if (request.schema || responseText.trim().includes("{") || responseText.trim().startsWith("{")) {
                    try {
                        parsedData = AIGateway.extractAndParseJSON(responseText);
                    } catch (e: any) {
                        throw new Error(`AIGateway JSON parsing failure: ${e.message}. Raw output: ${responseText.substring(0, 300)}`);
                    }
                } else {
                    parsedData = { text: responseText };
                }

                const validation = AIGuardrails.validateOutput(parsedData, !!request.schema);
                if (!validation.isValid) {
                    throw new Error(`AI Guardrails: Output validation failed - ${validation.reason}`);
                }

                // Save to Cache asynchronously
                if (!request.skipCache && cacheHash) {
                    const cacheDataToSave = {
                        ...resultObj,
                        cachedAt: new Date().toISOString()
                    };
                    redisCache.set(cacheHash, cacheDataToSave, 3600);
                    if (db) {
                        db.collection("ai_gateway_cache").doc(cacheHash).set(cacheDataToSave).catch((e: any) => console.warn("[AIGateway] Cache write failed", e));
                    }
                }

                // AI Execution Ledger Audit Logging
                if (db) {
                    db.collection("ai_execution_ledger").add({
                        timestamp: new Date().toISOString(),
                        userId,
                        office,
                        agent: agentName,
                        feature,
                        level,
                        provider: providerId,
                        model,
                        promptVersion,
                        latency: resultObj.latency,
                        tokens: resultObj.tokens,
                        cacheHit: false,
                        fallbackUsed: false,
                        estimatedCost: costs.estimatedCost,
                        savedCost: costs.savedCost,
                        status: "success",
                        tokensSaved,
                        compressionRatio
                    }).catch((e: any) => console.warn("[AIGateway] Ledger write failed", e));
                }

                // Log execution telemetry asynchronously
                try {
                    await AITelemetry.logExecution({
                        requestId: crypto.randomUUID(),
                        workspaceId: office,
                        model,
                        promptVersion,
                        promptText: request.prompt,
                        responseText: resultObj.response,
                        latencyMs: resultObj.latency,
                        tokenUsage: {
                            promptTokens: Math.ceil(finalPrompt.length / 4),
                            completionTokens: Math.ceil(resultObj.response.length / 4),
                            totalTokens: resultObj.tokens
                        },
                        confidenceScore: parsedData?.confidence || 95,
                        metadata: {
                            capability: feature,
                            level,
                            tokensSaved,
                            compressionRatio
                        }
                    });
                } catch (e) {
                    console.error("AI Telemetry log failed", e);
                }

                return resultObj;

            } catch (error: any) {
                executionError = error;
                console.warn(`[AIGateway] Provider ${providerId} (${model}) failed: ${error.message}`);
                CircuitBreaker.recordFailure(providerId, error.message);
            }
        } else {
            console.warn(`[AIGateway] Circuit breaker for ${providerId} is OPEN. Triggering fallback.`);
        }

        // Fallback to Deterministic Rule Engine if provided
        if (request.fallbackRuleEngine) {
            console.log("[AIGateway] Triggering request fallback rule engine...");
            try {
                const fallbackData = request.fallbackRuleEngine(request.prompt);
                const resultObj: AIGatewayResponse = {
                    provider: "RuleEngine",
                    model: "DeterministicParser",
                    level,
                    response: JSON.stringify(fallbackData),
                    latency: Date.now() - startTime,
                    tokens: 0,
                    cached: false,
                    estimatedCost: 0,
                    savedCost: 0
                };

                if (db) {
                    db.collection("ai_execution_ledger").add({
                        timestamp: new Date().toISOString(),
                        userId,
                        office,
                        agent: agentName,
                        feature,
                        level,
                        provider: "RuleEngine",
                        model: "DeterministicParser",
                        promptVersion,
                        latency: resultObj.latency,
                        tokens: 0,
                        cacheHit: false,
                        fallbackUsed: true,
                        estimatedCost: 0,
                        savedCost: 0,
                        status: "fallback"
                    }).catch((e: any) => console.warn("[AIGateway] Ledger write for fallback failed", e));
                }

                return resultObj;
            } catch (fallbackError: any) {
                console.error("[AIGateway] Fallback Rule Engine failed:", fallbackError);
            }
        }

        // Default deterministic fallback payload
        console.warn("[AIGateway] Triggering default deterministic fallback response...");
        const defaultFallbackText = AIGateway.getDefaultDeterministicFallback(feature, level, request.schema);

        return {
            provider: "RuleEngine",
            model: "DeterministicFallback",
            level,
            response: defaultFallbackText,
            latency: Date.now() - startTime,
            tokens: 0,
            cached: false,
            estimatedCost: 0,
            savedCost: 0
        };
    }

    public static getDefaultDeterministicFallback(feature: string, level: number, schema?: any): string {
        let defaultFallbackText = "";
        if (feature === "candidate_matching" || feature === "candidate_screening" || feature === "deep_fitment" || feature === "detailed_fitment") {
            defaultFallbackText = JSON.stringify({
                matchScore: null,
                tier: "UNAVAILABLE",
                aiScreeningStatus: "FAILED",
                reason: "AI authorization required",
                skillsMatched: [],
                skillsMissing: [],
                strengths: [],
                gaps: ["AI analysis was bypassed due to authorization constraints or lack of direct recruiter intent."],
                recommendation: "PENDING_REVIEW",
                summary: "AI screening and fitment is unavailable: AI authorization or explicit intent is required to consume Gemini tokens.",
                breakdown: {
                    skillsScore: null,
                    experienceScore: null,
                    domainScore: null,
                    locationScore: null,
                    totalScore: null
                },
                recruiterAssessment: "Manual assessment by recruiter is required.",
                nextSteps: "Click 'Run AI Match' or 'Ask Copilot' to explicitly authorize AI token usage.",
                outreachDrafts: {
                    founder: "Manual review pending.",
                    professional: "Manual review pending.",
                    executive: "Manual review pending.",
                    warm: "Manual review pending."
                }
            });
        } else if (feature === "executive_summary") {
            // NOTE: this used to hardcode revenueProjection: "$145,000" and
            // activePipelineCount: 18 — invented numbers with no connection
            // to any real data, presented to a founder/exec as if they were
            // an actual briefing. Report the degraded state honestly instead
            // of fabricating financials.
            defaultFallbackText = JSON.stringify({
                briefing: "AI briefing generation is currently unavailable (running under deterministic fallback mode). Figures below could not be computed — check pipeline/revenue dashboards directly for current numbers.",
                actionItems: [
                    { id: "act-1", title: "Review pending candidates in queue", type: "review" }
                ],
                summary: "Executive Briefing unavailable: AI Gateway is in fallback mode, no live analysis was performed.",
                revenueProjection: null,
                activePipelineCount: null,
                degraded: true,
                confidence: 0
            });
        } else if (schema) {
            defaultFallbackText = JSON.stringify({
                summary: "Platform operating under deterministic rule engine fallback mode.",
                status: "ACTIVE",
                confidence: 85
            });
        } else {
            defaultFallbackText = "Platform service is active and operating under deterministic rule mode.";
        }

        return defaultFallbackText;
    }
}
