import { HireNestAccessContext, enforceCoreAccess } from "../../types.js";
import { RequirementService, RequirementEntity } from "../../services/RequirementService.js";
import { Candidate360Service, CandidateEntity } from "../../services/Candidate360Service.js";
import { SubmissionService } from "../../services/SubmissionService.js";
import { AIRecommendation, AIOutputMeta } from "../types.js";

export interface MatchScoreBreakdown {
  overallScore: number; // 0 - 100
  layer1DeterministicScore: number; // Skills, notice, rate card
  layer2SemanticScore: number; // Experience alignment, role context
  layer3RecruiterAdjustment: number; // Manual override adjustment
  matchedSkills: string[];
  missingSkills: string[];
  reasoning: string[];
}

export interface CandidateMatchRecommendation {
  candidateId: string;
  candidateName: string;
  requirementId: string;
  requirementTitle: string;
  vendorId?: string;
  matchBreakdown: MatchScoreBreakdown;
  suggestedAction: "SUBMIT_TO_CLIENT" | "FAST_TRACK_INTERVIEW" | "HOLD";
}

export class CandidateMatchingService {
  /**
   * Evaluates match between Candidate and Requisition using 3-Layer matching
   */
  static async evaluateMatch(
    ctx: HireNestAccessContext,
    candidateId: string,
    requirementId: string,
    recruiterAdjustment: number = 0
  ): Promise<AIRecommendation<CandidateMatchRecommendation>> {
    enforceCoreAccess(ctx, "requirements.read");
    enforceCoreAccess(ctx, "candidate360.read");

    const req = await RequirementService.getRequirement(ctx, requirementId);
    const cand = await Candidate360Service.getCandidate360(ctx, candidateId);

    // Layer 1: Deterministic Skill and Attribute Intersection
    const reqSkillsLower = req.skills.map((s) => s.toLowerCase());
    const matchedSkills = cand.primarySkills.filter((s) => reqSkillsLower.includes(s.toLowerCase()));
    const missingSkills = req.skills.filter((s) => !cand.primarySkills.map((c) => c.toLowerCase()).includes(s.toLowerCase()));

    const skillRatio = req.skills.length > 0 ? matchedSkills.length / req.skills.length : 0.8;
    const layer1DeterministicScore = Math.round(skillRatio * 60 + (cand.noticePeriodDays && cand.noticePeriodDays <= 30 ? 20 : 10) + 15);

    // Layer 2: Semantic Experience Assessment
    const layer2SemanticScore = Math.min(95, Math.max(60, 75 + ((cand.totalExperienceYears || 0) > 4 ? 15 : 0)));

    // Combined Weighted Base Score
    const baseScore = Math.round(layer1DeterministicScore * 0.5 + layer2SemanticScore * 0.5);

    // Layer 3: Recruiter Override (Clamped -30 to +30)
    const clampedAdjustment = Math.max(-30, Math.min(30, recruiterAdjustment));
    const overallScore = Math.max(0, Math.min(100, baseScore + clampedAdjustment));

    const recData: CandidateMatchRecommendation = {
      candidateId: cand.id,
      candidateName: cand.fullName,
      requirementId: req.id,
      requirementTitle: req.title,
      vendorId: cand.ownershipVendorId,
      matchBreakdown: {
        overallScore,
        layer1DeterministicScore,
        layer2SemanticScore,
        layer3RecruiterAdjustment: clampedAdjustment,
        matchedSkills,
        missingSkills,
        reasoning: [
          `Layer 1 Deterministic: Matched ${matchedSkills.length} of ${req.skills.length} required skills.`,
          `Layer 2 Semantic: Experience profile evaluated with ${cand.totalExperienceYears || 0} years domain depth.`,
          `Layer 3 Override: Applied ${clampedAdjustment >= 0 ? "+" : ""}${clampedAdjustment} recruiter judgment adjustment.`
        ],
      },
      suggestedAction: overallScore >= 80 ? "SUBMIT_TO_CLIENT" : overallScore >= 65 ? "FAST_TRACK_INTERVIEW" : "HOLD",
    };

    const meta: AIOutputMeta = {
      kind: "RECOMMEND",
      model: "hirenest-match-engine-v3",
      confidenceScore: 0.93,
      reasoning: recData.matchBreakdown.reasoning,
      generatedAt: new Date().toISOString(),
      requiresHumanApproval: true,
    };

    return {
      meta,
      targetEntityType: "Candidate",
      targetEntityId: cand.id,
      recommendation: recData,
      actionablePayload: {
        requirementId: req.id,
        candidateId: cand.id,
        candidateName: cand.fullName,
        aiMatchScore: overallScore,
      },
      approvalStatus: "PENDING_REVIEW",
    };
  }

  /**
   * Approves recommendation and triggers Core SubmissionService
   */
  static async approveAndSubmit(
    ctx: HireNestAccessContext,
    recommendation: AIRecommendation<CandidateMatchRecommendation>
  ): Promise<any> {
    enforceCoreAccess(ctx, "submissions.create");

    return await SubmissionService.createSubmission(ctx, {
      requirementId: recommendation.actionablePayload.requirementId,
      candidateId: recommendation.actionablePayload.candidateId,
      candidateName: recommendation.actionablePayload.candidateName,
      aiMatchScore: recommendation.actionablePayload.aiMatchScore,
    });
  }

  static async calculateMatch(
    ctx: HireNestAccessContext,
    candidateId: string,
    requirementId: string
  ): Promise<{ candidateId: string; requirementId: string; overallScore: number; meta: AIOutputMeta }> {
    const res = await CandidateMatchingService.evaluateMatch(ctx, candidateId, requirementId);
    return {
      candidateId,
      requirementId,
      overallScore: res.recommendation.matchBreakdown.overallScore,
      meta: { ...res.meta, kind: "SCORE" },
    };
  }
}
