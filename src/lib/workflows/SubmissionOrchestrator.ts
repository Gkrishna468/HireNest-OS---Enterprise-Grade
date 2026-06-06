import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  setDoc,
} from "firebase/firestore";
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
  static generateFingerprint(
    email?: string,
    phone?: string,
    resumeHash?: string,
  ): string {
    const parts = [];
    if (email) parts.push(email.toLowerCase().trim());
    if (phone) parts.push(phone.replace(/\D/g, ""));
    if (resumeHash) parts.push(resumeHash);

    if (parts.length === 0) return crypto.randomUUID();
    return parts.join("|");
  }

  /**
   * Main authoritative entry point for creating a submission.
   */
  static async submitCandidate(
    request: SubmissionRequest,
  ): Promise<SubmissionResponse> {
    try {
      const {
        candidateData,
        requirementId,
        clientId,
        vendorId,
        submitterId,
        initialStatus = "SUBMITTED",
        matchScore = 0,
        aiAnalysis,
      } = request;

      console.log("Submission Request Start:", {
        candidateId: candidateData.id,
        requirementId,
        clientId,
        vendorId,
      });

      const fingerprint = this.generateFingerprint(
        candidateData.email,
        candidateData.phone,
        candidateData.resumeHash,
      );

      // 1. Identify Candidate
      let candidateId = candidateData.id;

      if (!candidateId) {
        if (candidateData.resumeHash) {
          try {
            console.log("STEP 1A: Query candidatePool by resumeHash");
            const hashQ = query(
              collection(db, "candidatePool"),
              where("resumeHash", "==", candidateData.resumeHash),
            );
            const hashSnap = await getDocs(hashQ);
            if (!hashSnap.empty) candidateId = hashSnap.docs[0].id;
            console.log("STEP 1A SUCCESS");
          } catch (e) {
            console.error("STEP 1A FAILED", e);
            throw e;
          }
        }

        if (!candidateId && candidateData.email) {
          try {
            console.log("STEP 1B: Query candidatePool by email");
            const emailQ = query(
              collection(db, "candidatePool"),
              where("email", "==", candidateData.email.toLowerCase().trim()),
            );
            const emailSnap = await getDocs(emailQ);
            if (!emailSnap.empty) candidateId = emailSnap.docs[0].id;
            console.log("STEP 1B SUCCESS");
          } catch (e) {
            console.error("STEP 1B FAILED", e);
            throw e;
          }
        }
      }

      // 2. Determine Ownership
      if (candidateId) {
        try {
          console.log("STEP 2: Query ownershipVault");
          const ownershipQ = query(
            collection(db, "ownershipVault"),
            where("candidateId", "==", candidateId),
            where("active", "==", true),
          );
          const ownershipSnap = await getDocs(ownershipQ);
          if (!ownershipSnap.empty) {
            const claim = ownershipSnap.docs[0].data();
            const expiresAt = claim.expiresAt?.toDate
              ? claim.expiresAt.toDate()
              : new Date(claim.expiresAt);
            if (expiresAt > new Date()) {
              if (
                claim.vendorId !== vendorId &&
                claim.vendorId !== "HQ" &&
                vendorId !== "HQ"
              ) {
                // HQ can submit anyone
                return {
                  success: false,
                  message: `Candidate is owned by another vendor.`,
                  ownershipDetails: { owner: claim.vendorId, expiresAt },
                };
              }
            }
          }
          console.log("STEP 2 SUCCESS");
        } catch (e) {
          console.error("STEP 2 FAILED", e);
          throw e;
        }
      }

      // 3. Create or Update Candidate
      if (!candidateId) {
        // Create new candidate in candidatePool (Source of truth for identity)
        const { auth } = await import("../../lib/firebase");
        let currentUserUid = auth.currentUser?.uid;
        let currentOrganizationId = "UNKNOWN";
        if (currentUserUid) {
          try {
            console.log("STEP 3A: getDoc user profile");
            const { getDoc } = await import("firebase/firestore");
            const userDoc = await getDoc(doc(db, "users", currentUserUid));
            if (userDoc.exists()) {
              currentOrganizationId = userDoc.data().organizationId;
            }
            console.log("STEP 3A SUCCESS");
          } catch (e) {
            console.error("STEP 3A FAILED", e);
            throw e;
          }
        }
        console.log("CANDIDATE CREATE PAYLOAD", {
          vendorId,
          clientId,
          currentUserUid,
          currentOrganizationId,
        });
        let newCandRef;
        try {
          console.log("STEP 3B: addDoc candidatePool");
          newCandRef = await addDoc(collection(db, "candidatePool"), {
            name: candidateData.name,
            email: candidateData.email || "",
            phone: candidateData.phone || "",
            resumeHash: candidateData.resumeHash || "",
            resumeText: candidateData.resumeText || "",
            fingerprint: fingerprint,
            SystemSource: "ORCHESTRATOR",
            vendorId: vendorId,
            clientId: clientId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          console.log("STEP 3B SUCCESS", newCandRef.id);
        } catch (e) {
          console.error("STEP 3B FAILED", e);
          throw e;
        }
        candidateId = newCandRef.id;

        try {
          // Write candidateId back to document for easier querying
          console.log("STEP 3C: updateDoc candidateId");
          await updateDoc(newCandRef, { candidateId });
          console.log("STEP 3C SUCCESS");
        } catch (e) {
          console.error("STEP 3C FAILED", e);
          throw e;
        }
      }

      // 4. Idempotency & Duplicate Submission check
      const idempotencyKey = `${candidateId}_${requirementId}`;
      let subSnap;
      try {
        console.log("STEP 4: query submissions");
        const subQ = query(
          collection(db, "submissions"),
          where("idempotencyKey", "==", idempotencyKey),
        );
        subSnap = await getDocs(subQ);
        console.log("STEP 4 SUCCESS");
      } catch (e) {
        console.error("STEP 4 FAILED", e);
        throw e;
      }

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
            submissionId,
          };
        } else {
          try {
            console.log("STEP 4B: update rejected submission");
            // If rejected, we might allow a status bump to RESUBMITTED, but for now just update
            await updateDoc(doc(db, "submissions", submissionId), {
              status: initialStatus,
              updatedAt: serverTimestamp(),
            });
            console.log("STEP 4B SUCCESS");
          } catch (e) {
            console.error("STEP 4B FAILED", e);
            throw e;
          }
        }
      } else {
        // 5. Create Submission (Source of Truth for Pipeline Progress)
        try {
          console.log("STEP 5: addDoc submissions", {
            candidateId,
            requirementId,
            clientId,
            vendorId,
          });
          const newSubRef = await addDoc(collection(db, "submissions"), {
            candidateId,
            candidateName:
              candidateData.name || candidateData.fullName || "Anonymous",
            candidateEmail:
              candidateData.email || candidateData.primaryEmail || "",
            requirementId,
            canonicalRequirementId: requirementId,
            clientId,
            vendorId, // authoritative
            status: initialStatus,
            submittedBy: submitterId,
            matchScore,
            aiAnalysis: aiAnalysis || null,
            idempotencyKey,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            timeline: [
              { action: initialStatus, timestamp: new Date().toISOString() },
            ],
          });
          submissionId = newSubRef.id;
          console.log("STEP 5 SUCCESS", submissionId);
        } catch (e) {
          console.error("STEP 5 FAILED", e);
          throw e;
        }
      }

      // 6. Establish/Update Ownership
      try {
        console.log("STEP 6: setDoc ownershipVault");
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 180);

        const claimDocId = `${candidateId}_ownership`;
        await setDoc(
          doc(db, "ownershipVault", claimDocId),
          {
            candidateId,
            vendorId,
            claimedAt: serverTimestamp(),
            expiresAt: expiryDate,
            active: true,
            sourceSubmissionId: submissionId,
          },
          { merge: true },
        );
        console.log("STEP 6 SUCCESS");
      } catch (e) {
        console.error("STEP 6 FAILED", e);
        throw e;
      }

      // 7. Event Ledger
      try {
        console.log("STEP 7: emitEvent SubmissionCreated");
        await emitEvent(
          "SubmissionCreated",
          "SUBMISSION",
          submissionId,
          request.submitterId || "SYSTEM",
          "vendor",
          { candidateId, requirementId, vendorId, matchScore },
        );
        console.log("STEP 7 SUCCESS");
      } catch (e) {
        console.error("STEP 7 FAILED", e);
      }

      return {
        success: true,
        message: "Candidate successfully sequenced through orchestrator.",
        candidateId,
        submissionId,
      };
    } catch (error: any) {
      console.error("Submission Orchestrator Error:", error);
      return {
        success: false,
        message: "Orchestration failed",
        error: error.message,
      };
    }
  }
}
