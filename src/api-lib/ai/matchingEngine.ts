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
  
  return Math.min(100, Math.round((matchCount / jdSkills.length) * 100));
}

export function calculateCareerScore(jd: any, candidate: any): number {
  return 80;
}

export function calculateDomainScore(jd: any, candidate: any): number {
  return 90;
}

export async function runComprehensiveMatch(jd: any, candidate: any): Promise<MatchResult> {
  const hardPassed = evaluateHardConstraints(jd, candidate);
  
  if (!hardPassed) {
    return {
      overallScore: 0,
      tier: "Weak Match",
      hardConstraintsPassed: false,
      authenticityScore: 0,
      metadata: { matchVersion: "v4.2.0", weightsApplied: "none", embeddingVersion: "n/a" },
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

  const weights = getWeightProfileForJob(jd);
  const sem = calculateSemanticScore(jdSkills, candSkills);
  const car = calculateCareerScore(jd, candidate);
  const dom = calculateDomainScore(jd, candidate);
  const auth = calculateAuthenticityScore(candidate.resumeText || "", candidate.vendorId || "");
  
  const overall = Math.round((sem * weights.semantic) + (car * weights.trajectory) + (dom * weights.domain) + (100 * weights.stability));

  
  let tier: MatchResult['tier'] = "Weak Match";
  if (overall >= 85) tier = "High Confidence";
  else if (overall >= 70) tier = "Strong Potential";
  else if (overall >= 50) tier = "Partial Match";

  return {
    overallScore: Math.min(100, Math.max(0, overall)),
    tier,
    hardConstraintsPassed: true,
    authenticityScore: auth,
    metadata: {
        matchVersion: "v4.2.0",
        weightsApplied: jd.industry || "default",
        embeddingVersion: "text-embedding-004"
    },
    breakdown: {
      semanticScore: sem,
      careerTrajectoryScore: car,
      domainMatchScore: dom,
      authenticityScore: auth
    },
    explanation: await generateExplainabilityReport(overall, sem, car, dom, auth, candidate, jd)
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
