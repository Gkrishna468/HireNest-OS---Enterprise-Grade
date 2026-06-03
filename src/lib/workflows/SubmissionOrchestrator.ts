import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { emitEvent } from "../../services/eventBus";

export interface SubmissionRequest {
  candidateData: {
    id?: string;
    name: string;
    email?: string;
    phone?: string;
    resumeHash?: string;
    resumeText?: string;
    skills?: string[];
    [key: string]: any;
  };
  requirementId: string;
  clientId: string;
  vendorId: string;
  submitterId: string; // The user making the submission
  initialStatus?: string;
  matchScore?: number;
  aiAnalysis?: any;
}

export interface SubmissionResponse {
  success: boolean;
  message: string;
  candidateId?: string;
  submissionId?: string;
  error?: string;
  ownershipDetails?: any;
}

export class SubmissionOrchestrator {
  /**
   * Generates a unique fingerprint for a candidate
   */
  static generateFingerprint(email?: string, phone?: string, resumeHash?: string): string {
    const parts = [];
    if (email) parts.push(email.toLowerCase().trim());
    if (phone) parts.push(phone.replace(/\D/g, ''));
    if (resumeHash) parts.push(resumeHash);
    
    if (parts.length === 0) return crypto.randomUUID();
    return parts.join("|");
  }

  /**
   * Main authoritative entry point for creating a submission.
   */
  static async submitCandidate(request: SubmissionRequest): Promise<SubmissionResponse> {
    try {
      const { candidateData, requirementId, clientId, vendorId, submitterId, initialStatus = "SUBMITTED", matchScore = 0, aiAnalysis } = request;
      
      const fingerprint = this.generateFingerprint(
        candidateData.email, 
        candidateData.phone, 
        candidateData.resumeHash
      );
      
      // 1. Identify Candidate
      let candidateId = candidateData.id;
      
      if (!candidateId) {
        if (candidateData.resumeHash) {
          const hashQ = query(collection(db, "candidatePool"), where("resumeHash", "==", candidateData.resumeHash));
          const hashSnap = await getDocs(hashQ);
          if (!hashSnap.empty) candidateId = hashSnap.docs[0].id;
        }
        
        if (!candidateId && candidateData.email) {
          const emailQ = query(collection(db, "candidatePool"), where("email", "==", candidateData.email.toLowerCase().trim()));
          const emailSnap = await getDocs(emailQ);
          if (!emailSnap.empty) candidateId = emailSnap.docs[0].id;
        }
      }

      // 2. Determine Ownership
      if (candidateId) {
          const ownershipQ = query(
            collection(db, "ownershipVault"), 
            where("candidateId", "==", candidateId),
            where("active", "==", true)
          );
          const ownershipSnap = await getDocs(ownershipQ);
          if (!ownershipSnap.empty) {
            const claim = ownershipSnap.docs[0].data();
            const expiresAt = claim.expiresAt?.toDate ? claim.expiresAt.toDate() : new Date(claim.expiresAt);
            if (expiresAt > new Date()) {
                if (claim.vendorId !== vendorId && claim.vendorId !== "HQ" && vendorId !== "HQ") { // HQ can submit anyone
                    return {
                        success: false,
                        message: `Candidate is owned by another vendor.`,
                        ownershipDetails: { owner: claim.vendorId, expiresAt }
                    };
                }
            }
          }
      }

      // 3. Create or Update Candidate
      if (!candidateId) {
        // Create new candidate in candidatePool (Source of truth for identity)
        const newCandRef = await addDoc(collection(db, "candidatePool"), {
            name: candidateData.name,
            email: candidateData.email || "",
            phone: candidateData.phone || "",
            resumeHash: candidateData.resumeHash || "",
            resumeText: candidateData.resumeText || "",
            fingerprint: fingerprint,
            SystemSource: "ORCHESTRATOR",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
        candidateId = newCandRef.id;
        
        // Write candidateId back to document for easier querying
        await updateDoc(newCandRef, { candidateId });
      }

      // 4. Idempotency & Duplicate Submission check
      const idempotencyKey = `${candidateId}_${requirementId}`;
      const subQ = query(collection(db, "submissions"), where("idempotencyKey", "==", idempotencyKey));
      const subSnap = await getDocs(subQ);
      
      let submissionId = null;

      if (!subSnap.empty) {
        // Exists. Do not duplicate.
        submissionId = subSnap.docs[0].id;
        // Optionally update it if re-submitting to an active stage
        const existingStatus = subSnap.docs[0].data().status;
        if (existingStatus !== "REJECTED") {
             return {
                 success: true,
                 message: "Submission already exists and is active.",
                 candidateId,
                 submissionId
             };
        } else {
             // If rejected, we might allow a status bump to RESUBMITTED, but for now just update
             await updateDoc(doc(db, "submissions", submissionId), {
                 status: initialStatus,
                 updatedAt: serverTimestamp()
             });
        }
      } else {
        // 5. Create Submission (Source of Truth for Pipeline Progress)
        const newSubRef = await addDoc(collection(db, "submissions"), {
            candidateId,
            requirementId,
            canonicalRequirementId: requirementId,
            clientId,
            vendorOrgId: vendorId,
            vendorId: vendorId,   // fallback for UI compat
            status: initialStatus,
            submittedBy: submitterId,
            matchScore,
            aiAnalysis: aiAnalysis || null,
            idempotencyKey,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            timeline: [{ action: initialStatus, timestamp: new Date().toISOString() }]
        });
        submissionId = newSubRef.id;
      }

      // 6. Establish/Update Ownership
      // If we got here, either there is no claim, or the claim is ours (or we are HQ).
      // We issue/extend a 180 day claim.
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 180);
      
      const claimDocId = `${candidateId}_ownership`;
      await setDoc(doc(db, "ownershipVault", claimDocId), {
          candidateId,
          vendorId,
          claimedAt: serverTimestamp(),
          expiresAt: expiryDate,
          active: true,
          sourceSubmissionId: submissionId
      }, { merge: true });

      // 7. Event Ledger
      await emitEvent(
          "SubmissionCreated",
          "SUBMISSION",
          submissionId,
          request.submitterId || "SYSTEM",
          "vendor", 
          { candidateId, requirementId, vendorId, matchScore }
      );

      return {
          success: true,
          message: "Candidate successfully sequenced through orchestrator.",
          candidateId,
          submissionId
      };

    } catch (error: any) {
      console.error("Submission Orchestrator Error:", error);
      return { success: false, message: "Orchestration failed", error: error.message };
    }
  }
}

