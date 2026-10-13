import {
  collection,
  query,
  where,
  getDocs as fbGetDocs,
  addDoc as fbAddDoc,
  updateDoc as fbUpdateDoc,
  doc,
  serverTimestamp,
  getDoc as fbGetDoc,
  setDoc as fbSetDoc,
} from "firebase/firestore";
import { isTrustedServiceContext, runAsTrustedService } from "../trusted-context.server.js";
import { adminDb } from "../firebase-admin.js";

function getAdminDb() {
  if (typeof window !== "undefined") return null;
  return adminDb;
}

async function getRequirementDocument(reqId: string): Promise<any> {
  const admin = getAdminDb();
  if (admin) {
    try {
      let snap = await admin.collection("requirements").doc(reqId).get();
      if (!snap.exists) {
        snap = await admin.collection("requirements_public").doc(reqId).get();
      }
      if (snap.exists) {
        return { id: snap.id, ...snap.data() };
      }
      return null;
    } catch (_) {}
  }
  try {
    let reqSnap = await fbGetDoc(doc(db, "requirements", reqId));
    if (reqSnap.exists()) {
      return { id: reqSnap.id, ...reqSnap.data() };
    }
    let pubSnap = await fbGetDoc(doc(db, "requirements_public", reqId));
    if (pubSnap.exists()) {
      return { id: pubSnap.id, ...pubSnap.data() };
    }
  } catch (_) {
    if (adminDb) {
      try {
        let snap = await adminDb.collection("requirements").doc(reqId).get();
        if (!snap.exists) {
          snap = await adminDb.collection("requirements_public").doc(reqId).get();
        }
        if (snap.exists) {
          return { id: snap.id, ...snap.data() };
        }
      } catch (_) {}
    }
  }
  return null;
}

async function getDoc(docRef: any): Promise<any> {
  const admin = getAdminDb();
  if (admin) {
    try {
      const path = docRef.path || `${docRef.parent?.id}/${docRef.id}`;
      const parts = path.split("/");
      const snap = await admin.collection(parts[0]).doc(parts[1]).get();
      return {
        exists: () => snap.exists,
        data: () => snap.data(),
        id: snap.id,
      };
    } catch (_) {}
  }
  try {
    return await fbGetDoc(docRef);
  } catch (err) {
    if (adminDb) {
      try {
        const path = docRef.path;
        const parts = path.split("/");
        const snap = await adminDb.collection(parts[0]).doc(parts[1]).get();
        return {
          exists: () => snap.exists,
          data: () => snap.data(),
          id: snap.id,
        };
      } catch (_) {}
    }
    throw err;
  }
}

async function getDocs(q: any): Promise<any> {
  const admin = getAdminDb();
  if (admin) {
    try {
      let collPath = "submissions";
      if (q.path) collPath = q.path;
      else if (q._query && q._query.path && q._query.path.segments) {
        collPath = q._query.path.segments.join("/");
      }
        
      let adminQuery: any = admin.collection(collPath);
      const filters = q._query?.filters || [];
      for (const f of filters) {
        let field = f.field?.segments ? f.field.segments.join(".") : String(f.field || "");
        let op = "==";
        if (f.op === "EQUAL" || f.op === "eq" || f.op === "==") op = "==";
        else if (typeof f.op === "string") op = f.op;
        let val = f.value?.internalValue !== undefined ? f.value.internalValue : (f.value?.value !== undefined ? f.value.value : f.value);
        if (field) adminQuery = adminQuery.where(field, op, val);
      }
      
      const snap = await adminQuery.get();
      return {
        empty: snap.empty,
        docs: snap.docs.map((d: any) => ({
          id: d.id,
          data: () => d.data(),
        })),
      };
    } catch (_) {}
  }
  try {
    return await fbGetDocs(q);
  } catch (err) {
    if (adminDb) {
      try {
        let collPath = "submissions";
        if (q.path) collPath = q.path;
        else if (q._query && q._query.path && q._query.path.segments) {
          collPath = q._query.path.segments.join("/");
        }
        let adminQuery: any = adminDb.collection(collPath);
        const filters = q._query?.filters || [];
        for (const f of filters) {
          let field = f.field?.segments ? f.field.segments.join(".") : String(f.field || "");
          let op = "==";
          if (f.op === "EQUAL" || f.op === "eq" || f.op === "==") op = "==";
          else if (typeof f.op === "string") op = f.op;
          let val = f.value?.internalValue !== undefined ? f.value.internalValue : (f.value?.value !== undefined ? f.value.value : f.value);
          if (field) adminQuery = adminQuery.where(field, op, val);
        }
        const snap = await adminQuery.get();
        return {
          empty: snap.empty,
          docs: snap.docs.map((d: any) => ({
            id: d.id,
            data: () => d.data(),
          })),
        };
      } catch (e: any) {
        console.error("[getDocs Fallback] adminDb query exception:", e.message);
      }
    }
    throw err;
  }
}

