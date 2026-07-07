import { AIRuntime, AIRuntimeRequest, AICapability } from './AIRuntime.js';
import { ErrorMonitor } from '../telemetry/errorMonitor.js';
import { db } from '../../lib/firebase-admin.js';
import crypto from 'crypto';

export interface AIGatewayRequest {
    prompt: string;
    feature?: AICapability;
    promptVersion?: string;
    requireLocal?: boolean; // Try Ollama first
    skipCache?: boolean;
    userId?: string;
    office?: string;
    agent?: string;
}

export interface AIGatewayResponse {
    provider: string;
    model: string;
    response: string;
    latency: number;
    tokens: number;
    cached: boolean;
    estimatedCost?: number;
    savedCost?: number;
}

export class AIGateway {
    private static cachedRoutes: Record<string, { routes: { provider: string, model: string }[], expiry: number }> = {};
    private static readonly ROUTE_CACHE_DURATION = 60 * 1000; // 1 minute Cache for Firestore routing

    /**
     * Determines which model to route to based on feature (Static Defaults)
     */
    static getModelRouting(feature: string): { provider: string, model: string }[] {
        const preferredProvider = process.env.AI_PROVIDER || 'google'; // 'google', 'ollama', 'openai'
        const ollamaFast = process.env.OLLAMA_MODEL_FAST || 'qwen3:8b';
        const ollamaAccurate = process.env.OLLAMA_MODEL_ACCURATE || 'deepseek-r1';
        
        const googleFast = 'gemini-3.5-flash';
        const googleAccurate = 'gemini-3.1-pro-preview';
        
        const openaiFast = process.env.OPENAI_MODEL_FAST || 'gpt-4o-mini';
        const openaiAccurate = process.env.OPENAI_MODEL_ACCURATE || 'gpt-4o';

        // Set up priority order based on preferred provider
        const providersOrder = [preferredProvider, 'google', 'ollama', 'openai'].filter(
            (v, i, self) => self.indexOf(v) === i
        );

        const routes: { provider: string, model: string }[] = [];

        for (const provider of providersOrder) {
            if (provider === 'google') {
                const isAccurate = ['candidate_matching', 'semantic_reasoning'].includes(feature);
                routes.push({ provider: 'google', model: isAccurate ? googleAccurate : googleFast });
            } else if (provider === 'ollama') {
                const isAccurate = ['candidate_matching', 'semantic_reasoning'].includes(feature);
                routes.push({ provider: 'ollama', model: isAccurate ? ollamaAccurate : ollamaFast });
            } else if (provider === 'openai') {
                const isAccurate = ['candidate_matching', 'semantic_reasoning'].includes(feature);
                routes.push({ provider: 'openai', model: isAccurate ? openaiAccurate : openaiFast });
            }
        }

        return routes;
    }

