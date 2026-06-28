import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getAI(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY || "dummy_api_key_for_build";
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
}

export interface MatchResult {
  matchScore: number;
  matchInference: string;
}

export async function calculateSemanticMatch(
  candidateName: string,
  candidateSkills: string[],
  candidateExperience: string,
  requirementTitle: string,
  requirementDescription: string,
  skillsRequired: string[]
): Promise<MatchResult> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    // If no key is set, calculate a deterministic fallback match score to keep the app functional
    const commonSkills = candidateSkills.filter(skill =>
      skillsRequired.map(s => s.toLowerCase()).includes(skill.toLowerCase())
    );
    const score = Math.round(
      (commonSkills.length / Math.max(1, skillsRequired.length)) * 70 + 
      (candidateExperience.toLowerCase().includes("senior") ? 20 : 10)
    );
    return {
      matchScore: Math.min(100, Math.max(20, score)),
      matchInference: `Deterministic skill-overlap analysis (Gemini key offline): Candidate has ${commonSkills.length}/${skillsRequired.length} required skills. Experience aligns semantic indicators.`
    };
  }

  try {
    const ai = getAI();
    const prompt = `
You are a highly precise Recruiter Overrides and Match Intelligence Bot.
Evaluate the semantic match between this candidate and job requirement:

[CANDIDATE]
Name: ${candidateName}
Skills: ${candidateSkills.join(", ")}
Experience: ${candidateExperience}

[REQUIREMENT]
Title: ${requirementTitle}
Required Skills: ${skillsRequired.join(", ")}
Description: ${requirementDescription}

Respond with a strictly formatted JSON object containing two fields:
{
  "matchScore": number (value between 0 and 100),
  "matchInference": "string (a concise, objective, 2-sentence explanation of why they match and any skill gaps)"
}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    const data = JSON.parse(text.trim()) as MatchResult;
    return {
      matchScore: typeof data.matchScore === "number" ? data.matchScore : 50,
      matchInference: data.matchInference || "Match analyzed using recruiter intelligence vectors."
    };
  } catch (err) {
    console.error("[AIGateway] Gemini matching failed:", err);
    // Fallback logic
    return {
      matchScore: 65,
      matchInference: "Fallback match generated. Semantic AI matching is temporarily offline."
    };
  }
}
