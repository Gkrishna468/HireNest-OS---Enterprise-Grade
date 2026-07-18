import { db } from "../lib/firebase";
import { doc, serverTimestamp, runTransaction } from "firebase/firestore";
import { frontendTelemetry } from "../lib/frontendTelemetry";

export class VendorIntelligenceService {
  static async trackVendorEvent(vendorId: string, vendorName: string, tenantId: string, eventType: string, value: number = 0) {
    try {
      if (!vendorId) return;

      await runTransaction(db, async (transaction) => {
        const vendorRef = doc(db, "vendor_performance", vendorId);
        const docSnap = await transaction.get(vendorRef);

        let data = docSnap.exists() ? docSnap.data() : {
          vendorId,
          vendorName,
          tenantId,
          requirementsReceived: 0,
          requirementsWorked: 0,
          submissions: 0,
          interviews: 0,
          placements: 0,
          revenueGenerated: 0,
          submissionQuality: 80,
          responseSlaScore: 90,
          duplicateResumeRate: 0,
          candidateDropRate: 0,
          createdAt: serverTimestamp()
        };

        // apply increments
        if (eventType === "REQUIREMENT_RECEIVED") data.requirementsReceived = (data.requirementsReceived || 0) + 1;
        if (eventType === "REQUIREMENT_WORKED") data.requirementsWorked = (data.requirementsWorked || 0) + 1;
        if (eventType === "SUBMISSION_CREATED") data.submissions = (data.submissions || 0) + 1;
        if (eventType === "INTERVIEW_SCHEDULED") data.interviews = (data.interviews || 0) + 1;
        if (eventType === "PLACEMENT_CLOSED") {
          data.placements = (data.placements || 0) + 1;
          data.revenueGenerated = (data.revenueGenerated || 0) + value;
        }

        // ratios
        let fillRatio = 0;
        if (data.requirementsWorked > 0) {
          fillRatio = Math.round((data.placements / data.requirementsWorked) * 100);
        }

        const interviewConversion = data.submissions > 0 ? Math.round((data.interviews / data.submissions) * 100) : 0;
        const placementConversion = data.interviews > 0 ? Math.round((data.placements / data.interviews) * 100) : 0;
        
        let trustScore = 
            (data.submissionQuality * 0.2) + 
            (interviewConversion * 0.3) + 
            (placementConversion * 0.3) + 
            (data.responseSlaScore * 0.2) - 
            (data.duplicateResumeRate * 0.5) - 
            (data.candidateDropRate * 0.5);
            
        trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

        let aiInsight = "Stable performance. Standard monitoring.";
        if (trustScore >= 80) aiInsight = "High conversion velocity. Recommend routing Tier A requirements here.";
        else if (trustScore < 50) aiInsight = "Submission quality dropping. High rejection rate at Client Review phase.";

        const vendorTrustObject = {
          OverallTrust: trustScore,
          FillRate: fillRatio,
          InterviewRate: interviewConversion,
          PlacementRate: placementConversion,
          ResponseSLA: data.responseSlaScore,
          CandidateQuality: data.submissionQuality,
          Consistency: Math.max(50, Math.round(trustScore * 0.9))
        };

        data.fillRatio = fillRatio;
        data.trustScore = trustScore;
        data.vendorTrust = vendorTrustObject;
        data.aiInsight = aiInsight;
        data.updatedAt = serverTimestamp();

        transaction.set(vendorRef, data, { merge: true });
      });

    } catch (err) {
      console.error("[VendorIntelligenceService] Error tracking vendor event", err);
      frontendTelemetry.logRuntimeError({
        tenantId,
        sourceSystem: "VendorIntelligenceService",
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        severity: "ERROR"
      }).catch(console.error);
    }
  }
}
