import { db } from "../lib/firebase";
import { doc, setDoc, serverTimestamp, increment, getDoc } from "firebase/firestore";
import { frontendTelemetry } from "../lib/frontendTelemetry";

export class VendorIntelligenceService {
  static async trackVendorEvent(vendorId: string, vendorName: string, tenantId: string, eventType: string, value: number = 0) {
    try {
      if (!vendorId) return;

      const vendorRef = doc(db, "vendor_performance", vendorId);
      const increments: any = {};

      if (eventType === "REQUIREMENT_RECEIVED") increments.requirementsReceived = increment(1);
      if (eventType === "REQUIREMENT_WORKED") increments.requirementsWorked = increment(1);
      if (eventType === "SUBMISSION_CREATED") increments.submissions = increment(1);
      if (eventType === "INTERVIEW_SCHEDULED") increments.interviews = increment(1);
      if (eventType === "PLACEMENT_CLOSED") {
        increments.placements = increment(1);
        increments.revenueGenerated = increment(value); // value is placement fee
      }

      // Initial structure if it doesn't exist, plus increments
      await setDoc(vendorRef, {
        vendorId,
        vendorName,
        tenantId,
        updatedAt: serverTimestamp(),
        ...increments
      }, { merge: true });

      // After updating increments, recalculate ratios
      const updatedDoc = await getDoc(vendorRef);
      if (updatedDoc.exists()) {
        const data = updatedDoc.data();
        const reqs = data.requirementsWorked || 0;
        const submissions = data.submissions || 0;
        const interviews = data.interviews || 0;
        const placements = data.placements || 0;
        
        let fillRatio = 0;
        if (reqs > 0) {
          fillRatio = Math.round((placements / reqs) * 100);
        }

        const interviewConversion = submissions > 0 ? (interviews / submissions) * 100 : 0;
        const placementConversion = interviews > 0 ? (placements / interviews) * 100 : 0;
        
        const submissionQuality = data.submissionQuality || 80; // defaults for missing data
        const responseSlaScore = data.responseSlaScore || 90;
        const duplicateResumePenalty = data.duplicateResumeRate || 0;
        const candidateDropPenalty = data.candidateDropRate || 0;
        
        let trustScore = 
            (submissionQuality * 0.2) + 
            (interviewConversion * 0.3) + 
            (placementConversion * 0.3) + 
            (responseSlaScore * 0.2) - 
            (duplicateResumePenalty * 0.5) - 
            (candidateDropPenalty * 0.5);
            
        trustScore = Math.max(0, Math.min(100, Math.round(trustScore)));

        await setDoc(vendorRef, {
          fillRatio,
          trustScore
        }, { merge: true });
      }

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
