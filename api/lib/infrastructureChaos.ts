import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Phase 17: Infrastructure Resilience Testing
 * Simulates network breaks, database outages, API limits, and latency spikes.
 */

export async function simulateNetworkTimeout(operationName: string, maxLatencyMs: number = 3000): Promise<boolean> {
    console.log(`[INFRA_CHAOS] Simulating network timeout for ${operationName} (${maxLatencyMs}ms)...`);
    
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            console.warn(`[INFRA_CHAOS] ⚠️ Network timeout triggered on ${operationName}.`);
            reject(new Error(`NETWORK_TIMEOUT: ${operationName} failed to respond in ${maxLatencyMs}ms`));
        }, maxLatencyMs);
    });
}

export async function simulateDatabaseOutage(): Promise<void> {
    console.log(`[INFRA_CHAOS] Simulating Firestore unreachability...`);
    throw new Error("UNAVAILABLE: The service is currently unavailable. (Simulated Outage)");
}

export async function simulateRateLimiting(agentId: string): Promise<void> {
    console.log(`[INFRA_CHAOS] Simulating LLM Provider Rate Limiting for ${agentId}...`);
    throw new Error("HTTP_429_TOO_MANY_REQUESTS: Exceeded token quota. (Simulated Rate Limit)");
}

export async function logChaosEvent(eventType: string, details: string) {
    if (!adminDb) return;
    try {
        await adminDb.collection("infrastructureChaosLogs").add({
            eventType,
            details,
            timestamp: new Date().toISOString()
        });
    } catch(e) {
        console.error("Failed to log chaos event", e);
    }
}
