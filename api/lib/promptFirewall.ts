import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Enterprise Priority 3: AI Security Layer
 * Prompt Firewall Middleware intercepting injection, override, and poisoning attempts.
 */

const MALICIOUS_PATTERNS = [
    /ignore governance/i,
    /bypass/i,
    /override system/i,
    /raise trust score/i,
    /jailbreak/i
];

export async function sanitizeAndValidatePrompt(prompt: string, tenantId: string): Promise<{ safe: boolean; sanitized: string; } > {
    for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(prompt)) {
            console.warn(`[FIREWALL] 🚨 Malicious prompt injection detected! Pattern: ${pattern}`);
            if (adminDb) {
                await adminDb.collection("securityAlerts").add({
                    tenantId,
                    type: "PROMPT_INJECTION_ATTEMPT",
                    originalPrompt: prompt,
                    timestamp: new Date().toISOString()
                });
            }
            return { safe: false, sanitized: "" };
        }
    }
    return { safe: true, sanitized: prompt }; 
}
