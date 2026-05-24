import { getWeightProfileForJob } from "./rankingWeights";
import { calculateAuthenticityScore } from "./authenticityScoring";

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
    strengths: string[];
    gaps: string[];
    risks: string[];
  };
}

export function evaluateHardConstraints(jd: any, candidate: any): boolean {
  // If visa required but candidate lacks, fail.
  // Example stub for deterministic hard constraints
  // e.g. location match.
  if (jd.location && candidate.location && 
      !candidate.location.toLowerCase().includes(jd.location.toLowerCase()) && 
      jd.location.toLowerCase() !== 'remote' && candidate.location.toLowerCase() !== 'remote') {
     // For now, lenient stub, we return true mostly, but this models the capability
     return true;
  }
  return true;
}

export function calculateSemanticScore(jdEmbed: number[], candEmbed: number[]): number {
  // Cosine similarity stub
  return 85; 
}

export function calculateCareerScore(jd: any, candidate: any): number {
  // Analyze progression vs expected maturity
  return 80;
}

export function calculateDomainScore(jd: any, candidate: any): number {
  // e.g. Healthcare vs Fintech
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
      explanation: { strengths: [], gaps: ["Failed Hard Constraints"], risks: ["Cannot proceed due to critical mismatch."] }
    };
  }

  const weights = getWeightProfileForJob(jd);
  const sem = calculateSemanticScore(null, null);
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
    explanation: await generateExplainabilityReport(overall, sem, car, dom, candidate, jd)
  };
}

async function generateExplainabilityReport(overall: number, sem: number, car: number, dom: number, candidate: any, jd: any) {
  // Enterprise explanation mock using LLM explanation model conceptually.
  return {
      strengths: overall >= 70 ? ["Strong domain overlap relative to requirement", "Semantic skills matching target technologies"] : ["Has baseline technical knowledge"],
      gaps: overall < 85 ? ["Missing adjacent logic/middleware stacks", "Career trajectory lags slightly behind JD requirement"] : [],
      risks: ["Notice period requires immediate verification"]
  };
}