async function addDoc(collectionRef: any, data: any): Promise<any> {
  const admin = getAdminDb();
  if (admin) {
    try {
      const path = collectionRef.path || "submissions";
      const cleanData = { ...data };
      for (const key of Object.keys(cleanData)) {
        if (cleanData[key] && typeof cleanData[key] === "object" && cleanData[key]._methodName === "serverTimestamp") {
          cleanData[key] = new Date().toISOString();
        }
      }
      const docRef = await admin.collection(path).add(cleanData);
      return { id: docRef.id };
    } catch (_) {}
  }
  try {
    return await fbAddDoc(collectionRef, data);
  } catch (err) {
    if (adminDb) {
      try {
        const path = collectionRef.path;
        const cleanData = { ...data };
        for (const key of Object.keys(cleanData)) {
          if (cleanData[key] && typeof cleanData[key] === "object" && cleanData[key]._methodName === "serverTimestamp") {
            cleanData[key] = new Date().toISOString();
          }
        }
        const docRef = await adminDb.collection(path).add(cleanData);
        return { id: docRef.id };
      } catch (_) {}
    }
    throw err;
  }
}

async function updateDoc(docRef: any, data: any): Promise<any> {
  const admin = getAdminDb();
  if (admin) {
    try {
      const path = docRef.path || `${docRef.parent?.id}/${docRef.id}`;
      const parts = path.split("/");
      const cleanData = { ...data };
      for (const key of Object.keys(cleanData)) {
        if (cleanData[key] && typeof cleanData[key] === "object" && cleanData[key]._methodName === "serverTimestamp") {
          cleanData[key] = new Date().toISOString();
        }
      }
      await admin.collection(parts[0]).doc(parts[1]).update(cleanData);
      return;
    } catch (_) {}
  }
  try {
    return await fbUpdateDoc(docRef, data);
  } catch (err) {
    if (adminDb) {
      try {
        const path = docRef.path;
        const parts = path.split("/");
        const cleanData = { ...data };
        for (const key of Object.keys(cleanData)) {
          if (cleanData[key] && typeof cleanData[key] === "object" && cleanData[key]._methodName === "serverTimestamp") {
            cleanData[key] = new Date().toISOString();
          }
        }
        await adminDb.collection(parts[0]).doc(parts[1]).update(cleanData);
        return;
      } catch (_) {}
    }
    throw err;
  }
}

