import { adminDb } from "../../src/lib/firebase-admin.js";

/**
 * Relic - AI Soul Chip (For Humans) Inspired Identity System
 * Markdown-driven, file-like identity for active sessions.
 */

export interface RelicIdentity {
    sessionId: string;
    userId: string;
    soul: string; // SOUL.md - Personality, values, mission
    userContext: string; // USER.md - Preferences, habits
    memory: string; // MEMORY.md - Extracted knowledge
    rules: string; // RULES.md - Hard operational constraints
    ethics: string; // ETHICS.md - Human governance boundaries
    mission: string; // MISSION.md - Strategic objectives
    tenant: string; // TENANT.md - Tenant Context
    permissions: string; // PERMISSIONS.md - Tool access and scopes
    skills: Record<string, string>; // SKILLS/ - Reusable workflows
    createdAt: string;
    updatedAt: string;
}

export async function createOrUpdateRelic(userId: string, sessionId: string, updates: Partial<RelicIdentity>): Promise<void> {
    if (!adminDb) return;
    
    // We treat 'relicIdentities' as a virtual filesystem stored in our DB
    const docRef = adminDb.collection("relicIdentities").doc(`${userId}_${sessionId}`);
    
    try {
        const snap = await docRef.get();
        if (snap.exists) {
            await docRef.update({
                ...updates,
                updatedAt: new Date().toISOString()
            });
        } else {
            await docRef.set({
                sessionId,
                userId,
                soul: updates.soul || "# SOUL\\n\\nI am a precision recruiter operating under HireNestOS governance.",
                userContext: updates.userContext || "# USER\\n\\nProfessional context.",
                memory: updates.memory || "# MEMORY\\n\\nNo long-term memories extracted yet.",
                rules: updates.rules || "# RULES\\n\\n- Never expose cross-tenant data\\n- Never overwrite recruiter notes",
                ethics: updates.ethics || "# ETHICS\\n\\n- No discriminatory filtering\\n- Preserve recruiter transparency",
                mission: updates.mission || "# MISSION\\n\\nOptimize recruiter productivity while preserving candidate authenticity.",
                tenant: updates.tenant || "# TENANT\\n\\nDefault OS Tenant",
                permissions: updates.permissions || "# PERMISSIONS\\n\\n- Scoped Retrieval: Same Tenant & Recruiter",
                skills: updates.skills || {},
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }
    } catch(err) {
        console.error("[RELIC] Failed to write relic identity:", err);
    }
}

export async function fetchRelicIdentity(userId: string, sessionId: string): Promise<RelicIdentity | null> {
    if (!adminDb) return null;
    
    try {
        const docRef = adminDb.collection("relicIdentities").doc(`${userId}_${sessionId}`);
        const snap = await docRef.get();
        if (snap.exists) {
            return snap.data() as RelicIdentity;
        }
        return null;
    } catch(err) {
        console.error("[RELIC] Fetch error:", err);
        return null;
    }
}
