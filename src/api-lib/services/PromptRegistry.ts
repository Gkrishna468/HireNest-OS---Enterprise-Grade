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
     * Centralized Prompt Registry for AI models.
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
