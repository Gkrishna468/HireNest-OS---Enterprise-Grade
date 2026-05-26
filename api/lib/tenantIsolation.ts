import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Enterprise Priority: Tenant Isolation Middleware
 * Every request should validate: tenantId, workspaceId, role, scope, governance policy
 * Crucial Rule: Never allow cross-tenant vector retrieval.
 */

export interface TenantContext {
    tenantId: string;
    workspaceId: string;
    userId: string;
    role: string;
    governancePolicies: string[];
}

export async function validateTenantIsolation(
    context: TenantContext,
    targetResourceTenantId: string
): Promise<boolean> {
    console.log(`[TENANT_ISOLATION] Validating cross-tenant access. Requestor: ${context.tenantId}, Target: ${targetResourceTenantId}`);
    
    if (context.tenantId !== targetResourceTenantId) {
        console.warn(`[TENANT_ISOLATION] 🚨 CROSS-TENANT BREACH ATTEMPT DETECTED! Requestor: ${context.tenantId}, Target: ${targetResourceTenantId}`);
        // Log isolation breach attempt
        if (adminDb) {
            await adminDb.collection("securityAlerts").add({
                type: "TENANT_ISOLATION_BREACH_ATTEMPT",
                requestorTenantId: context.tenantId,
                targetTenantId: targetResourceTenantId,
                userId: context.userId,
                timestamp: new Date().toISOString()
            });
        }
        throw new Error("UNAUTHORIZED: Cross-tenant data access is strictly prohibited.");
    }

    console.log(`[TENANT_ISOLATION] ✅ Tenant boundary verified.`);
    return true;
}
