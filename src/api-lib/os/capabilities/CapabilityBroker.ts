import { AIRuntime } from '../../services/AIRuntime.js';

export interface CapabilityRequest {
    type: 'RESUME_PARSING' | 'MATCH_CANDIDATE' | 'JD_ANALYSIS' | 'WORK_PRIORITIZATION';
    payload: any;
    strategyPreference?: 'AUTO' | 'GEMINI' | 'RULE_ENGINE' | 'CACHE_ONLY' | 'HUMAN_REVIEW';
}

export interface CapabilityResponse {
    success: boolean;
    strategyUsed: string;
    data?: any;
    error?: string;
}

/**
 * CapabilityBroker sits between the Office and the actual implementation of skills.
 * It chooses the optimal execution strategy (Gemini, Rule Engine, Cache, or Human Review).
 */
export class CapabilityBroker {
    async requestCapability(request: CapabilityRequest): Promise<CapabilityResponse> {
        console.log(`[Capability Broker] Processing request for capability: ${request.type} with strategy preference: ${request.strategyPreference || 'AUTO'}`);

        try {
            switch (request.type) {
                case 'RESUME_PARSING':
                    return await this.handleResumeParsing(request.payload, request.strategyPreference || 'AUTO');
                
                case 'MATCH_CANDIDATE':
                    return await this.handleCandidateMatching(request.payload, request.strategyPreference || 'AUTO');

                case 'JD_ANALYSIS':
                    return await this.handleJDAnalysis(request.payload, request.strategyPreference || 'AUTO');

                case 'WORK_PRIORITIZATION':
                    return await this.handleWorkPrioritization(request.payload, request.strategyPreference || 'AUTO');

                default:
                    return {
                        success: false,
                        strategyUsed: 'NONE',
                        error: `Unknown capability type: ${request.type}`
                    };
            }
        } catch (err: any) {
            console.error(`[Capability Broker] Error executing capability ${request.type}:`, err);
            return {
                success: false,
                strategyUsed: 'FALLBACK_ERROR',
                error: err.message || 'Unknown internal error'
            };
        }
    }

    private async handleResumeParsing(payload: any, preference: string): Promise<CapabilityResponse> {
        const text = payload.text || '';
        const cacheKey = payload.cacheKey || text.substring(0, 100);

        // 1. CACHE ONLY Strategy
        if (preference === 'CACHE_ONLY') {
            const cachedResult = await AIRuntime.analyze({ prompt: text, cacheKeyStr: cacheKey });
            if (cachedResult && cachedResult.cacheHit) {
                return { success: true, strategyUsed: 'CACHE', data: cachedResult.data };
            }
            return { success: false, strategyUsed: 'CACHE_ONLY', error: 'Cache miss for CACHE_ONLY request' };
        }

        // 2. HUMAN REVIEW Strategy
        if (preference === 'HUMAN_REVIEW') {
            return {
                success: true,
                strategyUsed: 'HUMAN_REVIEW',
                data: {
                    status: 'REVIEW_REQUIRED',
                    reason: 'Manually routed to recruitment manager for review',
                    extractedInfo: {
                        name: 'Pending Extracted Name',
                        email: payload.email || 'unknown@example.com',
                        skills: []
                    }
                }
            };
        }

        // 3. RULE ENGINE Strategy (Regex parsing)
        if (preference === 'RULE_ENGINE') {
            const regexData = this.ruleEngineParseResume(text);
            return { success: true, strategyUsed: 'RULE_ENGINE', data: regexData };
        }

        // 4. AUTO/GEMINI Strategy
        if (preference === 'AUTO' || preference === 'GEMINI') {
            // First check cache anyway to save tokens
            const cachedResult = await AIRuntime.analyze({ prompt: text, cacheKeyStr: cacheKey });
            if (cachedResult && cachedResult.cacheHit) {
                return { success: true, strategyUsed: 'CACHE', data: cachedResult.data };
            }

            // Fallback rule engine to inject if Gemini fails
            const result = await AIRuntime.analyze({
                prompt: `You are an expert resume parsing model. Extract contact information, skills, experience, and education from this resume in JSON format. Return a schema matching { name: string, email: string, phone: string, skills: string[], experienceYears: number, currentTitle: string }:\n\n${text}`,
                schema: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        skills: { type: 'array', items: { type: 'string' } },
                        experienceYears: { type: 'number' },
                        currentTitle: { type: 'string' }
                    }
                },
                modelPreference: 'fast',
                cacheKeyStr: cacheKey,
                fallbackRuleEngine: (t) => this.ruleEngineParseResume(t)
            });

