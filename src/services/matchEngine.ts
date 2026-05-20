import { db } from "../lib/firebase";
import { 
  collection, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";

/**
 * HireNestOS Enterprise Match Engine
 * Implements the Universal Match Formula with Dynamic Weighting.
 */

export enum EmploymentType {
  CONTRACT = "CONTRACT",
  C2H = "C2H",
  PERMANENT = "PERMANENT"
}

export enum CompensationModel {
  LPM = "LPM", // Lakhs Per Month
  LPA = "LPA"  // Lakhs Per Annum
}

export enum WorkMode {
  REMOTE = "REMOTE",
  ONSITE = "ONSITE",
  HYBRID = "HYBRID"
}

export interface MatchProfile {
  skills: string[];
  domain: string;
  experience: number;
  location: string;
  budget: number;
  employmentType: EmploymentType;
  compensationModel: CompensationModel;
  workMode: WorkMode;
}

export interface VendorTrust {
  trustScore: number;
  deliveryHistory: number; // 0-100 score
  specializations: string[];
}

export class MatchEngine {
  /**
   * Calculates the universal match score for a candidate against a JD.
   */
  static calculateUniversalScore(
    jd: MatchProfile, 
    candidate: MatchProfile, 
    vendor: VendorTrust,
    communicationScore: number = 85 // Default high-confidence score
  ) {
    // 1. Core Weights (Base)
    let weights = {
      skill: 0.35,
      domain: 0.20,
      experience: 0.15,
      trust: 0.10,
      location: 0.05,
      budget: 0.05,
      communication: 0.05,
      delivery: 0.05
    };

    // 2. Dynamic Weighting Adjustment
    if (jd.workMode === WorkMode.REMOTE && jd.employmentType === EmploymentType.CONTRACT) {
      // Remote Contract: Skills and Trust dominate. Location/Budget are fluid.
      weights.skill = 0.40;
      weights.location = 0;
      weights.budget = 0.05; // Still keep some budget consideration
      weights.trust = 0.15;
    } else if (jd.employmentType === EmploymentType.PERMANENT) {
      // Permanent: Location and Domain matter more for retention.
      weights.location = 0.10;
      weights.domain = 0.25;
    }

    // 3. Score Components (0-100)
    
    // Skill Match (Intersection / Total Skills)
    const matchedSkills = jd.skills.filter(s => candidate.skills.includes(s));
    const skillScore = (matchedSkills.length / jd.skills.length) * 100;

    // Domain Match
    const domainScore = jd.domain.toLowerCase() === candidate.domain.toLowerCase() ? 100 : 40;

    // Experience Match (Closeness to target)
    const expDiff = Math.abs(jd.experience - candidate.experience);
    const expScore = Math.max(0, 100 - (expDiff * 10));

    // Trust Score
    const trustScore = vendor.trustScore;

    // Location Match
    let locationScore = 0;
    if (jd.workMode === WorkMode.REMOTE) {
      locationScore = 100;
    } else {
      locationScore = jd.location.toLowerCase() === candidate.location.toLowerCase() ? 100 : 20;
    }

    // Budget Match
    const budgetDiff = candidate.budget - jd.budget;
    let budgetScore = 0;
    if (budgetDiff <= 0) {
      budgetScore = 100; // Under or at budget
    } else {
      budgetScore = Math.max(0, 100 - (budgetDiff / jd.budget * 200)); // Sharp drop off
    }

    // Delivery History
    const deliveryScore = vendor.deliveryHistory;

    // 4. Final Aggregation
    const finalScore = (
      (skillScore * weights.skill) +
      (domainScore * weights.domain) +
      (expScore * weights.experience) +
      (trustScore * weights.trust) +
      (locationScore * weights.location) +
      (budgetScore * weights.budget) +
      (communicationScore * weights.communication) +
      (deliveryScore * weights.delivery)
    );

    return {
      finalScore: Math.round(finalScore),
      breakdown: {
        skill: Math.round(skillScore),
        domain: Math.round(domainScore),
        experience: Math.round(expScore),
        trust: Math.round(trustScore),
        location: Math.round(locationScore),
        budget: Math.round(budgetScore)
      },
      weightsApplied: weights,
      timestamp: Date.now()
    };
  }

  static async logMatch(requirementId: string, candidateId: string, matchResult: any) {
    try {
      await addDoc(collection(db, "execution_events"), {
        eventType: "AI_MATCH_COMPLETED",
        targetId: requirementId,
        targetType: "requirement",
        actorId: "match-engine-v1",
        actorType: "system",
        timestamp: Date.now(),
        metadata: {
          candidateId,
          score: matchResult.finalScore,
          confidence: "HIGH"
        }
      });
    } catch (e) {
      console.warn("[MATCH_LOG] Failed:", e);
    }
  }
}
