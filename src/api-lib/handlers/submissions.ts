import { adminDb } from "../../lib/firebase-admin.js";
import { EnterpriseRuntimeKernel } from "../os/kernel/EnterpriseRuntimeKernel.js";

export default async function submissionsHandler(req: any, res: any) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method Not Allowed" });
  }

  const {
    submissionId,
    newStatus,
    rejectReason,
    gapAnalysis,
    resumeSuggestions,
  } = req.body;
  if (!submissionId || !newStatus) {
    return res
      .status(400)
      .json({ success: false, error: "Missing submissionId or newStatus" });
  }

  try {
    const subRef = adminDb.collection("submissions").doc(submissionId);
    const subSnap = await subRef.get();

    if (!subSnap.exists) {
      return res
        .status(404)
        .json({ success: false, error: "Submission not found" });
    }

    const sub = subSnap.data() as any;
    const currentStatus = sub.status || "SUBMITTED";

    // 1. Evaluate policy and check state transition validity in the Kernel
    const actorRole = req.user?.role || "user";
    const actorOrgId = req.user?.organizationId || "";

    const isValidTransition =
      await EnterpriseRuntimeKernel.state.transitionState(
        "SUBMISSION",
        currentStatus,
        newStatus,
        { role: actorRole, submissionId },
      );

    if (!isValidTransition) {
      return res.status(400).json({
        success: false,
        error: `Transition from ${currentStatus} to ${newStatus} is unauthorized or forbidden by deterministic state policies.`,
      });
    }

    // 2. Complete previous SLA
    await EnterpriseRuntimeKernel.sla.completeSLA(submissionId, rejectReason);

    // 3. Assemble updates
    const updates: Record<string, any> = {
      status: newStatus.toUpperCase(),
      updatedAt: new Date().toISOString(),
    };

    if (newStatus.toUpperCase() === "REJECTED") {
      updates.rejectReason =
        rejectReason || "Qualifications did not meet expectations";

      // Default / Override AI Gap Analysis fields for Candidate Recovery Center!
      updates.gapAnalysis = {
        missingSkills: gapAnalysis?.missingSkills || [
          "Enterprise Frameworks",
          "Cloud Orchestration",
        ],
        missingKeywords: gapAnalysis?.missingKeywords || [
          "CI/CD",
          "Docker",
          "Kubernetes",
        ],
        interviewWeaknesses: gapAnalysis?.interviewWeaknesses || [
          "Architecture Systems Design",
        ],
        resumeSuggestions:
          resumeSuggestions ||
          "Focus on highlighting full-lifecycle backend ownership and production operations.",
        expectedMatchScore: gapAnalysis?.expectedMatchScore || 70,
        placementProbability: gapAnalysis?.placementProbability || 45,
      };
    }

    // 4. Update the Submission document in Firestore
    await subRef.update(updates);

    // 5. Initialize the new stage SLA
    const newSla = await EnterpriseRuntimeKernel.sla.initiateSLA(
      submissionId,
      newStatus.toUpperCase(),
    );

    // 6. Publish the transition to EventEngine (which triggers NotificationOffice)
    await EnterpriseRuntimeKernel.event.publish("SUBMISSION_STATUS_UPDATED", {
      submissionId,
      status: newStatus.toUpperCase(),
      rejectReason: updates.rejectReason,
      gapAnalysis: updates.gapAnalysis,
      resumeSuggestions: updates.gapAnalysis?.resumeSuggestions,
      candidateName: sub.candidateName || "Anonymous",
      vendorId: sub.vendorId,
      clientId: sub.clientId,
    });

    return res.json({
      success: true,
      message: `Successfully transitioned submission ${submissionId} to ${newStatus}`,
      status: newStatus.toUpperCase(),
      sla: newSla,
    });
  } catch (err: any) {
    console.error("[Submissions Handler] Error transitioning state:", err);
    return res.status(500).json({
      success: false,
      error: "State machine execution failed",
      details: err?.message || String(err),
    });
  }
}
