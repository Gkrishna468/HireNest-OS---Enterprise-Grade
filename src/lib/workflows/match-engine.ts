/**
 * FIX for QA-4022 Requirement Match Accuracy
 * Shifts matching model away from pure embeddings to a Domain-weighted heuristic scale.
 */
export function calculateMatchScore(candidate: Record<string, any>, requirement: Record<string, any>) {
  // 1. Strict Domain Gate (Cyber Security != SAP FICO)
  // If domains form absolute hard bounds, abort early out
  if (candidate.domain && requirement.domain && candidate.domain !== requirement.domain) {
    return 0; // Immediate rejection for domain drift
  }

  const DOMAIN_WEIGHT = 0.40;
  const SKILL_WEIGHT = 0.30;
  const EXP_WEIGHT = 0.20;
  const VECTOR_WEIGHT = 0.10;

  // Since it passed the strict gate, max out domain score contribution
  const domainScore = 100 * DOMAIN_WEIGHT;

  // Compare skill arrays securely
  const skillScore = calculateSkillOverlap(candidate.skills, requirement.skills) * SKILL_WEIGHT;
  
  // Experience years band matching
  const expScore = calculateExperienceOverlap(candidate.experienceYears, requirement.requiredYears) * EXP_WEIGHT;
  
  // Retrieve vector dot-product similarity previously generated
  const embeddingScore = (candidate.embeddingScore || 0) * VECTOR_WEIGHT;

  return domainScore + skillScore + expScore + embeddingScore;
}

function calculateSkillOverlap(cand: string[] = [], req: string[] = []) {
  if (!req.length) return 100; // if req has no specific skills required
  if (!cand.length) return 0;
  const match = cand.filter(c => req.includes(c));
  return (match.length / req.length) * 100;
}

function calculateExperienceOverlap(candYears: number = 0, reqYears: number = 0) {
  if (candYears >= reqYears) return 100;
  if (reqYears === 0) return 100;
  return (candYears / reqYears) * 100;
}
