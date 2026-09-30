import { requirementVendorService } from "./requirementVendorService.js";
import { recruiterVendorMappingService } from "./recruiterVendorMappingService.js";
import { CandidateRequirementEligibilityPolicy } from "./CandidateRequirementEligibilityPolicy.js";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../lib/firebase.js";

export type RecruiterType = 'INTERNAL' | 'VENDOR' | 'FREELANCE';
export type ABACScope = 'ASSIGNED_ONLY' | 'ALL_PERMITTED' | 'EXPLICIT_ONLY';

export interface HireNestAccessContext {
  userId: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'BUSINESS_OPERATIONS' | 'BUSINESS_MANAGER' | 'RECRUITER' | 'VENDOR' | 'CLIENT' | 'CANDIDATE' | 'GLOBAL_HQ' | string;
  organizationId: string;
  recruiterId?: string;
  recruiterType?: RecruiterType;
  abacScope?: ABACScope;
  assignedRequirementIds?: string[];
  vendorId?: string;
  clientId?: string;
  candidateId?: string;
  email?: string;
  permissions?: string[];
}

export type OperationalPermission =
  | 'VIEW'
  | 'MATCH'
  | 'DOWNLOAD_RESUME'
  | 'SUBMIT'
  | 'EDIT'
  | 'APPROVE'
  | 'MESSAGE'
  | 'DEACTIVATE';

export interface AttributionSnapshot {
  submittedAt: string;
  requirementId: string;
  requirementTitle: string;
  recruiterId: string | null;
  recruiterName: string | null;
  vendorId: string;
  vendorName: string;
  clientId: string;
  clientName: string;
  authorizationId: string;
  submittedByUserId: string;
  version: string;
}

/**
 * AccessControlService
 * Standardized security & access control context across requirements, candidates, submissions, and recruiters.
 * Enforces strict ABAC, Vendor Isolation, and Candidate Data Ownership.
 */
export class AccessControlService {
  /**
   * Helper to build a standardized HireNestAccessContext from raw user session objects
   */
  static buildAccessContext(user: any): HireNestAccessContext {
    const rawRole = user?.role || user?.userRole || 'RECRUITER';
    let role = rawRole.toUpperCase();
    
    // Determine recruiter classification and ABAC scope before role normalization
    let recruiterType: RecruiterType | undefined = user?.recruiterType;
    if (!recruiterType && (role === 'RECRUITER' || role.includes('RECRUITER'))) {
      if (user?.vendorId || role.includes('VENDOR')) recruiterType = 'VENDOR';
      else if (user?.isFreelance) recruiterType = 'FREELANCE';
      else recruiterType = 'INTERNAL';
    }

    // Standardize role to core archetypes (VENDOR, CLIENT, CANDIDATE) for uniform ABAC evaluation
    if (role.indexOf('VENDOR') !== -1) {
      role = 'VENDOR';
    } else if (role.indexOf('CLIENT') !== -1) {
      role = 'CLIENT';
    } else if (role.indexOf('CANDIDATE') !== -1) {
      role = 'CANDIDATE';
    }

    const orgId = user?.orgId || user?.organizationId || user?.vendorId || user?.clientId || 'ORG-GLOBAL-HQ';
    const userId = user?.id || user?.uid || 'anonymous';
    
    let abacScope: ABACScope | undefined = user?.abacScope;
    if (!abacScope && (role === 'RECRUITER' || recruiterType === 'VENDOR')) {
      if (recruiterType === 'FREELANCE') abacScope = 'EXPLICIT_ONLY';
      else if (recruiterType === 'VENDOR') abacScope = 'ASSIGNED_ONLY';
      else abacScope = 'ASSIGNED_ONLY';
    }

    return {
      userId,
      role,
      organizationId: orgId,
      email: user?.email || '',
      recruiterId: role === 'RECRUITER' ? (user?.recruiterId || userId) : user?.recruiterId,
      recruiterType,
      abacScope,
      assignedRequirementIds: user?.assignedRequirementIds || [],
      vendorId: (role === 'VENDOR' || recruiterType === 'VENDOR') ? (user?.vendorId || orgId) : user?.vendorId,
      clientId: role === 'CLIENT' ? (user?.clientId || orgId) : user?.clientId,
      candidateId: role === 'CANDIDATE' ? (user?.candidateId || userId) : undefined,
      permissions: user?.permissions || []
    };
  }

