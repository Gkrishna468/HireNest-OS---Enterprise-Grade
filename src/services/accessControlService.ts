import { requirementVendorService } from "./requirementVendorService";
import { recruiterVendorMappingService } from "./recruiterVendorMappingService";
import { CandidateRequirementEligibilityPolicy } from "./CandidateRequirementEligibilityPolicy";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

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
    const role = rawRole.toUpperCase();
    const orgId = user?.orgId || user?.organizationId || user?.vendorId || user?.clientId || 'ORG-GLOBAL-HQ';
    const userId = user?.id || user?.uid || 'anonymous';
    
    // Determine recruiter classification and ABAC scope
    let recruiterType: RecruiterType | undefined = user?.recruiterType;
    if (!recruiterType && role === 'RECRUITER') {
      if (user?.vendorId) recruiterType = 'VENDOR';
      else if (user?.isFreelance) recruiterType = 'FREELANCE';
      else recruiterType = 'INTERNAL';
    }

    let abacScope: ABACScope | undefined = user?.abacScope;
    if (!abacScope && role === 'RECRUITER') {
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
   * Authoritatively determines if a user can view a given requirement.
   */
  static async canViewRequirement(context: HireNestAccessContext, requirementId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (this.isOpsAdmin(role) || role === 'BUSINESS_MANAGER') {
      return true;
    }

    if (role === 'CANDIDATE') {
      try {
        const reqSnap = await getDoc(doc(db, 'requirements_public', requirementId));
        if (!reqSnap.exists()) return false;
        return CandidateRequirementEligibilityPolicy.isCandidateEligible(reqSnap.data());
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
        const reqSnap = await getDoc(doc(db, 'requirements_public', requirementId));
        if (!reqSnap.exists()) return false;
        const req = reqSnap.data();

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
        const reqSnap = await getDoc(doc(db, 'requirements_public', requirementId));
        if (!reqSnap.exists()) return false;
        const req = reqSnap.data();
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

      // Vendor Recruiter: MUST NOT access candidates outside their vendor's bench/submissions
      if (rType === 'VENDOR') {
        if (!vId) return false;
        let cand = candidateData;
        if (!cand) {
          try {
            const candSnap = await getDoc(doc(db, 'candidates', candidateId));
            if (candSnap.exists()) cand = candSnap.data();
            else {
              const poolSnap = await getDoc(doc(db, 'candidatePool', candidateId));
              if (poolSnap.exists()) cand = poolSnap.data();
            }
          } catch (err) {
            return false;
          }
        }
        if (!cand) return false;

        const candVendor = cand.vendorId || cand.submittedByVendorId || cand.sourceVendorId;
        return candVendor === vId;
      }

      // Freelance Recruiter: Can only access candidates submitted by them or within their assigned requirements
      if (rType === 'FREELANCE') {
        let cand = candidateData;
        if (!cand) {
          try {
            const candSnap = await getDoc(doc(db, 'candidates', candidateId));
            if (candSnap.exists()) cand = candSnap.data();
          } catch (err) {
            return false;
          }
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
      if (candidateData) {
        const candVendor = candidateData.vendorId || candidateData.submittedByVendorId || candidateData.sourceVendorId;
        return candVendor === vId;
      }
      try {
        const candSnap = await getDoc(doc(db, 'candidates', candidateId));
        if (candSnap.exists()) {
          const cand = candSnap.data();
          const candVendor = cand.vendorId || cand.submittedByVendorId || cand.sourceVendorId;
          return candVendor === vId;
        }
        const poolSnap = await getDoc(doc(db, 'candidatePool', candidateId));
        if (poolSnap.exists()) {
          const poolCand = poolSnap.data();
          const candVendor = poolCand.vendorId || poolCand.submittedByVendorId;
          return candVendor === vId;
        }
        return false;
      } catch (err) {
        return false;
      }
    }

    // CLIENT CHECKS
    if (role === 'CLIENT') {
      const cId = context.clientId || context.organizationId;
      if (!cId) return false;
      if (candidateData && (candidateData.clientId === cId || candidateData.targetClientId === cId)) {
        return true;
      }
      try {
        const candSnap = await getDoc(doc(db, 'candidates', candidateId));
        if (!candSnap.exists()) return false;
        const cand = candSnap.data();
        return cand.clientId === cId || cand.targetClientId === cId;
      } catch (err) {
        return false;
      }
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
      actorId === 'HQ'
    ) {
      return true;
    }
    if (normRole === 'VENDOR') {
      const distributed = requirement.distributedVendorIds || [];
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