            return {
                success: result.outcome === 'success',
                strategyUsed: result.provider === 'Google' ? 'GEMINI' : result.provider,
                data: result.data,
                error: result.outcome === 'failed' ? 'AI execution failed' : undefined
            };
        }

        throw new Error(`Strategy preference ${preference} is unsupported for RESUME_PARSING`);
    }

    private ruleEngineParseResume(text: string): any {
        // Simple deterministic rule-based extractor
        const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const phoneMatch = text.match(/[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}/);
        
        const possibleNames = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const name = possibleNames[0] || 'Unknown Candidate';

        const skillKeywords = ['javascript', 'typescript', 'react', 'node', 'python', 'java', 'aws', 'docker', 'kubernetes', 'postgresql'];
        const foundSkills: string[] = [];
        const lowerText = text.toLowerCase();
        skillKeywords.forEach(skill => {
            if (lowerText.includes(skill)) foundSkills.push(skill);
        });

        return {
            name,
            email: emailMatch ? emailMatch[0] : 'unknown@example.com',
            phone: phoneMatch ? phoneMatch[0] : '',
            skills: foundSkills,
            experienceYears: lowerText.includes('senior') ? 8 : 3,
            currentTitle: lowerText.includes('manager') ? 'Engineering Manager' : 'Software Engineer'
        };
    }

    private async handleCandidateMatching(payload: any, preference: string): Promise<CapabilityResponse> {
        const { candidateSkills, requirementSkills } = payload;
        
        if (preference === 'RULE_ENGINE') {
            // Overlapping skills percentage
            const matched = candidateSkills.filter((s: string) => requirementSkills.includes(s));
            const score = requirementSkills.length > 0 ? Math.round((matched.length / requirementSkills.length) * 100) : 50;
            return {
                success: true,
                strategyUsed: 'RULE_ENGINE',
                data: { score, matchedSkills: matched, confidence: 0.7 }
            };
        }

        // Gemini matching
        const prompt = `Assess the matching score between the candidate skills and the requirement skills. Candidate Skills: ${JSON.stringify(candidateSkills)}. Requirement Skills: ${JSON.stringify(requirementSkills)}. Respond in JSON: { "score": number (0-100), "matchedSkills": string[], "confidence": number (0-1), "justification": string }`;
        const result = await AIRuntime.analyze({
            prompt,
            modelPreference: 'fast'
        });

        return {
            success: result.outcome === 'success',
            strategyUsed: 'GEMINI',
            data: result.data || { score: 70, matchedSkills: [], confidence: 0.8 }
        };
    }

    private async handleJDAnalysis(payload: any, preference: string): Promise<CapabilityResponse> {
        const jdText = payload.text || '';
        const result = await AIRuntime.analyze({
            prompt: `Parse this job description and extract required skills, ideal experience years, target salary, and job role:\n\n${jdText}`,
            modelPreference: 'fast'
        });

        return {
            success: result.outcome === 'success',
            strategyUsed: 'GEMINI',
            data: result.data
        };
    }

    private async handleWorkPrioritization(payload: any, preference: string): Promise<CapabilityResponse> {
        const { queueItems } = payload;
        // Optimization heuristic
        const sorted = [...queueItems].sort((a, b) => (b.revenuePotential || 0) - (a.revenuePotential || 0));
        return {
            success: true,
            strategyUsed: 'DETERMINISTIC_SORTER',
            data: sorted
        };
    }
}
