import { requirementVendorService } from "./requirementVendorService";
import { recruiterVendorMappingService } from "./recruiterVendorMappingService";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface HireNestAccessContext {
  userId: string;
  role: 'ADMIN' | 'SUPER_ADMIN' | 'RECRUITER' | 'VENDOR' | 'CLIENT' | 'GLOBAL_HQ' | string;
  organizationId: string;
  recruiterId?: string;
  vendorId?: string;
  clientId?: string;
  permissions?: string[];
}

export type OperationalPermission =
  | 'VIEW'
  | 'MATCH'
  | 'DOWNLOAD_RESUME'
  | 'SUBMIT'
  | 'EDIT'
  | 'APPROVE'
  | 'MESSAGE';

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
 */
export class AccessControlService {
  /**
   * Helper to build a standardized HireNestAccessContext from raw user session objects
   */
  static buildAccessContext(user: any): HireNestAccessContext {
    const role = (user?.role || user?.userRole || 'RECRUITER').toUpperCase();
    const orgId = user?.orgId || user?.organizationId || user?.vendorId || user?.clientId || 'HQ';
    return {
      userId: user?.id || user?.uid || 'user-default',
      role,
      organizationId: orgId,
      recruiterId: role === 'RECRUITER' ? (user?.id || user?.recruiterId || 'recruiter-rahul') : user?.recruiterId,
      vendorId: role === 'VENDOR' ? orgId : user?.vendorId,
      clientId: role === 'CLIENT' ? orgId : user?.clientId,
      permissions: user?.permissions || []
    };
  }

  /**
   * Authoritatively determines if a user can view a given requirement.
   */
  static async canViewRequirement(context: HireNestAccessContext, requirementId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') {
      return true;
    }

    if (role === 'VENDOR') {
      const vId = context.vendorId || context.organizationId;
      if (!vId) return false;
      return await requirementVendorService.canVendorViewRequirement(vId, requirementId);
    }

