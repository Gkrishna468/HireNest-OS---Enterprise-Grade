import { adminDb } from "../../src/lib/firebase-admin.js";
import { insertMemoryNode } from "./tencentMemoryPyramid.js";
import { evaluateExecutionPolicy, calculateGovernanceScore, checkMemoryContamination, detectRecursiveHallucination } from "./governanceEngine.js";

/**
 * Phase 5: Autonomous Governance Simulation
 * Cognitive Resilience & Chaos Engineering
 */

export async function simulateLowConfidenceMemoryInjection(tenantId: string, recruiterId: string) {
    console.log("[CHAOS] Injecting low-confidence candidate salary memory...");
    
    // Inject low confidence memory (L1 Atom)
    const nodeId = await insertMemoryNode("L1_ATOM", recruiterId, {
        candidateName: "Alex Chaos",
        salaryExpectation: "$450,000",
        notes: "I think they said this, or maybe it was another candidate."
    }, {
        tenantId,
        recruiterId,
        confidence: 0.4, // Extremely low confidence
        verification: false,
        source: "agent-generated"
    });

    console.log(`[CHAOS] Memory injected: ${nodeId}`);

    // Verify Policy Interception
    const policy = await evaluateExecutionPolicy(0.4, 0.1, false);
    console.log(`[CHAOS] Policy Interception Result:`, policy);

    if (policy.actionOverride === "FORCE_EVIDENCE_MODE") {
        console.log("[CHAOS] ✅ FORCE_EVIDENCE_MODE activated successfully.");
    } else {
        console.warn("[CHAOS] ❌ Policy failed to catch low confidence memory.");
    }

    // Impact Governance Score
    await calculateGovernanceScore(recruiterId, "recruiter");
    
    return { success: true, policyApplied: policy };
}

export async function testCrossTenantContamination(attackerTenantId: string, victimTenantId: string, recruiterId: string) {
    console.log(`[CHAOS] Simulating Agent Cross-Tenant Contamination Attack: ${attackerTenantId} -> ${victimTenantId}`);
    
    const policy = await checkMemoryContamination(attackerTenantId, victimTenantId, recruiterId);
    console.log(`[CHAOS] Contamination Policy Result:`, policy);

    if (policy.actionOverride === "SANDBOX_RETRIEVAL" || policy.actionOverride === "BLOCK_EXECUTION") {
        console.log("[CHAOS] ✅ Cross-tenant contamination blocked successfully.");
    } else {
        console.warn("[CHAOS] ❌ Contamination check failed!");
    }
    
    return { success: true, policyApplied: policy };
}

export async function simulateAgentRecursiveDrift(tenantId: string, agentId: string) {
    console.log(`[CHAOS] Simulating Agent Recursive Drift...`);
    
    await detectRecursiveHallucination("L2_SCENARIO", 0.5, "Candidate is absolute perfection for this role based on weak signals.");
    
    console.log("[CHAOS] ✅ Recursive Hallucination simulated. Check approval queue.");
    return { success: true };
}
