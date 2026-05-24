import { adminDb } from "../../src/lib/firebase-admin";

export type InteractionType = "SHORTLISTED" | "REJECTED" | "INTERVIEWED" | "HIRED";

export async function recordMatchFeedback(candidateId: string, requirementId: string, action: InteractionType, recruiterId: string) {
    if (!adminDb) return;
    
    // Store immutable action stream for recruiter behavior profiling
    const feedbackRef = await adminDb.collection("match_feedback_events").add({
        candidateId,
        requirementId,
        action,
        recruiterId,
        timestamp: new Date().toISOString()
    });

    // Enqueue a reinforcement analysis event asynchronously to tune weights later
    await adminDb.collection("workflowEvents").add({
        eventType: "ANALYZE_MATCH_FEEDBACK",
        status: "QUEUED",
        payload: {
            feedbackId: feedbackRef.id,
            candidateId,
            requirementId,
            action
        },
        createdAt: new Date().toISOString()
    });
}
