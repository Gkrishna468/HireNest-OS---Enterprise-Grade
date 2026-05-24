import { adminDb } from "../../src/lib/firebase-admin";

export async function acquireSubmissionLock(globalCandidateId: string, requirementId: string, vendorId: string): Promise<{ success: boolean; conflictOwner?: string }> {
    if (!adminDb) return { success: false };
    
    const now = new Date();
    
    // Check for an existing active submission for this global candidate identity
    // Enforces deterministic vendor representation limits globally.
    const existingRef = await adminDb.collection("candidate_submission_registry")
        .where("globalCandidateId", "==", globalCandidateId)
        .where("requirementId", "==", requirementId)
        .where("status", "==", "ACTIVE")
        .get();

    for (const doc of existingRef.docs) {
        const data = doc.data();
        const expiresAt = new Date(data.expiresAt).getTime();
        
        if (now.getTime() > expiresAt) {
            // Lock expired mathematically, update status asynchronously and allow override
            await doc.ref.update({ status: "EXPIRED" });
            continue; 
        }

        if (data.submittedBy !== vendorId) {
            console.warn(`[SUBMISSION_REGISTRY] Conflict Detected. Vendor ${vendorId} blocked. Candidate ${globalCandidateId} is already represented by ${data.submittedBy}.`);
            return { success: false, conflictOwner: data.submittedBy };
        } else {
            // Vendor already owns it, return success
            return { success: true };
        }
    }

    // Apply strict representation lock
    const ownershipDurationDays = 90;
    const expiresAt = new Date(now.getTime() + ownershipDurationDays * 24 * 60 * 60 * 1000);

    await adminDb.collection("candidate_submission_registry").add({
        globalCandidateId,
        requirementId,
        submittedBy: vendorId,
        submittedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        gracePeriodDays: 30,
        status: "ACTIVE"
    });

    return { success: true };
}
