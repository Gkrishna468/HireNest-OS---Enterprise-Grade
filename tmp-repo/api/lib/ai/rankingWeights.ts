export interface MatchWeightProfile {
  domain: number;
  semantic: number;
  trajectory: number;
  stability: number;
  noticePeriod: number;
}

export const MATCH_WEIGHT_PROFILES: Record<string, MatchWeightProfile> = {
  "enterprise_healthcare": { domain: 0.35, semantic: 0.25, trajectory: 0.20, stability: 0.10, noticePeriod: 0.10 },
  "high_growth_startup": { domain: 0.10, semantic: 0.40, trajectory: 0.10, stability: 0.10, noticePeriod: 0.30 },
  "default": { domain: 0.20, semantic: 0.40, trajectory: 0.20, stability: 0.10, noticePeriod: 0.10 }
};

export function getWeightProfileForJob(jd: any): MatchWeightProfile {
  const industry = jd.industry?.toLowerCase() || jd.domain?.toLowerCase() || "default";
  if (industry.includes("health")) return MATCH_WEIGHT_PROFILES["enterprise_healthcare"];
  if (industry.includes("startup")) return MATCH_WEIGHT_PROFILES["high_growth_startup"];
  return MATCH_WEIGHT_PROFILES["default"];
}
