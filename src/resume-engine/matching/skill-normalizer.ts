/**
 * HireNestOS Skill Normalizer & Synonym Resolution
 */

import { normalizeSkillName, CONTROLLED_SKILL_TAXONOMY } from "../parser/skills.js";

export class SkillNormalizer {
  public static normalize(skill: string): string {
    return normalizeSkillName(skill);
  }

  public static normalizeList(skills: string[]): string[] {
    if (!skills || !Array.isArray(skills)) return [];
    const normalized = skills
      .map(s => String(s).trim())
      .filter(s => s.length > 0)
      .map(s => this.normalize(s));

    // Deduplicate
    return Array.from(new Set(normalized));
  }

  /**
   * Compares two skills for semantic equality using taxonomy aliases and acronym mappings.
   */
  public static areSkillsEquivalent(skillA: string, skillB: string): boolean {
    if (!skillA || !skillB) return false;
    const cleanA = skillA.trim().toLowerCase();
    const cleanB = skillB.trim().toLowerCase();
    if (cleanA === cleanB) return true;

    const normA = this.normalize(skillA).toLowerCase();
    const normB = this.normalize(skillB).toLowerCase();
    if (normA === normB) return true;

    // Direct substring or inclusion
    if (normA.includes(normB) || normB.includes(normA)) return true;
    if (cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;

    // Synonym & Acronym dictionary pairs
    const synonyms: [string, string][] = [
      ["microsoft fabric", "fabric"],
      ["microsoft fabric", "fabric platform"],
      ["microsoft fabric", "fabric data engineering"],
      ["azure data factory", "adf"],
      ["azure synapse", "synapse"],
      ["apache spark", "spark"],
      ["pyspark", "spark"],
      ["power bi", "powerbi"],
      ["c++", "cpp"],
      ["c++", "c/c++"],
      ["c#", "csharp"],
      [".net core", ".net"],
      [".net core", "dotnet"],
      ["data warehouse", "warehouse"],
      ["data lakehouse", "lakehouse"],
      ["data pipelines", "pipeline"],
      ["data pipelines", "pipelines"],
      ["direct lake", "direct lake mode"],
      ["fabric capacity management", "cu optimization"],
      ["fabric capacity management", "capacity management"],
    ];

    for (const [syn1, syn2] of synonyms) {
      if (
        (normA.includes(syn1) && normB.includes(syn2)) ||
        (normA.includes(syn2) && normB.includes(syn1)) ||
        (cleanA.includes(syn1) && cleanB.includes(syn2)) ||
        (cleanA.includes(syn2) && cleanB.includes(syn1))
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculates deterministic overlap between candidate skills and requirement skills.
   */
  public static calculateSkillOverlap(
    candidateSkills: string[],
    requiredSkills: string[]
  ): {
    matched: string[];
    missing: string[];
    overlapRatio: number;
  } {
    const candNorm = this.normalizeList(candidateSkills);
    const reqNorm = this.normalizeList(requiredSkills);

    if (reqNorm.length === 0) {
      return { matched: candNorm, missing: [], overlapRatio: 1.0 };
    }

    const matched: string[] = [];
    const missing: string[] = [];

    for (const reqSkill of reqNorm) {
      const isPresent = candNorm.some(cs => this.areSkillsEquivalent(cs, reqSkill));
      if (isPresent) {
        matched.push(reqSkill);
      } else {
        missing.push(reqSkill);
      }
    }

    const overlapRatio = matched.length / reqNorm.length;
    return { matched, missing, overlapRatio };
  }
}