async function setDoc(docRef: any, data: any, options?: any): Promise<any> {
  const admin = getAdminDb();
  if (admin) {
    try {
      const path = docRef.path || `${docRef.parent?.id}/${docRef.id}`;
      const parts = path.split("/");
      const cleanData = { ...data };
      for (const key of Object.keys(cleanData)) {
        if (cleanData[key] && typeof cleanData[key] === "object" && cleanData[key]._methodName === "serverTimestamp") {
          cleanData[key] = new Date().toISOString();
        }
      }
      await admin.collection(parts[0]).doc(parts[1]).set(cleanData, options);
      return;
    } catch (_) {}
  }
  try {
    return await fbSetDoc(docRef, data, options);
  } catch (err) {
    if (adminDb) {
      try {
        const path = docRef.path;
        const parts = path.split("/");
        const cleanData = { ...data };
        for (const key of Object.keys(cleanData)) {
          if (cleanData[key] && typeof cleanData[key] === "object" && cleanData[key]._methodName === "serverTimestamp") {
            cleanData[key] = new Date().toISOString();
          }
        }
        await adminDb.collection(parts[0]).doc(parts[1]).set(cleanData, options);
        return;
      } catch (_) {}
    }
    throw err;
  }
}
import { db } from "../firebase.js";
import { emitEvent } from "../../services/eventBus.js";
import { AccessControlService } from "../../services/accessControlService.js";
import { CandidateOwnershipEngine } from "./CandidateOwnershipEngine.js";
import { UnifiedRequirementsService } from "../../services/unifiedRequirementsService.js";
import { VendorRequirementEligibilityPolicy } from "../../services/VendorRequirementEligibilityPolicy.js";

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
  bypassOwnershipCheck?: boolean;
  trustedServiceIdentity?: {
    type: "SERVICE";
    service: string;
  };
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
    if (request.trustedServiceIdentity) {
      return runAsTrustedService(request.trustedServiceIdentity, () => this.submitCandidateInternal(request));
    }
    return this.submitCandidateInternal(request);
  }

  private static async submitCandidateInternal(
    request: SubmissionRequest,
  ): Promise<SubmissionResponse> {
    try {
      const {
        candidateData,
        requirementId,
        clientId,
        vendorId,
        submitterId,
        initialStatus = "SUBMITTED_TO_CLIENT",
        matchScore = 0,
        aiAnalysis,
      } = request;

      console.log("Submission Request Start:", {
        candidateId: candidateData.id,
        requirementId,
        clientId,
        vendorId,
      });

      // 0. Upfront Validation: Submitter, Candidate Data, and Requirement Eligibility
      if (!submitterId && !request.trustedServiceIdentity) {
        return {
          success: false,
          message: "Submission rejected: submitter authentication required.",
          error: "UNAUTHENTICATED"
        };
      }

      if (!candidateData || (!candidateData.name && !candidateData.fullName)) {
        return {
          success: false,
          message: "Submission rejected: candidate name is required.",
          error: "INVALID_CANDIDATE_DATA"
        };
      }

      if (!requirementId) {
        return {
          success: false,
          message: "Submission rejected: requirementId is required.",
          error: "REQUIREMENT_NOT_FOUND"
        };
      }

      const authoritativeReqData = await getRequirementDocument(requirementId);

      if (!authoritativeReqData) {
        return {
          success: false,
          message: `Requirement "${requirementId}" was not found. Cannot submit candidate.`,
          error: "REQUIREMENT_NOT_FOUND"
        };
      }

      // Canonical Operational Gate Predicate
      if (!UnifiedRequirementsService.isRequirementOperational(authoritativeReqData)) {
        return {
          success: false,
          message: `Requirement "${authoritativeReqData.title || requirementId}" is closed, inactive, or unpublished and cannot accept candidate submissions.`,
          error: "REQUIREMENT_INELIGIBLE"
        };
      }

      // Vendor Authorization and Visibility Gate
      if (vendorId && vendorId !== "HQ" && vendorId !== "local") {
        if (!VendorRequirementEligibilityPolicy.isVendorEligible(authoritativeReqData)) {
          return {
            success: false,
            message: `Vendor "${vendorId}" is not authorized to submit candidates to requirement "${authoritativeReqData.title || requirementId}".`,
            error: "VENDOR_UNAUTHORIZED"
          };
        }
      }

      const reqTitle = authoritativeReqData.title || authoritativeReqData.role || "Unknown Requirement";
      const authoritativeClientId = authoritativeReqData.clientId || clientId || "HQ";
      const authoritativeClientName = authoritativeReqData.clientName || "Enterprise Partner";
      const authoritativeRecruiterId = authoritativeReqData.assignedRecruiterId || authoritativeReqData.recruiterId || (request as any).recruiterId || null;
      const authoritativeRecruiterName = authoritativeReqData.assignedRecruiterName || authoritativeReqData.recruiterName || (request as any).recruiterName || null;

      const fingerprint = this.generateFingerprint(
        candidateData.email,
        candidateData.phone,
        candidateData.resumeHash,
      );

      // 1. Identify Candidate
      let candidateId = candidateData.id;

      if (!candidateId) {
        // Condition 1: Same Resume fingerprint (hash)
        if (candidateData.resumeHash) {
          try {
            console.log("STEP 1A: Query candidatePool by resumeHash");
            let hashSnap: any;
            if (getAdminDb()) {
              const s = await getAdminDb()!.collection("candidatePool").where("resumeHash", "==", candidateData.resumeHash).get();
              hashSnap = { empty: s.empty, docs: s.docs.map((d: any) => ({ id: d.id, data: () => d.data() })) };
            } else {
              const hashQ = query(
                collection(db, "candidatePool"),
                where("resumeHash", "==", candidateData.resumeHash),
              );
              hashSnap = await getDocs(hashQ);
            }
            if (!hashSnap.empty) {
               candidateId = hashSnap.docs[0].id;
               console.log("STEP 1A SUCCESS: Fingerprint Match");
            }
          } catch (e) {
            console.error("STEP 1A FAILED", e);
            throw e;
          }
        }

        // Condition 2: Same vendor AND Same email AND Same phone
        if (!candidateId && candidateData.email && candidateData.phone) {
          try {
            console.log("STEP 1B: Query candidatePool by email, phone, and vendor");
            let emailSnap: any;
            if (getAdminDb()) {
              const s = await getAdminDb()!.collection("candidatePool")
                .where("email", "==", candidateData.email.toLowerCase().trim())
                .where("vendorId", "==", vendorId).get();
              emailSnap = { empty: s.empty, docs: s.docs.map((d: any) => ({ id: d.id, data: () => d.data() })) };
            } else {
              const emailQ = query(
                collection(db, "candidatePool"),
                where("email", "==", candidateData.email.toLowerCase().trim()),
                where("vendorId", "==", vendorId)
              );
              emailSnap = await getDocs(emailQ);
            }
            if (!emailSnap.empty) {
              const incomingPhone = candidateData.phone.replace(/\D/g, "");
              for (const doc of emailSnap.docs) {
                 const docPhone = (doc.data().phone || "").replace(/\D/g, "");
                 if (docPhone === incomingPhone && incomingPhone !== "") {
                    candidateId = doc.id;
                    console.log("STEP 1B SUCCESS: Vendor + Email + Phone Match");
                    break;
                 }
              }
            }
          } catch (e) {
            console.error("STEP 1B FAILED", e);
            throw e;
          }
        }
      }

      // 2. Determine Ownership
      if (candidateId) {
        try {
          console.log("STEP 2: Query candidateOwnership");
          const ownershipCheck = await CandidateOwnershipEngine.verifyOwnershipAndCheckConflicts(candidateId, vendorId);
          
          if (!ownershipCheck.canProceed && !request.bypassOwnershipCheck && vendorId !== "HQ") {
              return {
                success: false,
                message: `Candidate is owned by another vendor.`,
                error: "OWNERSHIP_CONFLICT",
                ownershipDetails: { owner: ownershipCheck.lockedBy, expiresAt: ownershipCheck.lockUntil },
              };
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
        const { auth } = await import("../../lib/firebase.js");
        let currentUserUid = auth.currentUser?.uid;
        let currentOrganizationId = "UNKNOWN";
        if (currentUserUid) {
          try {
            console.log("STEP 3A: getDoc user profile");
            let userDoc: any;
            if (getAdminDb()) {
              const s = await getAdminDb()!.collection("users").doc(currentUserUid).get();
              userDoc = { exists: () => s.exists, data: () => s.data() };
            } else {
              const { getDoc, doc } = await import("firebase/firestore");
              userDoc = await getDoc(doc(db, "users", currentUserUid));
            }
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
        let newCandRef: any;
        try {
          console.log("STEP 3B: addDoc candidatePool");
          const candCollRef = getAdminDb() ? { path: "candidatePool" } : collection(db, "candidatePool");
          newCandRef = await addDoc(candCollRef, {
            name: candidateData.name,
            fullName: candidateData.name,
            manualName: candidateData.name,
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
          const candDocRef = getAdminDb() ? { path: `candidatePool/${candidateId}` } : newCandRef;
          await updateDoc(candDocRef, { candidateId });
          console.log("STEP 3C SUCCESS");
        } catch (e) {
          console.error("STEP 3C FAILED", e);
          throw e;
        }
      }

      // 4. Idempotency & Duplicate Submission check
      const idempotencyKey = `${candidateId}_${requirementId}`;
      let subSnap: any;
      try {
        console.log("STEP 4: query submissions");
        if (getAdminDb()) {
          const s = await getAdminDb()!.collection("submissions").where("idempotencyKey", "==", idempotencyKey).get();
          subSnap = { empty: s.empty, docs: s.docs.map((d: any) => ({ id: d.id, data: () => d.data() })) };
        } else {
          const subQ = query(
            collection(db, "submissions"),
            where("idempotencyKey", "==", idempotencyKey),
          );
          subSnap = await getDocs(subQ);
        }
        console.log("STEP 4 SUCCESS");
      } catch (e) {
        console.error("STEP 4 FAILED", e);
        throw e;
      }

      // 4.5. Fetch candidate name and req title to prevent undefined in logs
      let candidateName = candidateData.name || candidateData.fullName;
      if (candidateId && (!candidateName || candidateName === "Unknown" || candidateName === "Anonymous")) {
         try {
             let candSnap: any;
             if (getAdminDb()) {
               const s = await getAdminDb()!.collection("candidatePool").doc(candidateId).get();
               candSnap = { exists: () => s.exists, data: () => s.data() };
             } else {
               const { getDoc, doc } = await import("firebase/firestore");
               candSnap = await getDoc(doc(db, "candidatePool", candidateId));
             }
             if (candSnap.exists()) {
                 candidateName = candSnap.data().name || candSnap.data().fullName || candSnap.data().manualName;
             }
         } catch (e) {
             console.error("Failed to fetch candidate name", e);
         }
      }
      candidateName = candidateName || "Anonymous";

      const authorizationId = `reqven-${requirementId}-${vendorId}`;

      let vendorName = "HQ";
      if (vendorId && vendorId !== "HQ") {
         try {
             let vendorSnap: any;
             if (getAdminDb()) {
               const s = await getAdminDb()!.collection("organizations").doc(vendorId).get();
               vendorSnap = { exists: () => s.exists, data: () => s.data() };
             } else {
               const { getDoc, doc } = await import("firebase/firestore");
               vendorSnap = await getDoc(doc(db, "organizations", vendorId));
             }
             if (vendorSnap.exists()) {
                 vendorName = vendorSnap.data().name || vendorId;
             }
         } catch(e) {
             console.error("Failed to fetch vendor name", e);
         }
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
            const subDocRef = getAdminDb() ? { path: `submissions/${submissionId}` } : doc(db, "submissions", submissionId);
            await updateDoc(subDocRef, {
              status: initialStatus,
              candidateAnalysis: aiAnalysis?.candidateAnalysis || aiAnalysis?.analysis || "AI Analysis pending manual recruiter validation.",
              sourcingCriteria: aiAnalysis?.sourcingCriteria || aiAnalysis?.criteria || "Sourcing criteria matching verified by vendor recruiter.",
              updatedAt: serverTimestamp(),
            });
            const candDocRef = getAdminDb() ? { path: `candidatePool/${candidateId}` } : doc(db, "candidatePool", candidateId);
            await updateDoc(candDocRef, {
                pipelineStage: "Matched",
                matchedRequirementId: requirementId,
                submissionId: submissionId,
                updatedAt: serverTimestamp()
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
          const subCollRef = getAdminDb() ? { path: "submissions" } : collection(db, "submissions");
          const newSubRef = await addDoc(subCollRef, {
            candidateId,
            candidateName: candidateName,
            candidateEmail:
              candidateData.email || candidateData.primaryEmail || "",
            requirementId,
            canonicalRequirementId: requirementId,
            reqTitle: reqTitle,
            clientId: authoritativeClientId,
            clientName: authoritativeClientName,
            recruiterId: authoritativeRecruiterId,
            recruiterName: authoritativeRecruiterName,
            vendorId, // authoritative
            authorization_id: authorizationId,
            requirementVendorAuthorizationId: authorizationId,
            attribution_snapshot: AccessControlService.createAttributionSnapshot({
              requirementId,
              requirementTitle: reqTitle,
              recruiterId: authoritativeRecruiterId,
              recruiterName: authoritativeRecruiterName,
              vendorId,
              vendorName,
              clientId: authoritativeClientId,
              clientName: authoritativeClientName,
              authorizationId,
              submittedByUserId: submitterId
            }),
            status: initialStatus,
            submittedBy: submitterId,
            matchScore,
            aiAnalysis: aiAnalysis || null,
            candidateAnalysis: aiAnalysis?.candidateAnalysis || aiAnalysis?.analysis || "AI Analysis pending manual recruiter validation.",
            sourcingCriteria: aiAnalysis?.sourcingCriteria || aiAnalysis?.criteria || "Sourcing criteria matching verified by vendor recruiter.",
            idempotencyKey,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            timeline: [
              { action: initialStatus, timestamp: new Date().toISOString() },
            ],
          });
          submissionId = newSubRef.id;
          
          console.log("STEP 5B: update cand pipelineStage");
          const candDocRef = getAdminDb() ? { path: `candidatePool/${candidateId}` } : doc(db, "candidatePool", candidateId);
          await updateDoc(candDocRef, {
              pipelineStage: "Matched",
              matchedRequirementId: requirementId,
              submissionId: submissionId,
              updatedAt: serverTimestamp()
          });

          const eventCollRef = getAdminDb() ? { path: "operationalEvents" } : collection(db, "operationalEvents");
          await addDoc(eventCollRef, {
            entityId: candidateId,
            type: "Candidate Submitted",
            actorRole: "Vendor/System",
            metadata: {
              source: "Workflow Orchestrator",
              message: `Candidate submitted to requirement ${requirementId}`
            },
            timestamp: serverTimestamp()
          });

          console.log("STEP 5 SUCCESS", submissionId);
        } catch (e) {
          console.error("STEP 5 FAILED", e);
          throw e;
        }
      }

      // 6. Establish/Update Ownership
      try {
        console.log("STEP 6: establishOwnership");
        if (vendorId !== "HQ") {
            await CandidateOwnershipEngine.establishOwnership(candidateId, vendorId, "VENDOR", 180);
        }
        console.log("STEP 6 SUCCESS");
      } catch (e) {
        console.error("STEP 6 FAILED", e);
        // don't throw, let submission continue even if ownership recording fails
      }

      // 7. Event Ledger (Async and non-blocking to prevent downstream timeouts)
      try {
        console.log("STEP 7: emitEvents (Asynchronous)");
        emitEvent(
          "SubmissionCreated",
          "SUBMISSION",
          submissionId,
          request.submitterId || "SYSTEM",
          "vendor",
          { candidateId, requirementId, vendorId, vendorName, matchScore, candidateName, reqTitle },
        ).catch(err => console.error("[SubmissionOrchestrator] SubmissionCreated async emit failed:", err));

        emitEvent(
          "CandidateMatched",
          "CANDIDATE",
          candidateId,
          request.submitterId || "SYSTEM",
          "vendor",
          { candidateId, requirementId, vendorId, vendorName, matchScore, candidateName, reqTitle },
        ).catch(err => console.error("[SubmissionOrchestrator] CandidateMatched async emit failed:", err));
        console.log("STEP 7 SUCCESS (Queued Async)");
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