    /**
     * Retrieves routing dynamically from Firestore system_ai_models registry or falls back to standard routes
     */
    static async getModelRoutingAsync(feature: string): Promise<{ provider: string, model: string }[]> {
        const now = Date.now();
        if (this.cachedRoutes[feature] && this.cachedRoutes[feature].expiry > now) {
            return this.cachedRoutes[feature].routes;
        }

        let routes = this.getModelRouting(feature);

        if (db) {
            try {
                const docSnap = await db.collection('system_ai_models').doc(feature).get();
                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data && Array.isArray(data.routes)) {
                        routes = data.routes;
                        console.log(`[AIGateway] Loaded dynamic model routes for ${feature} from system_ai_models registry.`);
                    }
                } else {
                    const generalSnap = await db.collection('system_ai_models').doc('general').get();
                    if (generalSnap.exists) {
                        const data = generalSnap.data();
                        if (data && Array.isArray(data.routes)) {
                            routes = data.routes;
                        }
                    }
                }
            } catch (err: any) {
                console.warn(`[AIGateway] Dynamic model routing lookup failed for ${feature}:`, err.message);
            }
        }

        // Cache routes for 1 minute
        this.cachedRoutes[feature] = {
            routes,
            expiry: now + this.ROUTE_CACHE_DURATION
        };

        return routes;
    }

    /**
     * Calls a local Ollama instance
     */
    static async callOllama(prompt: string, model: string): Promise<{ text: string, tokens: number }> {
        const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });

        if (!response.ok) {
            throw new Error(`Ollama failed with status: ${response.status}`);
        }

        const data = await response.json();
        return {
            text: data.response,
            tokens: data.eval_count || 0
        };
    }

    /**
     * Calls OpenAI API
     */
    static async callOpenAI(prompt: string, model: string): Promise<{ text: string, tokens: number }> {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error("OpenAI API Key is not configured in process.env.OPENAI_API_KEY.");
        }
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model || "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }]
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI failed with status: ${response.status}`);
        }

        const data = await response.json();
        return {
            text: data.choices?.[0]?.message?.content || "",
            tokens: data.usage?.total_tokens || 0
        };
    }

    /**
     * Financial Ledger Cost estimation helper
     */
    static calculateCost(provider: string, model: string, tokens: number, isCached: boolean = false): { estimatedCost: number, savedCost: number } {
        let ratePerToken = 0.0;
        const lowerModel = (model || '').toLowerCase();

        if (provider === 'google') {
            if (lowerModel.includes('pro')) {
                // gemini-3.1-pro average pricing (Input/Output blended)
                ratePerToken = 0.0000025; // $2.50 per 1M tokens
            } else {
                // gemini-3.5-flash average pricing
                ratePerToken = 0.00000015; // $0.15 per 1M tokens
            }
        } else if (provider === 'openai') {
            if (lowerModel.includes('mini')) {
                // gpt-4o-mini
                ratePerToken = 0.0000003; // $0.30 per 1M tokens
            } else {
                // gpt-4o standard
                ratePerToken = 0.000005; // $5.00 per 1M tokens
            }
        } else {
            // local or un-billed
            ratePerToken = 0.0;
        }

        const cost = tokens * ratePerToken;

        if (isCached) {
            return { estimatedCost: 0, savedCost: cost };
        } else {
            return { estimatedCost: cost, savedCost: 0 };
        }
    }

    /**
     * Process chat request with automatic fallback, dynamic model routing, hashed caching, and advanced governance metrics.
     */
    static async processChat(request: AIGatewayRequest): Promise<AIGatewayResponse> {
        const startTime = Date.now();
        const feature = request.feature || 'general';
        const promptVersion = request.promptVersion || 'v1.0';
        const userId = request.userId || 'system';
        const office = request.office || 'general';
        const agentName = request.agent || feature;
        
        // 1. Check Hashed Cache
        let cacheKeyStr = '';
        let cacheHash = '';
        if (!request.skipCache && db) {
            cacheKeyStr = JSON.stringify({
                agent: agentName,
                promptVersion,
                normalizedPrompt: request.prompt.trim()
            });
            cacheHash = crypto.createHash('sha256').update(cacheKeyStr).digest('hex');
            
            try {
                const cacheDoc = await db.collection('ai_gateway_cache').doc(cacheHash).get();
                if (cacheDoc.exists) {
                    const cachedData = cacheDoc.data() as AIGatewayResponse;
                    console.log(`[AIGateway] Hashed cache hit for agent ${agentName}`);
                    
                    const latency = Date.now() - startTime;
                    const financialCosts = this.calculateCost(cachedData.provider, cachedData.model, cachedData.tokens, true);

                    const fullResponse = {
                        ...cachedData,
                        latency,
                        cached: true,
                        estimatedCost: financialCosts.estimatedCost,
                        savedCost: financialCosts.savedCost
                    };

                    // Log cached hit to audit ledger
                    db.collection('ai_execution_ledger').add({
                        timestamp: new Date().toISOString(),
                        userId,
                        office,
                        agent: agentName,
                        feature,
                        provider: cachedData.provider,
                        model: cachedData.model,
                        promptVersion,
                        latency,
                        tokens: cachedData.tokens,
                        cacheHit: true,
                        fallbackUsed: false,
                        estimatedCost: financialCosts.estimatedCost,
                        savedCost: financialCosts.savedCost,
                        status: 'success'
                    }).catch(e => console.warn("[AIGateway] Ledger cached write failed", e));

                    return fullResponse;
                }
            } catch (e) {
                console.warn("[AIGateway] Cache read failed", e);
            }
        }

        // Load dynamic routing registry
        const routes = await this.getModelRoutingAsync(feature);
        let lastError = null;
        let routeIndex = 0;

        for (const route of routes) {
            const fallbackUsed = routeIndex > 0;
            try {
                let resultObj: AIGatewayResponse | null = null;

                if (route.provider === 'ollama') {
                    console.log(`[AIGateway] Trying Ollama (${route.model})...`);
                    const result = await this.callOllama(request.prompt, route.model);
                    resultObj = {
                        provider: 'ollama',
                        model: route.model,
                        response: result.text,
                        latency: Date.now() - startTime,
                        tokens: result.tokens,
                        cached: false
                    };
                } else if (route.provider === 'openai') {
                    console.log(`[AIGateway] Trying OpenAI (${route.model})...`);
                    const result = await this.callOpenAI(request.prompt, route.model);
                    resultObj = {
                        provider: 'openai',
                        model: route.model,
                        response: result.text,
                        latency: Date.now() - startTime,
                        tokens: result.tokens,
                        cached: false
                    };
                } else if (route.provider === 'google') {
                    console.log(`[AIGateway] Trying Google (${route.model})...`);
                    const result = await AIRuntime.analyze({
                        prompt: request.prompt,
                        capability: request.feature,
                        modelPreference: route.model.includes('pro') ? 'accurate' : 'fast'
                    });
                    
                    if (result.outcome === 'success' && result.data) {
                        resultObj = {
                            provider: 'google',
                            model: result.model,
                            response: result.data.text || JSON.stringify(result.data),
                            latency: result.latency,
                            tokens: (result.originalTokens || 0) + (result.tokensSaved || 0), // rough estimate
                            cached: result.cacheHit
                        };
                    }
                }

                if (resultObj) {
                    const costs = this.calculateCost(route.provider, route.model, resultObj.tokens, false);
                    resultObj.estimatedCost = costs.estimatedCost;
                    resultObj.savedCost = costs.savedCost;

                    // 2. Save to Cache asynchronously
                    if (!request.skipCache && db && cacheHash) {
                        db.collection('ai_gateway_cache').doc(cacheHash).set({
                            ...resultObj,
                            cachedAt: new Date().toISOString()
                        }).catch(e => console.warn("[AIGateway] Cache write failed", e));
                    }
                    
                    // 3. AI Execution Ledger (Rich auditing schema)
                    if (db) {
                        db.collection('ai_execution_ledger').add({
                            timestamp: new Date().toISOString(),
                            userId,
                            office,
                            agent: agentName,
                            feature,
                            provider: route.provider,
                            model: route.model,
                            promptVersion,
                            latency: resultObj.latency,
                            tokens: resultObj.tokens,
                            cacheHit: false,
                            fallbackUsed,
                            estimatedCost: costs.estimatedCost,
                            savedCost: costs.savedCost,
                            status: 'success'
                        }).catch(e => console.warn("[AIGateway] Ledger write failed", e));
                    }

                    return resultObj;
                }
            } catch (error: any) {
                console.warn(`[AIGateway] Provider ${route.provider} (${route.model}) failed: ${error.message}`);
                lastError = error;
            }
            routeIndex++;
        }

        // If we exhausted all routes
        if (db) {
            db.collection('ai_execution_ledger').add({
                timestamp: new Date().toISOString(),
                userId,
                office,
                agent: agentName,
                feature,
                promptVersion,
                fallbackUsed: routeIndex > 1,
                status: 'failed',
                error: lastError?.message || 'All providers failed'
            }).catch(e => console.warn("[AIGateway] Ledger error log write failed", e));
        }

        await ErrorMonitor.captureError({
            context: 'AIGateway',
            errorType: 'AI_FAILURE',
            errorMessage: 'All AI providers failed',
            metadata: { feature, lastError: lastError?.message }
        });

        throw new Error("All AI providers failed to process the request");
    }
}
