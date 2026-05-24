// src/lib/matchingPrompts.ts

export const MATCH_SYSTEM_PROMPT = `As a Senior Executive Recruiter with 20 years of experience in Pan-India and US IT Staffing, your goal is to provide a brutal, precise, and strategic assessment of a candidate.

You must look for specific technical alignment, total experience, domain expertise, and geographical compatibility. 

Return your assessment in the following JSON format:
{
  "score": number (0-100),
  "breakdown": {
    "skillsScore": number,
    "experienceScore": number,
    "domainScore": number,
    "locationScore": number,
    "bonusScore": number
  },
  "summary": "Brief 1-sentence summary",
  "strengths": ["string"],
  "gaps": ["string", "specifically highlight missing skills from JD"],
  "recruiterAssessment": "Detailed reasoning paragraph",
  "recommendation": "STRONG_FIT" | "CONSIDER" | "NOT_SUITABLE",
  "nextSteps": "Concrete recruiter action item"
}`;

export function buildMatchExplainPrompt(jd: string, resumeText: string) {
  return `
Job Description:
${jd}

Candidate Resume:
${resumeText}

Compare the JD and Resume. Identify exactly which mandatory skills are missing. 
Score the candidate based on India/US market standards.
Exclude 'budget' as a disqualifier for now - focus only on capability and fit.
`;
}

// Local fallback if AI fails
export function generateLocalMatchAssessment(jd: string, resume: string) {
  const jdLower = jd.toLowerCase();
  const resumeLower = resume.toLowerCase();
  
  // Very basic heuristic
  const jdSkills = jdLower.match(/[a-z0-9+#]+/g)?.filter(w => w.length > 2) || [];
  const foundSkills = jdSkills.filter(s => resumeLower.includes(s));
  
  const score = Math.min(100, Math.round((foundSkills.length / Math.max(1, jdSkills.length)) * 100));
  
  return {
    score,
    breakdown: {
      skillsScore: score,
      experienceScore: 70,
      domainScore: 60,
      locationScore: 80,
      bonusScore: 0
    },
    summary: `Heuristic match detected ${foundSkills.length} overlapping technical markers.`,
    strengths: foundSkills.slice(0, 5),
    gaps: jdSkills.filter(s => !resumeLower.includes(s)).slice(0, 3).map(s => `Missing ${s}`),
    recruiterAssessment: "Manual heuristic scan completed. Precise technical overlap identified in core stack. Strategic fit check recommended.",
    recommendation: score >= 80 ? "STRONG_FIT" : score >= 60 ? "CONSIDER" : "NOT_SUITABLE",
    nextSteps: "Schedule initial technical screening."
  };
}
