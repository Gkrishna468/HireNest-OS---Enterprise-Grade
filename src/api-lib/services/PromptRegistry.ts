import { db } from '../../lib/firebase-admin.js';

export type PromptVersion = 'v1' | 'v2' | 'v3';
export type PromptCapability = 
  | 'resume_parse'
  | 'jd_parse'
  | 'candidate_match'
  | 'executive_summary'
  | 'vendor_summary'
  | 'offer_generation'
  | 'interview_feedback';

export class PromptRegistry {
    /**
     * Dynamic Prompt Registry for AI models.
     * Fetches versioned prompts from Firestore (system_ai_prompts collection)
     * and interpolates variables dynamically. Falls back to static templates.
     */
    static async getPromptAsync(
        capability: PromptCapability,
        version: string = 'v1',
        params: Record<string, any> = {}
    ): Promise<string> {
        if (db) {
            try {
                // Try to get specific version doc, e.g., "resume_parse_v1"
                const docId = `${capability}_${version}`;
                let docSnap = await db.collection('system_ai_prompts').doc(docId).get();
                
                // Fallback to capability doc if specific version doc is missing
                if (!docSnap.exists) {
                    docSnap = await db.collection('system_ai_prompts').doc(capability).get();
                }

                if (docSnap.exists) {
                    const data = docSnap.data();
                    if (data && data.template) {
                        console.log(`[PromptRegistry] Dynamic prompt loaded for ${capability} (${version})`);
                        return this.interpolate(data.template, params);
                    }
                }
            } catch (err: any) {
                console.warn(`[PromptRegistry] Dynamic prompt loading failed for ${capability}:`, err.message);
            }
        }

        // Fallback to static synchronous template
        return this.getPrompt(capability, version as PromptVersion, params);
    }

    /**
     * Helper to interpolate variables like ${variableName} in a template string
     */
    private static interpolate(template: string, params: Record<string, any>): string {
        return template.replace(/\$\{(\w+)\}/g, (match, key) => {
            return params[key] !== undefined ? String(params[key]) : match;
        });
    }

    /**
     * Centralized Prompt Registry for AI models (Static fallback).
     * Versioned prompts to allow rollbacks and testing.
     */
    static getPrompt(capability: PromptCapability, version: PromptVersion = 'v1', params: Record<string, any> = {}): string {
        switch (capability) {
            case 'resume_parse':
                if (version === 'v1') {
                    return `SYSTEM INSTRUCTION: You are an expert HR system.
Parse this resume text into a structured JSON with 'skills', 'experience', 'summary'.
Resume: ${params.resumeText || ''}`;
                }
                break;
            case 'jd_parse':
                if (version === 'v1') {
                    return `SYSTEM INSTRUCTION: You are an expert HR system.
Extract the core requirement details, skills, and experience from the JD.
JD: ${params.jdText || ''}`;
                }
                break;
            case 'candidate_match':
                if (version === 'v1') {
                    return `SYSTEM INSTRUCTION: You are a technical hiring expert. 
Provide a 1-2 sentence explanation of why this candidate is a match (or not) for the given Job Description.
Base your reasoning on these deterministic results:
- Score: ${params.totalScore || 0}%
- Matched Skills: ${(params.foundSkills || []).join(", ")}
- Missing Skills: ${(params.missingSkills || []).join(", ")}
- Experience Fit: ${params.candidateExp || 0} yrs vs ${params.requiredExp || 0} yrs required.

JD: ${params.jdText || ''}
RESUME: ${params.resumeText || ''}`;
                }
                break;
            // Add other capabilities as needed
            default:
                return params.defaultPrompt || "Extract key information.";
        }
        
        return "Extract key information.";
    }
}

