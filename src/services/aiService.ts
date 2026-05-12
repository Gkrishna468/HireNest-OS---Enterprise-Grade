import { GoogleGenAI, Type } from "@google/genai";

// Standard Vite environment doesn't have process.env, but this platform injects it.
// We use a safe accessor to prevent crashes if it's missing in some contexts.
const getApiKey = () => {
  try {
    return process.env.GEMINI_API_KEY || "";
  } catch {
    return "";
  }
};

const ai = new GoogleGenAI({ apiKey: getApiKey() });

export interface CandidateMatchResult {
  matchScore: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  outreachDrafts: {
    founder: string;
    professional: string;
    executive: string;
    warm: string;
  };
}

export async function analyzeCandidateMatch(jd: string, candidateProfile: string): Promise<CandidateMatchResult> {
  const prompt = `
    Analyze the match between this Job Description and Candidate Profile.
    
    JOB DESCRIPTION:
    ${jd}
    
    CANDIDATE PROFILE:
    ${candidateProfile}
    
    Provide the analysis in JSON format including:
    - matchScore (0-100)
    - summary (high-level assessment)
    - strengths (list of key matching skills/exp)
    - gaps (list of missing or weak areas)
    - outreachDrafts (4 drafts in different tones: founder, professional, executive, warm)
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: { type: Type.NUMBER },
            summary: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            gaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            outreachDrafts: {
              type: Type.OBJECT,
              properties: {
                founder: { type: Type.STRING },
                professional: { type: Type.STRING },
                executive: { type: Type.STRING },
                warm: { type: Type.STRING }
              },
              required: ["founder", "professional", "executive", "warm"]
            }
          },
          required: ["matchScore", "summary", "strengths", "gaps", "outreachDrafts"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      matchScore: 0,
      summary: "Matching failed due to intelligence layer timeout or connection error.",
      strengths: [],
      gaps: [],
      outreachDrafts: { founder: "", professional: "", executive: "", warm: "" }
    };
  }
}

export async function parseBulkResumes(resumeTexts: string[]): Promise<any[]> {
  const prompt = `Parse these ${resumeTexts.length} resumes into basic profile objects. Each object should have name, email, skills (list), and topExperience. Respond with JSON array.`;
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              email: { type: Type.STRING },
              skills: { type: Type.ARRAY, items: { type: Type.STRING } },
              topExperience: { type: Type.STRING }
            }
          }
        }
      }
    });
    const text = response.text;
    return text ? JSON.parse(text) : [];
  } catch (e) {
    console.error("Bulk parse error:", e);
    return [];
  }
}
