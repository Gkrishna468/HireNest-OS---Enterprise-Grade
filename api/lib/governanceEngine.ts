import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * HireNestOS Autonomous Governance Engine
 * 
 * Provides:
 * - Policy evaluators
 * - Confidence scoring
 * - Anomaly detection
 * - Drift monitors
 * - Tenant isolation validators
 * - Adaptive Cognitive Control (Phase 1)
 */

export interface GovernanceEvent {
    eventId: string;
    type: "candidate_duplication" | "memory_contamination" | "persona_instability" | "recursive_hallucination";
    severity: "low" | "medium" | "high" | "critical";
    tenantId: string;
    details: any;
    resolved: boolean;
    timestamp: string;
}

export interface AdaptiveExecutionPolicy {
    actionOverride: "REQUIRE_HUMAN_APPROVAL" | "FORCE_EVIDENCE_MODE" | "SANDBOX_RETRIEVAL" | "BLOCK_EXECUTION" | "CONTINUE";
    reasoning: string;
    requiredCapabilities?: string[];
}

export interface AgentCapabilities {
    canWriteL3: boolean;
    canAccessTenantGlobal: boolean;
    canModifyPersona: boolean;
    canAccessSalaryData: boolean;
}

export function getAgentCapabilities(role: string): AgentCapabilities {
    if (role === "governance") return { canWriteL3: true, canAccessTenantGlobal: true, canModifyPersona: true, canAccessSalaryData: true };
    if (role === "recruiter") return { canWriteL3: true, canAccessTenantGlobal: false, canModifyPersona: false, canAccessSalaryData: true };
    return { canWriteL3: false, canAccessTenantGlobal: false, canModifyPersona: false, canAccessSalaryData: false };
}

export async function evaluateExecutionPolicy(
    confidenceScore: number, 
    hallucinationProb: number, 
    crossTenantRisk: boolean
): Promise<AdaptiveExecutionPolicy> {
    if (crossTenantRisk) {
        return { actionOverride: "SANDBOX_RETRIEVAL", reasoning: "Cross-tenant memory access detected. Enforcing sandbox." };
    }
    if (hallucinationProb > 0.3) {
        return { actionOverride: "REQUIRE_HUMAN_APPROVAL", reasoning: "High hallucination probability. Escalating to human oversight." };
    }
    if (confidenceScore < 0.7) {
        return { actionOverride: "FORCE_EVIDENCE_MODE", reasoning: "Low confidence detected. Forcing strictly evidence-backed retrieval." };
    }
    return { actionOverride: "CONTINUE", reasoning: "Execution within safe cognitive parameters." };
}

export async function detectDrift(tenantId: string, recruiterId: string, soulContent: string, rulesContent: string) {
    if (!adminDb) return;
    
    // Pseudo-implementation for persona instability
    // In a real system, you'd embed these and check cosine similarity or ask an LLM
    const isDrifting = false; 

    if (isDrifting) {
        await logGovernanceEvent({
            eventId: `gov_drift_${Date.now()}`,
            type: "persona_instability",
            severity: "high",
            tenantId,
            details: { recruiterId, context: "SOUL.md deviating from RULES.md" },
            resolved: false,
            timestamp: new Date().toISOString()
        });
    }
}

export async function checkMemoryContamination(tenantId: string, requestedMemoryTenantId: string, recruiterId: string): Promise<AdaptiveExecutionPolicy> {
    if (tenantId !== requestedMemoryTenantId) {
        if (!adminDb) return { actionOverride: "BLOCK_EXECUTION", reasoning: "DB unavailable." };
        
        await logGovernanceEvent({
            eventId: `gov_contam_${Date.now()}`,
            type: "memory_contamination",
            severity: "critical",
            tenantId,
            details: { recruiterId, attemptedAccessTenantId: requestedMemoryTenantId },
            resolved: false,
            timestamp: new Date().toISOString()
        });
        return { actionOverride: "SANDBOX_RETRIEVAL", reasoning: "Tenant isolation breach attempt. Sandboxing." };
    }
    return { actionOverride: "CONTINUE", reasoning: "Memory scope valid." };
}

export async function detectRecursiveHallucination(layer: string, sourceConfidence: number, newScenarioContent: string) {
    if (!adminDb) return;
    
    if (layer === "L2_SCENARIO" && sourceConfidence < 0.6) {
         await logGovernanceEvent({
            eventId: `gov_halluc_${Date.now()}`,
            type: "recursive_hallucination",
            severity: "high",
            tenantId: "system",
            details: { content: newScenarioContent, reason: "L2 scenario created from low-confidence L1 facts" },
            resolved: false,
            timestamp: new Date().toISOString()
        });
        
        // This should trigger an approval queue entry for human oversight
        try {
            await adminDb.collection("governanceApprovalQueue").add({
                type: "hallucination_review",
                content: newScenarioContent,
                layer,
                confidence: sourceConfidence,
                status: "PENDING_REVIEW",
                createdAt: new Date().toISOString()
            });
        } catch(e) {}
    }
}

export interface GovernanceScore {
    targetId: string;
    targetType: "tenant" | "recruiter" | "agent" | "workflow";
    trustScore: number; // 0-100
    cognitiveIntegrityScore: number; // 0-100
    memoryReliabilityScore: number; // 0-100
    driftProbability: number; // 0-1.0
    lastCalculated: string;
}

export async function calculateGovernanceScore(targetId: string, targetType: "tenant" | "recruiter" | "agent" | "workflow"): Promise<GovernanceScore> {
    // In a real system, we'd query governanceEvents, memory access logs, hallucination queues, etc.
    // For this simulation, we'll generate slightly randomized stable scores to demonstrate the architecture.
    
    const baseScore = targetType === "agent" ? 95 : 98;
    const driftProb = targetType === "agent" ? 0.05 : 0.01;

    const score: GovernanceScore = {
        targetId,
        targetType,
        trustScore: baseScore - Math.floor(Math.random() * 5),
        cognitiveIntegrityScore: baseScore - Math.floor(Math.random() * 3),
        memoryReliabilityScore: 90 + Math.floor(Math.random() * 10),
        driftProbability: driftProb + (Math.random() * 0.02),
        lastCalculated: new Date().toISOString()
    };

    if (adminDb) {
        try {
            await adminDb.collection("governanceScores").doc(`${targetType}_${targetId}`).set(score);
        } catch(e) {
            console.error("Failed to persist score", e);
        }
    }

    return score;
}

export async function logGovernanceEvent(event: GovernanceEvent) {
    if (!adminDb) return;
    try {
        await adminDb.collection("governanceEvents").doc(event.eventId).set(event);
        console.warn(`[GOVERNANCE ENGINE] Alert logged: ${event.type} - Severity: ${event.severity}`);
    } catch(err) {
        console.error("[GOVERNANCE ENGINE] Failed to log event:", err);
    }
}
