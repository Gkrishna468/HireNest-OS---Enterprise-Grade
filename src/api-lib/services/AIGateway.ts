import { GoogleGenAI } from '@google/genai';
import * as crypto from 'crypto';
import { db } from '../../lib/firebase-admin.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy' });

export interface AIGatewayRequest {
    prompt: string;
    schema?: any;
    modelPreference?: 'fast' | 'accurate' | 'large_context';
    cacheKeyStr?: string;
    imageParts?: Array<{ inlineData: { data: string; mimeType: string } }>;
    fallbackRuleEngine?: (text: string) => any;
}

export interface AIGatewayResponse {
    provider: string;
    model: string;
    confidence: number;
    data: any;
    latency: number;
    cacheHit: boolean;
    outcome: 'success' | 'failed';
    retryCount: number;
}

export class AIGateway {
    /**
     * Centralized AI analysis endpoint with fallback and caching.
     */
    static async analyze(request: AIGatewayRequest): Promise<AIGatewayResponse> {
        const startTime = Date.now();
        let retryCount = 0;

        // 1. Check Cache
        if (request.cacheKeyStr) {
            const hash = crypto.createHash('sha256').update(request.cacheKeyStr).digest('hex');
            const cacheRef = db.collection('ai_cache').doc(hash);
            const cacheDoc = await cacheRef.get();
            
            if (cacheDoc.exists) {
                const cachedData = cacheDoc.data();
                return {
                    provider: cachedData?.provider || 'Cache',
                    model: cachedData?.model || 'Cache',
                    confidence: cachedData?.confidence || 100,
                    data: cachedData?.data,
                    latency: Date.now() - startTime,
                    cacheHit: true,
                    outcome: 'success',
                    retryCount: 0
                };
            }
        }

        // 2. Try Primary Provider (Gemini)
        try {
            const modelToUse = request.modelPreference === 'accurate' ? 'gemini-3.5-pro' : 'gemini-3.5-flash';
            const contentParts: any[] = [request.prompt];
            
            if (request.imageParts && request.imageParts.length > 0) {
                contentParts.push(...request.imageParts);
            }

            const response = await ai.models.generateContent({
                model: modelToUse,
                contents: contentParts,
                config: { 
                    responseMimeType: request.schema ? 'application/json' : 'text/plain',
                    // responseSchema: request.schema // simplified for now
                }
            });

            let parsedData;
            if (request.schema || response.text?.trim().startsWith('{')) {
                 try {
                     parsedData = JSON.parse(response.text || "{}");
                 } catch (e) {
                     // Attempt to sanitize JSON if it's wrapped in markdown
                     const text = response.text || "";
                     const jsonMatch = text.match(/```json([\s\S]*?)```/);
                     if (jsonMatch) {
                         parsedData = JSON.parse(jsonMatch[1]);
                     } else {
                         throw e;
                     }
                 }
            } else {
                parsedData = { text: response.text };
            }

            const confidence = parsedData.confidence || 95;

            const finalResponse: AIGatewayResponse = {
                provider: 'Google',
                model: modelToUse,
                confidence: confidence,
                data: parsedData,
                latency: Date.now() - startTime,
                cacheHit: false,
                outcome: 'success',
                retryCount: 0
            };

            // Save to cache asynchronously
            if (request.cacheKeyStr) {
                const hash = crypto.createHash('sha256').update(request.cacheKeyStr).digest('hex');
                db.collection('ai_cache').doc(hash).set({
                    ...finalResponse,
                    createdAt: new Date()
                }).catch(e => console.error("Cache save failed", e));
            }

            return finalResponse;

        } catch (error) {
            console.warn(`Primary AI Provider Failed (Google):`, error);
            
            // 3. Fallback to Secondary AI Provider (OpenRouter/OpenAI)
            if (process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY) {
                console.log("Attempting secondary AI provider fallback (OpenRouter/OpenAI)...");
                // TODO: Implement actual secondary provider call here
                // e.g., const response = await fetch('https://openrouter.ai/api/v1/chat/completions', ...)
                // If it succeeds, return the parsed response.
                // If it fails, continue to the rule engine.
            }

            // 4. Fallback to Deterministic Rule Engine
            if (request.fallbackRuleEngine) {
                console.log("Using deterministic fallback rule engine");
                try {
                    const fallbackData = request.fallbackRuleEngine(request.prompt);
                    return {
                        provider: 'RuleEngine',
                        model: 'DeterministicParser',
                        confidence: fallbackData.confidence || 60,
                        data: fallbackData,
                        latency: Date.now() - startTime,
                        cacheHit: false,
                        outcome: 'success',
                        retryCount: 0
                    };
                } catch (fallbackError) {
                    console.error("Fallback Rule Engine Failed", fallbackError);
                }
            }

            // 4. Ultimate Failure
            return {
                provider: 'None',
                model: 'None',
                confidence: 0,
                data: null,
                latency: Date.now() - startTime,
                cacheHit: false,
                outcome: 'failed',
                retryCount: retryCount
            };
        }
    }
}
