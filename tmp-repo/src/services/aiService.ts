// src/services/aiService.ts
// This file now acts as a proxy to the server-side AI endpoints to keep keys secure.

export interface CandidateMatchResult {
  matchScore: number;
  breakdown?: {
    skillsScore: number;
    experienceScore: number;
    domainScore: number;
    locationScore: number;
    bonusScore: number;
    totalScore: number;
  };
  summary: string;
  strengths: string[];
  gaps: string[];
  missingSkills?: string[];
  recruiterAssessment?: string;
  recommendation?: 'STRONG_FIT' | 'CONSIDER' | 'NOT_SUITABLE';
  nextSteps?: string;
  outreachDrafts: {
    founder: string;
    professional: string;
    executive: string;
    warm: string;
  };
}

export async function analyzeCandidateMatch(jd: string, candidateProfile: string): Promise<CandidateMatchResult> {
  try {
    const response = await fetch("/api/match-candidates-detailed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jd, candidateProfile }),
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("AI Analysis proxy failed:", error);
    return {
      matchScore: 0,
      summary: "AI Analysis currently unavailable. Please check your server connection and GEMINI_API_KEY.",
      strengths: [],
      gaps: [],
      outreachDrafts: { founder: "", professional: "", executive: "", warm: "" }
    };
  }
}

export async function parseBulkResumes(resumeTexts: string[]): Promise<any[]> {
  try {
    const response = await fetch("/api/bulk-parse-resumes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeTexts }),
    });

    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    return await response.json();
  } catch (e) {
    console.error("Bulk parse proxy failed:", e);
    return [];
  }
}
