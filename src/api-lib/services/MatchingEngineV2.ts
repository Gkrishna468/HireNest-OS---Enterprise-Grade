import { AIRuntime, AIRuntimeRequest } from './AIRuntime.js';
import { Type } from '@google/genai';
import { db } from '../../lib/firebase-admin.js';

export class MatchingEngineV2 {
    /**
     * 1. Deterministic Pre-Scoring
     * Calculates an initial baseline score using simple overlap logic before invoking the LLM.
     */
    static calculateDeterministicScore(reqSkills: string[], candSkills: string[]): number {
        if (!reqSkills || reqSkills.length === 0) return 0;
        const normalizedReq = reqSkills.map(s => s.toLowerCase().trim());
        const normalizedCand = (candSkills || []).map(s => s.toLowerCase().trim());
        
        let matchCount = 0;
        for (const req of normalizedReq) {
            if (normalizedCand.some(cand => cand.includes(req) || req.includes(cand))) {
                matchCount++;
            }
        }
        return Math.round((matchCount / normalizedReq.length) * 100);
    }

    /**
     * 2. The Main Match Function
     * Uses composition with AIRuntime to perform the matching.
     */
    static async generateMatch(requirement: any, candidate: any, orgId: string) {
        const startTime = Date.now();
        
        const reqSkills = requirement.skills || requirement.techStack || [];
        const candSkills = candidate.skills || candidate.technicalSkills || [];
        
        const deterministicScore = this.calculateDeterministicScore(reqSkills, candSkills);

        const systemInstruction = `You are an expert technical recruiter and AI Matchmaker. 
Analyze the candidate's profile against the job requirement.
Calculate a comprehensive match score based on skills, experience, location, budget, and availability.
Provide evidence for your scoring. Be highly analytical and objective.
The deterministic baseline skill match is pre-calculated at: ${deterministicScore}%. Use this as a reference but apply your semantic reasoning to generate the final scores.`;

        const prompt = `Requirement:\n${JSON.stringify(requirement)}\n\nCandidate:\n${JSON.stringify(candidate)}`;

        const schema = {
            type: Type.OBJECT,
            properties: {
                overallMatch: { type: Type.INTEGER, description: "Overall match score 0-100" },
                confidence: { type: Type.NUMBER, description: "Confidence score 0.0-1.0" },
                recommendation: { type: Type.STRING, description: "Proceed, Review, or Reject" },
                skills: {
                    type: Type.OBJECT,
                    properties: {
                        matched: { type: Type.ARRAY, items: { type: Type.STRING } },
                        missing: { type: Type.ARRAY, items: { type: Type.STRING } },
                        related: { type: Type.ARRAY, items: { type: Type.STRING } }
                    }
                },
                experience: {
                    type: Type.OBJECT,
                    properties: {
                        requiredYears: { type: Type.NUMBER },
                        candidateYears: { type: Type.NUMBER },
                        score: { type: Type.INTEGER }
                    }
                },
                location: {
                    type: Type.OBJECT,
                    properties: {
                        required: { type: Type.STRING },
                        candidate: { type: Type.STRING },
                        remoteCompatible: { type: Type.BOOLEAN },
                        score: { type: Type.INTEGER }
                    }
                },
                budget: {
                    type: Type.OBJECT,
                    properties: {
                        required: { type: Type.NUMBER },
                        candidate: { type: Type.NUMBER },
                        score: { type: Type.INTEGER }
                    }
                },
                availability: {
                    type: Type.OBJECT,
                    properties: {
                        noticePeriod: { type: Type.INTEGER },
                        score: { type: Type.INTEGER }
                    }
                },
                mandatoryFailures: { type: Type.ARRAY, items: { type: Type.STRING } },
                riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                summary: { type: Type.STRING, description: "A summary explaining why this candidate is a good or bad fit." },
                evidence: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            skill: { type: Type.STRING },
                            score: { type: Type.INTEGER },
                            source: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            },
            required: ["overallMatch", "confidence", "recommendation", "summary"]
        };

        const aiRequest: AIRuntimeRequest = {
            prompt: `${systemInstruction}\n\n${prompt}`,
            capability: 'candidate_matching',
            modelPreference: 'accurate',
            schema: schema,
            compressContext: true
        };

        try {
            const aiResponse = await AIRuntime.analyze(aiRequest);
            const matchData = aiResponse.data;
            
            // 3. Metadata & Ledger
            const finalResult = {
                ...matchData,
                aiModel: aiResponse.model,
                promptVersion: "v2.1",
                deterministicScore,
                schemaVersion: 1
            };

            // 4. Persist to Match Ledger
            if (db) {
                try {
                    await db.collection('candidate_matches_v2').add({
                        requirementId: requirement.id || 'unknown',
                        candidateId: candidate.id || 'unknown',
                        orgId: orgId,
                        matchData: finalResult,
                        executionDetails: {
                            latency: aiResponse.latency,
                            tokensSaved: aiResponse.tokensSaved,
                            compressionRatio: aiResponse.compressionRatio,
                            originalTokens: aiResponse.originalTokens
                        },
                        createdAt: new Date().toISOString()
                    });
                } catch (dbErr) {
                    console.error("Failed to save match to ledger:", dbErr);
                }
            }

            return finalResult;
        } catch (error: any) {
            console.error("Match Engine V2 failed", error);
            // 8. AI Fallback (Rule Engine / Deterministic)
            return {
                overallMatch: deterministicScore,
                confidence: 0.5, // Low confidence on fallback
                recommendation: deterministicScore > 70 ? "Proceed (Fallback)" : "Review (Fallback)",
                summary: "AI analysis unavailable. Falling back to deterministic keyword matching.",
                fallbackUsed: true,
                deterministicScore,
                aiModel: "none (fallback)",
                schemaVersion: 1
            };
        }
    }
}
