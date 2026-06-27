import { db } from '../../../lib/firebase-admin.js';

export interface DecisionContext {
    tenantId: string;
    revenue: number; // Potential fee
    slaDaysRemaining: number; // Days to SLA deadline
    clientPriority: 'HIGH' | 'MEDIUM' | 'LOW';
    vendorPerformance: number; // 0.0 to 1.0 (historical placement rate)
    candidateQuality: number; // Match score 0 to 100
    historicalSuccessRate: number; // 0.0 to 1.0
    officeCapacity: number; // Current load %
    recruiterWorkload: number; // Number of active requirements they own
    vendorReliability: number; // 0.0 to 1.0
    clientResponsiveness: number; // Average reply hours (lower is better)
    candidateAvailability: 'IMMEDIATE' | 'TWO_WEEKS' | 'PASSIVE';
    estimatedExecutionCost: number; // API cost / recruiter hours cost
}

export interface OptimizationResult {
    highestValueAction: 'SUBMIT_TO_CLIENT' | 'SCHEDULE_INTERVIEW' | 'AUTO_REJECT' | 'BOOST_SOURCING' | 'MANUAL_TRIAGE';
    score: number; // Priority index
    justification: string;
    metrics: {
        revenuePotential: number;
        executionCost: number;
        urgencyMultiplier: number;
    };
}

/**
 * Shared decision-making logic across all Offices.
 */
export class DecisionEngine {
    async decideNextAction(context: DecisionContext): Promise<OptimizationResult> {
        console.log(`[Decision Engine v2] Evaluating optimization action for tenant: ${context.tenantId}`);

        // 1. Calculate Priority Index (Score) based on variables
        let score = 0;

        // A. Revenue potential weight (higher revenue -> higher score)
        const revenueWeight = Math.min(100, (context.revenue / 20000) * 100);
        score += revenueWeight * 0.25;

        // B. SLA Urgency weight (less days remaining -> more urgent)
        const slaMultiplier = context.slaDaysRemaining <= 2 ? 2.5 : context.slaDaysRemaining <= 7 ? 1.5 : 1.0;
        const slaScore = Math.max(0, (14 - context.slaDaysRemaining) * 7.1); // max 100
        score += slaScore * 0.15 * slaMultiplier;

        // C. Client responsiveness and priority
        const priorityBonus = context.clientPriority === 'HIGH' ? 30 : context.clientPriority === 'MEDIUM' ? 15 : 0;
        score += priorityBonus * 0.15;

        // D. Sourcing efficiency (Vendor Performance & Candidate Quality)
        const candidateScore = context.candidateQuality; // 0 to 100
        const performanceBonus = context.vendorPerformance * 50; // max 50
        score += (candidateScore * 0.7 + performanceBonus * 0.3) * 0.25;

        // E. Availability & Workload penalty
        const availabilityScore = context.candidateAvailability === 'IMMEDIATE' ? 20 : context.candidateAvailability === 'TWO_WEEKS' ? 10 : -10;
        const workloadPenalty = Math.min(30, context.recruiterWorkload * 3); // penalize if overloaded
        score += (availabilityScore - workloadPenalty) * 0.10;

        // F. Subtract execution cost ratio
        const costPenalty = Math.min(10, (context.estimatedExecutionCost / 500) * 10);
        score -= costPenalty;

        // Ensure score is bounded
        score = Math.round(Math.max(0, Math.min(100, score)));

        // 2. Map score to Next Optimal Action
        let highestValueAction: OptimizationResult['highestValueAction'] = 'MANUAL_TRIAGE';
        let justification = '';

        if (score >= 80) {
            highestValueAction = 'SUBMIT_TO_CLIENT';
            justification = `High-yield candidate match (${context.candidateQuality}%) with strong revenue potential ($${context.revenue}) and active client interest. Prompt submission recommended.`;
        } else if (score >= 60) {
            highestValueAction = 'SCHEDULE_INTERVIEW';
            justification = `Sufficient qualification threshold achieved. Schedule screening to maintain hiring velocity within SLA constraints (${context.slaDaysRemaining} days remaining).`;
        } else if (score >= 40) {
            highestValueAction = 'BOOST_SOURCING';
            justification = `Moderate candidate alignment. Capacity permits increasing sourcing efforts across trusted vendor networks to find stronger fits.`;
        } else if (score >= 20) {
            highestValueAction = 'MANUAL_TRIAGE';
            justification = `Complex parameters. Sourcing load (${context.recruiterWorkload} jobs) or candidate details require human recruiter bypass for validation.`;
        } else {
            highestValueAction = 'AUTO_REJECT';
            justification = `Candidate match criteria or availability did not satisfy target SLA / quality requirements. Auto-archiving to optimize resources.`;
        }

        const result: OptimizationResult = {
            highestValueAction,
            score,
            justification,
            metrics: {
                revenuePotential: context.revenue,
                executionCost: context.estimatedExecutionCost,
                urgencyMultiplier: slaMultiplier
            }
        };

        // Audit log the optimized decision
        await db.collection('decision_history').add({
            tenantId: context.tenantId,
            action: highestValueAction,
            score,
            justification,
            timestamp: new Date().toISOString()
        }).catch(err => console.error("Failed to log decision audit", err));

        return result;
    }

    // Keep backward-compatibility method
    async decideNextActionLegacy(legacyContext: any): Promise<string> {
        const result = await this.decideNextAction({
            tenantId: 'GLOBAL',
            revenue: legacyContext.revenue || 15000,
            slaDaysRemaining: legacyContext.sla || 7,
            clientPriority: (legacyContext.priority as any) || 'MEDIUM',
            vendorPerformance: 0.75,
            candidateQuality: legacyContext.confidence ? legacyContext.confidence * 100 : 80,
            historicalSuccessRate: 0.6,
            officeCapacity: 50,
            recruiterWorkload: 5,
            vendorReliability: 0.8,
            clientResponsiveness: 24,
            candidateAvailability: 'TWO_WEEKS',
            estimatedExecutionCost: 15
        });
        return result.highestValueAction === 'SUBMIT_TO_CLIENT' ? 'SUBMITTED' : 'REVIEW_REQUIRED';
    }
}
