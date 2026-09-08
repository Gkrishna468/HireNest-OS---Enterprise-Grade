import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Single Source of Truth candidate fitment score utility.
 * Normalizes and derives candidate fitment / match score across all data model structures,
 * ensuring consistency between Candidate Preview, Candidate 360, and backend payloads.
 */
export function getCandidateFitmentScore(candidate: any): number {
  if (!candidate || typeof candidate !== "object") return 0;

  // 1. Direct score properties priority chain
  const candidateScores = [
    candidate.matchScore,
    candidate.fitmentScore,
    candidate.fitScore,
    candidate.aiScore,
    candidate.overallScore,
    candidate.score,
    candidate.matchData?.matchScore,
    candidate.matchData?.fitmentScore,
    candidate.matchData?.score,
    candidate.aiIntelligence?.fitmentScore,
    candidate.aiIntelligence?.matchScore,
    candidate.aiIntelligence?.fitScore,
    candidate.aiIntelligence?.overallScore,
    candidate.aiIntelligence?.breakdown?.totalScore,
    candidate.aiAnalysis?.fitScore,
    candidate.aiAnalysis?.matchScore,
  ];

  for (const val of candidateScores) {
    if (typeof val === "number" && !isNaN(val) && val > 0) {
      return Math.min(100, Math.max(0, Math.round(val)));
    }
    if (typeof val === "string" && val.trim() !== "") {
      const num = parseFloat(val);
      if (!isNaN(num) && num > 0) {
        return Math.min(100, Math.max(0, Math.round(num)));
      }
    }
  }

  // 2. Fallback: Skill density calculation for parsed active candidates
  const skills = Array.isArray(candidate.skills)
    ? candidate.skills
    : typeof candidate.skills === "string"
    ? candidate.skills.split(",").filter(Boolean)
    : Array.isArray(candidate.keySkills)
    ? candidate.keySkills
    : typeof candidate.keySkills === "string"
    ? candidate.keySkills.split(",").filter(Boolean)
    : [];

  if (skills.length > 0) {
    const expNum = typeof candidate.experience === "number" 
      ? candidate.experience 
      : parseFloat(String(candidate.experience || candidate.totalExperience || 0)) || 3;
    const baseSkillScore = Math.min(92, 70 + skills.length * 3 + Math.min(10, Math.round(expNum)));
    return baseSkillScore;
  }

  if (candidate.distillationStatus === "COMPLETED" || candidate.status === "COMPLETED" || candidate.status === "MATCHED") {
    return 80;
  }

  return 0;
}
