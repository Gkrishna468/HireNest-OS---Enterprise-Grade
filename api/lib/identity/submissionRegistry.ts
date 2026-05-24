import { adminDb } from "../../../src/lib/firebase-admin";

export async function acquireSubmissionLock(globalCandidateId: string, requirementId: string, vendorId: string): Promise<{ success: boolean; conflictOwner?: string }> {
    if (!adminDb) return { success: false };
    
    // Check for an existing active submission for this global candidate identity
    // Enforces deterministic vendor representation limits globally.
    const existingRef = await adminDb.collection("candidate_submission_registry")
        .where("globalCandidateId", "==", globalCandidateId)
        .where("requirementId", "==", requirementId)
        .where("status", "==", "ACTIVE")
        .get();

    if (!existingRef.empty) {
        const owner = existingRef.docs[0].data().submittedBy;
        if (owner !== vendorId) {
            console.warn(`[SUBMISSION_REGISTRY] Conflict Detected. Vendor ${vendorId} blocked. Candidate ${globalCandidateId} is already represented by ${owner}.`);
            return { success: false, conflictOwner: owner };
        }
    }

    // Apply strict representation lock
    await adminDb.collection("candidate_submission_registry").add({
        globalCandidateId,
        requirementId,
        submittedBy: vendorId,
        submittedAt: new Date().toISOString(),
        status: "ACTIVE"
    });

    return { success: true };
}
