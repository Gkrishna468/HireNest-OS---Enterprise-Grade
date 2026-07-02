import { GoogleGenAI } from '@google/genai';
import * as crypto from 'crypto';
import { db } from '../../lib/firebase-admin.js';
import { headroomOptimizer } from './HeadroomOptimizer.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy' });

export type AICapability = 
  | 'resume_parsing'
  | 'candidate_matching'
  | 'jd_extraction'
  | 'semantic_reasoning'
  | 'executive_summary'
  | 'salary_analysis'
  | 'market_trends'
  | 'email_drafting'
  | 'general';

export interface AIRuntimeRequest {
    prompt: string;
    capability?: AICapability;
    schema?: any;
    modelPreference?: 'fast' | 'accurate' | 'large_context';
    cacheKeyStr?: string;
    imageParts?: Array<{ inlineData: { data: string; mimeType: string } }>;
    fallbackRuleEngine?: (text: string) => any;
    compressContext?: boolean; // NEW: Should we compress the prompt?
}

export interface AIRuntimeResponse {
    provider: string;
    model: string;
    confidence: number;
    data: any;
    latency: number;
    cacheHit: boolean;
    outcome: 'success' | 'failed';
    retryCount: number;
    tokensSaved?: number; // NEW: Metrics from Headroom
    compressionRatio?: number;
    originalTokens?: number;
}

export class AIRuntime {
    /**
     * Centralized AI analysis endpoint with fallback and caching.
     */
    static async analyze(request: AIRuntimeRequest): Promise<AIRuntimeResponse> {
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
            const modelToUse = request.modelPreference === 'accurate' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
            let contentParts: any[] = [];
            let tokensSaved = 0;
            let compressionRatio = 1.0;
            let originalTokens = 0;

            if (request.compressContext) {
                 const compressed = await headroomOptimizer.compress(request.prompt);
                 contentParts.push(compressed.data);
                 tokensSaved = compressed.metrics.savedTokens;
                 compressionRatio = compressed.metrics.compressionRatio;
                 originalTokens = compressed.metrics.originalTokens;
                 console.log(`[AIRuntime] Headroom compression saved ${tokensSaved} tokens.`);
            } else {
                 contentParts.push(request.prompt);
            }
            
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

            const finalResponse: AIRuntimeResponse = {
                provider: 'Google',
                model: modelToUse,
                confidence: confidence,
                data: parsedData,
                latency: Date.now() - startTime,
                cacheHit: false,
                outcome: 'success',
                retryCount: 0,
                tokensSaved: tokensSaved,
                compressionRatio: compressionRatio,
                originalTokens: originalTokens
            };

            // AI Explainability Ledger
            try {
                db.collection('ai_metrics_ledger').add({
                    timestamp: new Date(),
                    provider: 'Google',
                    model: modelToUse,
                    latency: finalResponse.latency,
                    tokensSaved: tokensSaved,
                    compressionRatio: compressionRatio,
                    originalTokens: originalTokens,
                    cacheHit: false,
                    capability: request.capability || 'general',
                    confidence: confidence
                }).catch(e => console.error("Ledger log failed", e));
            } catch (e) {
                // non-blocking
            }

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
