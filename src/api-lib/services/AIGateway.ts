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
}

export interface AIGatewayResponse {
    provider: string;
    model: string;
    response: string;
    latency: number;
    tokens: number;
    cached: boolean;
}

export class AIGateway {
    /**
     * Determines which model to route to based on feature
     */
    static getModelRouting(feature: string): { provider: string, model: string }[] {
        switch (feature) {
            case 'resume_parsing':
            case 'executive_summary':
            case 'email_drafting':
                return [
                    { provider: 'ollama', model: 'qwen3:8b' },
                    { provider: 'google', model: 'gemini-2.5-flash' }
                ];
            case 'candidate_matching':
            case 'semantic_reasoning':
                return [
                    { provider: 'google', model: 'gemini-2.5-pro' },
                    { provider: 'ollama', model: 'deepseek-r1' }
                ];
            default:
                return [
                    { provider: 'google', model: 'gemini-2.5-flash' },
                    { provider: 'ollama', model: 'qwen3:8b' }
                ];
        }
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
     * Process chat request with automatic fallback and caching
     */
    static async processChat(request: AIGatewayRequest): Promise<AIGatewayResponse> {
        const startTime = Date.now();
        const feature = request.feature || 'general';
        
        // 1. Check Cache
        let cacheKeyStr = '';
        let cacheHash = '';
        if (!request.skipCache && db) {
            cacheKeyStr = `${feature}-${request.promptVersion || 'v1.0'}-${request.prompt}`;
            cacheHash = crypto.createHash('sha256').update(cacheKeyStr).digest('hex');
            
            try {
                const cacheDoc = await db.collection('ai_gateway_cache').doc(cacheHash).get();
                if (cacheDoc.exists) {
                    const cachedData = cacheDoc.data() as AIGatewayResponse;
                    console.log(`[AIGateway] Cache hit for ${feature}`);
                    return {
                        ...cachedData,
                        latency: Date.now() - startTime,
                        cached: true
                    };
                }
            } catch (e) {
                console.warn("[AIGateway] Cache read failed", e);
            }
        }

        const routes = this.getModelRouting(feature);
        let lastError = null;

        for (const route of routes) {
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
                    // 2. Save to Cache asynchronously
                    if (!request.skipCache && db && cacheHash) {
                        db.collection('ai_gateway_cache').doc(cacheHash).set({
                            ...resultObj,
                            cachedAt: new Date().toISOString()
                        }).catch(e => console.warn("[AIGateway] Cache write failed", e));
                    }
                    
                    // 3. AI Execution Ledger
                    if (db) {
                        db.collection('ai_execution_ledger').add({
                            feature,
                            provider: route.provider,
                            model: route.model,
                            promptVersion: request.promptVersion || 'v1.0',
                            latency: resultObj.latency,
                            tokens: resultObj.tokens,
                            success: true,
                            timestamp: new Date().toISOString()
                        }).catch(e => console.warn("[AIGateway] Ledger write failed", e));
                    }

                    return resultObj;
                }
            } catch (error: any) {
                console.warn(`[AIGateway] Provider ${route.provider} failed: ${error.message}`);
                lastError = error;
                // Continue to next fallback
            }
        }

        // If we exhausted all routes
        if (db) {
            db.collection('ai_execution_ledger').add({
                feature,
                success: false,
                error: lastError?.message || 'All providers failed',
                timestamp: new Date().toISOString()
            }).catch(e => console.warn("[AIGateway] Ledger write failed", e));
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
