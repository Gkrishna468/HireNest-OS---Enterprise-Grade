import { AISkill, SkillResult } from './types';
import { globalSkillRegistry } from '../orchestrator/SkillRegistry';

export interface VendorTrustInput {
  vendorId: string;
  historicalSubmissions: number;
  placementRate: number;
  slaViolations: number;
}

export interface VendorTrustOutput {
  trustScore: number;       // 0 - 100
  reliabilityTier: "A" | "B" | "C" | "F";
  riskFlag: boolean;
  reasoning: string;
}

export class VendorTrustSkill implements AISkill<VendorTrustInput, VendorTrustOutput> {
  id = 'skill.vendor.trust';
  name = 'Vendor Trust & Reliability Engine';
  description = 'Analyzes historical submission quality to dynamically map vendor authority and capability.';
  version = '1.0.0';

  async execute(input: VendorTrustInput, context?: any): Promise<SkillResult<VendorTrustOutput>> {
    const score = Math.max(0, 100 - (input.slaViolations * 10) + (input.placementRate * 20));
    
    return {
      success: true,
      data: {
        trustScore: score,
        reliabilityTier: score > 80 ? "A" : score > 60 ? "B" : score > 40 ? "C" : "F",
        riskFlag: score < 40,
        reasoning: `Calculated baseline metrics across ${input.historicalSubmissions} historical events.`
      }
    };
  }
}

globalSkillRegistry.register(new VendorTrustSkill());
