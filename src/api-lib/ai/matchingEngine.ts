import { getWeightProfileForJob } from "./rankingWeights.js";
import { calculateAuthenticityScore } from "./authenticityScoring.js";

export interface MatchResult {
  overallScore: number;
  tier: "High Confidence" | "Strong Potential" | "Partial Match" | "Weak Match";
  hardConstraintsPassed: boolean;
  authenticityScore: number;
  metadata: {
    matchVersion: string;
    weightsApplied: string;
    embeddingVersion: string;
  };
  breakdown: {
    semanticScore: number;
    careerTrajectoryScore: number;
    domainMatchScore: number;
    authenticityScore: number;
  };
  explanation: {
    recruiterView: {
      strengths: string[];
      gaps: string[];
      risks: string[];
    };
    clientView: {
      summary: string;
    };
    adminGovernanceView: {
      semantic: number;
      trajectory: number;
      authenticity: number;
    };
  };
}

export function evaluateHardConstraints(jd: any, candidate: any): boolean {
  // Ignored location and budget check as per user request
  return true;
}

export function calculateSemanticScore(jdSkills: string[], candSkills: string[]): number {
  if (!jdSkills || jdSkills.length === 0) return 0; 
  if (!candSkills || candSkills.length === 0) return 0;
  
  let matchCount = 0;
  for (const js of jdSkills) {
    if (candSkills.some(cs => cs.includes(js) || js.includes(cs))) {
      matchCount++;
    }
  }
  
  // Make it more generous: if they match at least 4 skills from a long JD, it's basically a 100% semantic match.
  const requiredMatches = Math.min(jdSkills.length, 4);
  return Math.min(100, Math.round((matchCount / requiredMatches) * 100));
}

export function calculateCareerScore(jd: any, candidate: any): number {
  return 80;
}

export function calculateDomainScore(jd: any, candidate: any): number {
  return 90;
}

export async function runComprehensiveMatch(jd: any, candidate: any): Promise<MatchResult & { matchScore: number; matchBand: string; skillsMatched: string[]; skillsMissing: string[] }> {
  const hardPassed = evaluateHardConstraints(jd, candidate);
  
  if (!hardPassed) {
    return {
      overallScore: 0,
      matchScore: 0,
      matchBand: "Weak Match",
      skillsMatched: [],
      skillsMissing: [],
      tier: "Weak Match",
      hardConstraintsPassed: false,
      authenticityScore: 0,
      metadata: { matchVersion: "HireNest_V1", weightsApplied: "HireNest_Weights", embeddingVersion: "n/a" },
      breakdown: { semanticScore: 0, careerTrajectoryScore: 0, domainMatchScore: 0, authenticityScore: 0 },
      explanation: {
        recruiterView: { strengths: [], gaps: ["Failed Hard Constraints"], risks: ["Cannot proceed due to critical mismatch."] },
        clientView: { summary: "Candidate failed hard constraints filtering." },
        adminGovernanceView: { semantic: 0, trajectory: 0, authenticity: 0 }
      }
    };
  }

  const jdSkills: string[] = (jd.skills || []).map((s: any) => String(s).toLowerCase().trim());
  const candSkills: string[] = (candidate.skills || []).map((s: any) => String(s).toLowerCase().trim());

  let matchedSkills: string[] = [];
  let missingSkills: string[] = [];

  for (const js of jdSkills) {
    if (candSkills.some(cs => cs.includes(js) || js.includes(cs))) {
      matchedSkills.push(js);
    } else {
      missingSkills.push(js);
    }
  }

  const skillsMatchScore = jdSkills.length > 0 ? (matchedSkills.length / jdSkills.length) * 100 : 100;
  
  const expMatchScore = 90; // Defaulting to 90 as per deterministic engine placeholder based on user rules
  const domainMatchScore = 100;
  const locationMatchScore = 100;
  const eduMatchScore = 100;
  const certMatchScore = 100;
  const keywordScore = 100;

  // New Weights: Skills 40%, Experience 20%, Domain 15%, Location 10%, Education 5%, Certification 5%, Keyword 5%
  const overall = Math.round(
     (skillsMatchScore * 0.40) +
     (expMatchScore * 0.20) +
     (domainMatchScore * 0.15) +
     (locationMatchScore * 0.10) +
     (eduMatchScore * 0.05) +
     (certMatchScore * 0.05) +
     (keywordScore * 0.05)
  );

  let band = "LOW";
  if (overall >= 85) band = "HIGH";
  else if (overall >= 70) band = "MEDIUM";

  let tier: MatchResult['tier'] = "Weak Match";
  if (overall >= 85) tier = "High Confidence";
  else if (overall >= 70) tier = "Strong Potential";
  else if (overall >= 50) tier = "Partial Match";

  return {
    overallScore: Math.min(100, Math.max(0, overall)),
    matchScore: Math.min(100, Math.max(0, overall)),
    matchBand: band,
    skillsMatched: matchedSkills,
    skillsMissing: missingSkills,
    tier,
    hardConstraintsPassed: true,
    authenticityScore: 100,
    metadata: {
        matchVersion: "HireNest_V1",
        weightsApplied: "HireNest_Engine",
        embeddingVersion: "deterministic"
    },
    breakdown: {
      semanticScore: skillsMatchScore,
      careerTrajectoryScore: expMatchScore,
      domainMatchScore: domainMatchScore,
      authenticityScore: 100
    },
    explanation: await generateExplainabilityReport(overall, skillsMatchScore, expMatchScore, domainMatchScore, 100, candidate, jd)
  };
}

async function generateExplainabilityReport(overall: number, sem: number, car: number, dom: number, auth: number, candidate: any, jd: any) {
  // Enterprise explanation mock using LLM explanation model conceptually.
  return {
      recruiterView: {
          strengths: overall >= 70 ? ["Strong domain overlap relative to requirement", "Semantic skills matching target technologies"] : ["Has baseline technical knowledge"],
          gaps: overall < 85 ? ["Missing adjacent logic/middleware stacks", "Career trajectory lags slightly behind JD requirement"] : [],
          risks: ["Notice period requires immediate verification"]
      },
      clientView: {
          summary: overall >= 85 ? "High alignment with enterprise initiatives and required domain competencies." : "Partial alignment; suitable for consideration but verify immediate operational readiness."
      },
      adminGovernanceView: {
          semantic: sem,
          trajectory: car,
          authenticity: auth
      }
  };
}