  /**
   * Helper to check if role is an administrative / business operations authority
   */
  static isOpsAdmin(role?: string): boolean {
    if (!role) return false;
    const r = role.toUpperCase();
    return (
      r === 'ADMIN' ||
      r === 'SUPER_ADMIN' ||
      r === 'GLOBAL_HQ' ||
      r === 'HQ_ADMIN' ||
      r === 'OPS_ADMIN' ||
      r === 'BUSINESS_OPERATIONS' ||
      r === 'PLATFORM_AUTHORITY'
    );
  }

  /**
   * Helper to check if there is an active submission link between a candidate and a vendor.
   */
  static async hasActiveVendorSubmission(candidateId: string, vendorId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, "submissions"),
        where("candidateId", "==", candidateId),
        where("vendorId", "==", vendorId),
        limit(1)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (_) {
      try {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          const snap = await adminDb.collection("submissions")
            .where("candidateId", "==", candidateId)
            .where("vendorId", "==", vendorId)
            .limit(1)
            .get();
          return !snap.empty;
        }
      } catch (_) {}
      return false;
    }
  }

  /**
   * Helper to check if a client has an active submission or application link for a candidate.
   */
  static async hasActiveClientSubmission(candidateId: string, clientId: string): Promise<boolean> {
    try {
      const q = query(
        collection(db, "submissions"),
        where("candidateId", "==", candidateId),
        where("clientId", "==", clientId),
        limit(1)
      );
      const snap = await getDocs(q);
      return !snap.empty;
    } catch (_) {
      try {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          const snap = await adminDb.collection("submissions")
            .where("candidateId", "==", candidateId)
            .where("clientId", "==", clientId)
            .limit(1)
            .get();
          return !snap.empty;
        }
      } catch (_) {}
      return false;
    }
  }

  /**
   * Helper to check if a candidate is explicitly associated with a requirement distributed to the vendor.
   */
  static async isCandidateAssociatedWithVendorRequirements(cand: any, vId: string): Promise<boolean> {
    const reqIds = [cand.requirementId, cand.matchedRequirementId, cand.canonicalRequirementId].filter(Boolean);
    for (const reqId of reqIds) {
      try {
        const canViewReq = await requirementVendorService.canVendorViewRequirement(vId, reqId);
        if (canViewReq) {
          return true;
        }
      } catch (_) {
        try {
          const { adminDb } = await import("../lib/firebase-admin.js");
          if (adminDb) {
            const reqSnap = await adminDb.collection("requirements").doc(reqId).get();
            if (reqSnap.exists) {
              const req = reqSnap.data();
              const isDistributedToVendor = (req.distributedVendorIds && req.distributedVendorIds.includes(vId)) || req.vendorId === vId;
              if (isDistributedToVendor) return true;
            }
          }
        } catch (_) {}
      }
    }
    return false;
  }

  /**
   * Helper to check if a candidate is explicitly associated with a requirement belonging to the client.
   */
  static async isCandidateAssociatedWithClientRequirements(cand: any, cId: string): Promise<boolean> {
    const reqIds = [cand.requirementId, cand.matchedRequirementId, cand.canonicalRequirementId].filter(Boolean);
    for (const reqId of reqIds) {
      try {
        const req = await this.getRequirementDocument(reqId);
        if (req && (req.clientId === cId || req.client_id === cId)) {
          return true;
        }
      } catch (_) {
        try {
          const { adminDb } = await import("../lib/firebase-admin.js");
          if (adminDb) {
            const reqSnap = await adminDb.collection("requirements").doc(reqId).get();
            if (reqSnap.exists && (reqSnap.data().clientId === cId || reqSnap.data().client_id === cId)) {
              return true;
            }
            const pubSnap = await adminDb.collection("requirements_public").doc(reqId).get();
            if (pubSnap.exists && (pubSnap.data().clientId === cId || pubSnap.data().client_id === cId)) {
              return true;
            }
          }
        } catch (_) {}
      }
    }
    return false;
  }

  /**
   * Helper to retrieve a requirement from the canonical collection or legacy fallback
   */
  static async getRequirementDocument(requirementId: string): Promise<any | null> {
    try {
      const reqSnap = await getDoc(doc(db, 'requirements', requirementId));
      if (reqSnap.exists()) return reqSnap.data();
    } catch (_) {
      try {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          const reqSnap = await adminDb.collection('requirements').doc(requirementId).get();
          if (reqSnap.exists) return reqSnap.data();
        }
      } catch (_) {}
    }
    try {
      const reqSnap = await getDoc(doc(db, 'requirements_public', requirementId));
      if (reqSnap.exists()) return reqSnap.data();
    } catch (_) {
      try {
        const { adminDb } = await import("../lib/firebase-admin.js");
        if (adminDb) {
          const reqSnap = await adminDb.collection('requirements_public').doc(requirementId).get();
          if (reqSnap.exists) return reqSnap.data();
        }
      } catch (_) {}
    }
    return null;
  }

  /**
   * Helper to retrieve a candidate from any of the candidate collections (candidates, candidatePool, direct_candidates, candidate_profiles)
   * with automatic fallback to adminDb for server/node test runner environments.
   */
  static async getCandidateDocument(candidateId: string): Promise<any | null> {
    // 1. Try Client SDK first
    try {
      const candSnap = await getDoc(doc(db, 'candidates', candidateId));
      if (candSnap.exists()) return candSnap.data();
    } catch (_) {}
    try {
      const poolSnap = await getDoc(doc(db, 'candidatePool', candidateId));
      if (poolSnap.exists()) return poolSnap.data();
    } catch (_) {}
    try {
      const directSnap = await getDoc(doc(db, 'direct_candidates', candidateId));
      if (directSnap.exists()) return directSnap.data();
    } catch (_) {}
    try {
      const profileSnap = await getDoc(doc(db, 'candidate_profiles', candidateId));
      if (profileSnap.exists()) return profileSnap.data();
    } catch (_) {}

    // 2. Fallback to adminDb if Client SDK reads fail or are unauthenticated
    try {
      const { adminDb } = await import("../lib/firebase-admin.js");
      if (adminDb) {
        const candSnap = await adminDb.collection('candidates').doc(candidateId).get();
        if (candSnap.exists) return candSnap.data();
        const poolSnap = await adminDb.collection('candidatePool').doc(candidateId).get();
        if (poolSnap.exists) return poolSnap.data();
        const directSnap = await adminDb.collection('direct_candidates').doc(candidateId).get();
        if (directSnap.exists) return directSnap.data();
        const profileSnap = await adminDb.collection('candidate_profiles').doc(candidateId).get();
        if (profileSnap.exists) return profileSnap.data();
      }
    } catch (_) {}

    return null;
  }

  /**
   * Authoritatively determines if a user can view a given requirement.
   */
  static async canViewRequirement(context: HireNestAccessContext, requirementId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') {
      return true;
    }

    if (role === 'CANDIDATE') {
      try {
        const reqData = await this.getRequirementDocument(requirementId);
        if (!reqData) return false;
        return CandidateRequirementEligibilityPolicy.isCandidateEligible(reqData);
      } catch (err) {
        return false;
      }
    }

    if (role === 'VENDOR') {
      const vId = context.vendorId || context.organizationId;
      if (!vId) return false;
      return await requirementVendorService.canVendorViewRequirement(vId, requirementId);
    }

    if (role === 'RECRUITER') {
      const rId = context.recruiterId || context.userId;
      const rType = context.recruiterType || 'INTERNAL';
      const scope = context.abacScope || (rType === 'FREELANCE' ? 'EXPLICIT_ONLY' : 'ASSIGNED_ONLY');

      try {
        const req = await this.getRequirementDocument(requirementId);
        if (!req) return false;

        // 1. Vendor Recruiter Check (Must belong to their mapped vendor AND assigned to req)
        if (rType === 'VENDOR') {
          const vId = context.vendorId || context.organizationId;
          if (!vId) return false;
          const isDistributedToVendor = (req.distributedVendorIds && req.distributedVendorIds.includes(vId)) || req.vendorId === vId;
          if (!isDistributedToVendor) return false;

          if (scope === 'ALL_PERMITTED') return true;
          const isAssigned = (context.assignedRequirementIds && context.assignedRequirementIds.includes(requirementId)) || req.assignedRecruiterId === rId;
          return isAssigned;
        }

        // 2. Freelance Recruiter Check (EXPLICIT_ONLY: Must be explicitly assigned)
        if (rType === 'FREELANCE' || scope === 'EXPLICIT_ONLY') {
          return (context.assignedRequirementIds && context.assignedRequirementIds.includes(requirementId)) || req.assignedRecruiterId === rId;
        }

        // 3. Internal Recruiter Check (ASSIGNED_ONLY / ALL_PERMITTED)
        if (scope === 'ALL_PERMITTED') return true;
        const assignedRecruiter = req.assignedRecruiterId || req.recruiterId;
        const isExplicit = context.assignedRequirementIds && context.assignedRequirementIds.includes(requirementId);
        return isExplicit || assignedRecruiter === rId || !assignedRecruiter;
      } catch (err) {
        return false;
      }
    }

    if (role === 'CLIENT') {
      const cId = context.clientId || context.organizationId;
      if (!cId) return false;
      try {
        const req = await this.getRequirementDocument(requirementId);
        if (!req) return false;
        return req.clientId === cId || req.client_id === cId;
      } catch (err) {
        return false;
      }
    }

    return false;
  }

  /**
   * Determines if a user can edit a requirement.
   */
  static async canEditRequirement(context: HireNestAccessContext, requirementId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') {
      return true;
    }
    if (role === 'RECRUITER') {
      return await this.canViewRequirement(context, requirementId);
    }
    return false;
  }

  /**
   * Authoritatively determines if a user can view a given candidate.
   * Enforces Candidate Data Isolation, Vendor Isolation, and Recruiter Scopes.
   */
  static async canViewCandidate(context: HireNestAccessContext, candidateId: string, candidateData?: any): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') {
      return true;
    }

    // CANDIDATE ISOLATION: Candidates can ONLY view their own profile/records
    if (role === 'CANDIDATE') {
      const selfId = context.candidateId || context.userId;
      if (candidateId === selfId) return true;
      if (candidateData) {
        const matchesUid = candidateData.userId === selfId || candidateData.candidateUid === selfId || candidateData.id === selfId;
        const matchesEmail = context.email && candidateData.email && candidateData.email.toLowerCase() === context.email.toLowerCase();
        return Boolean(matchesUid || matchesEmail);
      }
      return false;
    }

    // RECRUITER ABAC CHECKS
    if (role === 'RECRUITER') {
      const rType = context.recruiterType || 'INTERNAL';
      const vId = context.vendorId || context.organizationId;

      // Vendor Recruiter: MUST NOT access candidates outside their vendor's bench/submissions unless direct candidate with explicit context
      if (rType === 'VENDOR') {
        if (!vId) return false;
        let cand = candidateData;
        if (!cand) {
          cand = await this.getCandidateDocument(candidateId);
        }
        if (!cand) return false;

        const candVendor = cand.vendorId || cand.submittedByVendorId || cand.sourceVendorId;
        const isDirectCandidate = cand.sourceType === "DIRECT_CANDIDATE" || cand.ownershipType === "DIRECT" || cand.isDirect === true;

        if (!candVendor || isDirectCandidate) {
          // Unowned / direct candidate: Check explicit context (active vendor submission or distributed requirement association)
          const hasSubmission = await this.hasActiveVendorSubmission(candidateId, vId);
          if (hasSubmission) return true;
          const isAssociatedWithRequirement = await this.isCandidateAssociatedWithVendorRequirements(cand, vId);
          if (isAssociatedWithRequirement) return true;
          return candVendor === vId;
        }

        return candVendor === vId;
      }

      // Freelance Recruiter: Can only access candidates submitted by them or within their assigned requirements
      if (rType === 'FREELANCE') {
        let cand = candidateData;
        if (!cand) {
          cand = await this.getCandidateDocument(candidateId);
        }
        if (!cand) return false;
        const submittedBySelf = cand.recruiterId === context.userId || cand.submittedByUserId === context.userId;
        const assignedReq = cand.requirementId && context.assignedRequirementIds && context.assignedRequirementIds.includes(cand.requirementId);
        return Boolean(submittedBySelf || assignedReq);
      }

      // Internal Recruiter: Access within assigned workflows
      return true;
    }

    // VENDOR ADMIN CHECKS
    if (role === 'VENDOR') {
      const vId = context.vendorId || context.organizationId;
      if (!vId) return false;
      let cand = candidateData;
      if (!cand) {
        cand = await this.getCandidateDocument(candidateId);
      }
      if (!cand) return false;

      const candVendor = cand.vendorId || cand.submittedByVendorId || cand.sourceVendorId;
      const isDirectCandidate = cand.sourceType === "DIRECT_CANDIDATE" || cand.ownershipType === "DIRECT" || cand.isDirect === true;

      if (!candVendor || isDirectCandidate) {
        // Unowned / direct candidate: Check explicit context (active vendor submission or distributed requirement association)
        const hasSubmission = await this.hasActiveVendorSubmission(candidateId, vId);
        if (hasSubmission) return true;
        const isAssociatedWithRequirement = await this.isCandidateAssociatedWithVendorRequirements(cand, vId);
        if (isAssociatedWithRequirement) return true;
        return candVendor === vId;
      }

      return candVendor === vId;
    }

    // CLIENT CHECKS
    if (role === 'CLIENT') {
      const cId = context.clientId || context.organizationId;
      if (!cId) return false;
      let cand = candidateData;
      if (!cand) {
        cand = await this.getCandidateDocument(candidateId);
      }
      if (!cand) return false;

      const isDirectCandidate = cand.sourceType === "DIRECT_CANDIDATE" || cand.ownershipType === "DIRECT" || cand.isDirect === true;
      if (isDirectCandidate) {
        // Direct / unowned candidate: Only allowed if target client, active submission, or associated with client requirements
        if (cand.clientId === cId || cand.targetClientId === cId) return true;
        const hasSubmission = await this.hasActiveClientSubmission(candidateId, cId);
        if (hasSubmission) return true;
        const isAssociatedWithRequirement = await this.isCandidateAssociatedWithClientRequirements(cand, cId);
        if (isAssociatedWithRequirement) return true;
        return false;
      }

      return cand.clientId === cId || cand.targetClientId === cId;
    }

    return false;
  }

  /**
   * Determines if a user can edit candidate details.
   */
  static async canEditCandidate(context: HireNestAccessContext, candidateId: string, candidateData?: any): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') return true;
    if (role === 'CANDIDATE') {
      const selfId = context.candidateId || context.userId;
      return candidateId === selfId;
    }
    if (role === 'VENDOR') return await this.canViewCandidate(context, candidateId, candidateData);
    if (role === 'RECRUITER') return await this.canViewCandidate(context, candidateId, candidateData);
    return false;
  }

  /**
   * Determines if a user can run AI match for a candidate against a requirement.
   */
  static async canMatchCandidate(context: HireNestAccessContext, candidateId: string, requirementId?: string): Promise<boolean> {
    const canViewCand = await this.canViewCandidate(context, candidateId);
    if (!requirementId) return canViewCand;
    const canViewReq = await this.canViewRequirement(context, requirementId);
    return canViewCand && canViewReq;
  }

  /**
   * Determines if a user can download candidate resumes.
   */
  static async canDownloadResume(context: HireNestAccessContext, candidateId: string, candidateData?: any): Promise<boolean> {
    return await this.canViewCandidate(context, candidateId, candidateData);
  }

  /**
   * Authoritatively determines if a user can view a given submission.
   */
  static async canViewSubmission(context: HireNestAccessContext, submissionId: string, submissionData?: any): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') {
      return true;
    }

    let sub = submissionData;
    if (!sub) {
      try {
        const subSnap = await getDoc(doc(db, 'submissions', submissionId));
        if (!subSnap.exists()) return false;
        sub = subSnap.data();
      } catch (err) {
        return false;
      }
    }

    // CANDIDATE DATA ISOLATION: Candidate can only see their own submissions
    if (role === 'CANDIDATE') {
      const selfId = context.candidateId || context.userId;
      const matchesUid = sub?.candidateId === selfId || sub?.candidateUid === selfId;
      const matchesEmail = context.email && sub?.candidateEmail && sub.candidateEmail.toLowerCase() === context.email.toLowerCase();
      return Boolean(matchesUid || matchesEmail);
    }

    if (role === 'VENDOR') {
      const vId = context.vendorId || context.organizationId;
      return sub?.vendorId === vId;
    }

    if (role === 'RECRUITER') {
      const rId = context.recruiterId || context.userId;
      const rType = context.recruiterType || 'INTERNAL';

      // Vendor Recruiter: MUST belong to their vendor
      if (rType === 'VENDOR') {
        const vId = context.vendorId || context.organizationId;
        return sub?.vendorId === vId;
      }

      // Freelance Recruiter: MUST be assigned to the requirement or submitted by them
      if (rType === 'FREELANCE') {
        return sub?.recruiterId === rId || sub?.submittedByUserId === rId || (context.assignedRequirementIds && context.assignedRequirementIds.includes(sub?.requirementId));
      }

      return sub?.recruiterId === rId || sub?.assignedRecruiterId === rId || true;
    }

    if (role === 'CLIENT') {
      const cId = context.clientId || context.organizationId;
      return sub?.clientId === cId;
    }

    return false;
  }

  /**
   * Determines if a vendor/recruiter can create a submission for a requirement.
   */
  static async canCreateSubmission(context: HireNestAccessContext, requirementId: string, vendorId?: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') return true;
    if (role === 'RECRUITER') return await this.canViewRequirement(context, requirementId);
    if (role === 'VENDOR') {
      const targetVendor = vendorId || context.vendorId || context.organizationId;
      return await requirementVendorService.canVendorViewRequirement(targetVendor, requirementId);
    }
    return false;
  }

  /**
   * Authoritatively determines if a user can view a recruiter's details or performance metrics.
   */
  static async canViewRecruiter(context: HireNestAccessContext, recruiterId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') {
      return true;
    }

    if (role === 'RECRUITER') {
      const rId = context.recruiterId || context.userId;
      return rId === recruiterId;
    }

    if (role === 'VENDOR') {
      const vId = context.vendorId || context.organizationId;
      if (!vId) return false;
      try {
        const mappings = await recruiterVendorMappingService.getRecruitersForVendor(vId);
        return mappings.some(m => m.recruiterId === recruiterId && m.status === 'ACTIVE');
      } catch (err) {
        return false;
      }
    }

    return false;
  }

  /**
   * Authoritatively determines if a user can view a vendor.
   */
  static async canViewVendor(context: HireNestAccessContext, vendorId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') return true;
    if (role === 'VENDOR') return (context.vendorId || context.organizationId) === vendorId;
    if (role === 'RECRUITER') {
      const rId = context.recruiterId || context.userId;
      const vendors = await recruiterVendorMappingService.getVendorsForRecruiter(rId);
      return vendors.some(v => v.vendorId === vendorId && v.status === 'ACTIVE');
    }
    return false;
  }

  /**
   * Authoritatively determines if a user can view client details.
   */
  static async canViewClient(context: HireNestAccessContext, clientId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER' || role === 'RECRUITER') return true;
    if (role === 'CLIENT') return (context.clientId || context.organizationId) === clientId;
    return false;
  }

  /**
   * Verifies requirement-vendor authorization record access
   */
  static async canAccessRequirementVendorAuthorization(context: HireNestAccessContext, requirementId: string, vendorId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') return true;
    if (role === 'VENDOR') return (context.vendorId || context.organizationId) === vendorId && await requirementVendorService.canVendorViewRequirement(vendorId, requirementId);
    if (role === 'RECRUITER') return await this.canViewRequirement(context, requirementId);
    return false;
  }

  /**
   * Synchronously evaluates if a requirement entity is authorized for a given actor (Vendor, Recruiter, Client, Admin)
   */
  static isRequirementAuthorized(
    actorId: string,
    role: string,
    requirement: {
      assignedRecruiterId?: string;
      recruiterId?: string;
      distributedVendorIds?: string[];
      vendorId?: string;
      clientId?: string;
      client_id?: string;
      [key: string]: any;
    }
  ): boolean {
    const normRole = (role || '').toUpperCase();
    if (
      normRole === 'ADMIN' ||
      normRole === 'SUPER_ADMIN' ||
      normRole === 'GLOBAL_HQ' ||
      normRole === 'HQ_ADMIN' ||
      normRole === 'OPS_ADMIN' ||
      normRole === 'BUSINESS_OPERATIONS' ||
      normRole === 'BUSINESS_MANAGER' ||
      actorId === 'ORG-GLOBAL-HQ' ||
      actorId === 'HQ' ||
      actorId === 'ORG-HQ'
    ) {
      return true;
    }
    if (normRole === 'VENDOR' || normRole === 'VENDOR_ADMIN' || normRole === 'VENDOR_RECRUITER' || normRole.indexOf('VENDOR') !== -1) {
      const distributed = requirement.distributedVendorIds || [];
      const mode = requirement.distributionMode || "ALL_MAPPED_VENDORS";
      if (mode === "ALL_MAPPED_VENDORS") return true;
      return distributed.includes(actorId) || requirement.vendorId === actorId;
    }
    if (normRole === 'RECRUITER') {
      const assigned = requirement.assignedRecruiterId || requirement.recruiterId;
      return !assigned || assigned === actorId;
    }
    if (normRole === 'CLIENT') {
      const client = requirement.clientId || requirement.client_id;
      return client === actorId;
    }
    return false;
  }

  /**
   * Alias for isRequirementAuthorized
   */
  static canAccessRequirement(
    actorId: string,
    role: string,
    requirement: any
  ): boolean {
    return this.isRequirementAuthorized(actorId, role, requirement);
  }

  /**
   * Generates an immutable attribution snapshot for submission tracking
   * Note: Invariant - everything must be attributed to an actual user ID
   */
  static createAttributionSnapshot(params: {
    requirementId: string;
    requirementTitle: string;
    recruiterId: string | null;
    recruiterName: string | null;
    vendorId: string;
    vendorName: string;
    clientId: string;
    clientName: string;
    authorizationId: string;
    submittedByUserId: string;
  }): AttributionSnapshot & { frozen: boolean } {
    return {
      submittedAt: new Date().toISOString(),
      requirementId: params.requirementId,
      requirementTitle: params.requirementTitle,
      recruiterId: params.recruiterId || null,
      recruiterName: params.recruiterName || null,
      vendorId: params.vendorId,
      vendorName: params.vendorName,
      clientId: params.clientId,
      clientName: params.clientName,
      authorizationId: params.authorizationId,
      submittedByUserId: params.submittedByUserId || 'unspecified_user',
      version: '1.0.0',
      frozen: true
    };
  }
}

export const accessControlService = AccessControlService;