    if (role === 'RECRUITER') {
      const rId = context.recruiterId || context.userId;
      if (!rId) return false;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const reqSnap = await getDoc(doc(db, 'requirements_public', requirementId));
        if (!reqSnap.exists()) return false;
        const req = reqSnap.data();
        const assignedRecruiter = req.assignedRecruiterId || req.recruiterId || 'recruiter-rahul';
        return assignedRecruiter === rId;
      } catch (err) {
        return false;
      }
    }

    if (role === 'CLIENT') {
      const cId = context.clientId || context.organizationId;
      if (!cId) return false;
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
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
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') {
      return true;
    }
    if (role === 'RECRUITER') {
      return await this.canViewRequirement(context, requirementId);
    }
    return false;
  }

  /**
   * Authoritatively determines if a user can view a given candidate.
   * Admin, Super Admin, and Recruiters can view all.
   * Vendors can view direct candidates or their own submitted/sourced candidates.
   */
  static async canViewCandidate(context: HireNestAccessContext, candidateId: string, candidateData?: any): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ' || role === 'HQ_ADMIN' || role === 'OPS_ADMIN') {
      return true;
    }

    if (role === 'RECRUITER') {
      return true; // Recruiters access candidates within assigned workflows
    }

    if (role === 'VENDOR') {
      const vId = context.vendorId || context.organizationId;
      if (candidateData) {
        if (!candidateData.vendorId || candidateData.vendorId === vId || candidateData.submittedByVendorId === vId || candidateData.sourceVendorId === vId || candidateData.sourceType === "DIRECT_CANDIDATE" || candidateData.isDirectCandidate) {
          return true;
        }
      }
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const candSnap = await getDoc(doc(db, 'candidates', candidateId));
        if (candSnap.exists()) {
          const cand = candSnap.data();
          return !cand.vendorId || cand.vendorId === vId || cand.submittedByVendorId === vId || cand.sourceVendorId === vId || cand.sourceType === "DIRECT_CANDIDATE" || cand.isDirectCandidate;
        }
        const poolSnap = await getDoc(doc(db, 'candidatePool', candidateId));
        if (poolSnap.exists()) {
          const poolCand = poolSnap.data();
          return !poolCand.vendorId || poolCand.vendorId === vId || poolCand.sourceType === "DIRECT_CANDIDATE" || poolCand.isDirectCandidate;
        }
        return true;
      } catch (err) {
        return true;
      }
    }

    if (role === 'CLIENT') {
      const cId = context.clientId || context.organizationId;
      if (!cId) return false;
      if (candidateData && (candidateData.clientId === cId || candidateData.targetClientId === cId)) {
        return true;
      }
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const candSnap = await getDoc(doc(db, 'candidates', candidateId));
        if (!candSnap.exists()) return true;
        const cand = candSnap.data();
        return cand.clientId === cId || cand.targetClientId === cId;
      } catch (err) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determines if a user can edit candidate details.
   */
  static async canEditCandidate(context: HireNestAccessContext, candidateId: string, candidateData?: any): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') return true;
    if (role === 'VENDOR') return await this.canViewCandidate(context, candidateId, candidateData);
    if (role === 'RECRUITER') return true;
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
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') {
      return true;
    }

    let sub = submissionData;
    if (!sub) {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const subSnap = await getDoc(doc(db, 'submissions', submissionId));
        if (!subSnap.exists()) return false;
        sub = subSnap.data();
      } catch (err) {
        return false;
      }
    }

    if (role === 'VENDOR') {
      const vId = context.vendorId || context.organizationId;
      return sub?.vendorId === vId;
    }

    if (role === 'RECRUITER') {
      const rId = context.recruiterId || context.userId;
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
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') return true;
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
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') {
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
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') return true;
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
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ' || role === 'RECRUITER') return true;
    if (role === 'CLIENT') return (context.clientId || context.organizationId) === clientId;
    return false;
  }

  /**
   * Verifies requirement-vendor authorization record access
   */
  static async canAccessRequirementVendorAuthorization(context: HireNestAccessContext, requirementId: string, vendorId: string): Promise<boolean> {
    const role = (context.role || '').toUpperCase();
    if (role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'GLOBAL_HQ') return true;
    if (role === 'VENDOR') return (context.vendorId || context.organizationId) === vendorId && await requirementVendorService.canVendorViewRequirement(vendorId, requirementId);
    if (role === 'RECRUITER') return await this.canViewRequirement(context, requirementId);
    return false;
  }

  /**
   * Synchronously evaluates if a requirement entity is authorized for a given actor (Vendor, Recruiter, Client, Admin)
   */
  static isRequirementAuthorized(
    actorId: string,
    role: 'ADMIN' | 'SUPER_ADMIN' | 'RECRUITER' | 'VENDOR' | 'CLIENT' | string,
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
    if (normRole === 'ADMIN' || normRole === 'SUPER_ADMIN' || normRole === 'GLOBAL_HQ' || normRole === 'HQ_ADMIN' || normRole === 'OPS_ADMIN' || actorId === 'ORG-GLOBAL-HQ' || actorId === 'HQ') {
      return true;
    }
    if (normRole === 'VENDOR') {
      const distributed = requirement.distributedVendorIds || [];
      return distributed.includes(actorId) || requirement.vendorId === actorId;
    }
    if (normRole === 'RECRUITER') {
      const assigned = requirement.assignedRecruiterId || requirement.recruiterId;
      return assigned === actorId;
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
    role: 'ADMIN' | 'SUPER_ADMIN' | 'RECRUITER' | 'VENDOR' | 'CLIENT' | string,
    requirement: any
  ): boolean {
    return this.isRequirementAuthorized(actorId, role, requirement);
  }

  /**
   * Generates an immutable attribution snapshot for submission tracking
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
    submittedByUserId?: string;
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
      submittedByUserId: params.submittedByUserId || params.vendorId || 'system',
      version: '1.0.0',
      frozen: true
    };
  }
}

export const accessControlService = AccessControlService;

