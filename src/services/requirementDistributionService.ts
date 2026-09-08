import { requirementVendorService } from "./requirementVendorService";
import { recruiterVendorMappingService } from "./recruiterVendorMappingService";

/**
 * Requirement Distribution Service Engine
 * Manages the publication lifecycle and distribution of requirements from HQ -> Recruiters -> Vendors.
 */
export class RequirementDistributionService {
  /**
   * Publish a requirement and automatically distribute to mapped active vendors
   */
  static async publishRequirement(requirementId: string, reqData?: any) {
    return await requirementVendorService.syncRequirementVendorAuthorization(requirementId, reqData);
  }

  /**
   * Unpublish or revoke vendor access for a requirement
   */
  static async unpublishRequirement(requirementId: string) {
    return await requirementVendorService.syncRequirementVendorAuthorization(requirementId, { status: "CLOSED" });
  }

  /**
   * Synchronize a requirement's vendor authorizations when recruiter assignment changes
   */
  static async syncRequirementToRecruiterVendors(requirementId: string, newRecruiterId: string, reqData?: any) {
    return await requirementVendorService.syncRequirementVendorAuthorization(requirementId, {
      ...reqData,
      assignedRecruiterId: newRecruiterId,
      status: reqData?.status || "ACTIVE"
    });
  }

  /**
   * Resync all requirements when a recruiter <-> vendor relationship changes
   */
  static async resyncAllRequirementsForRecruiter(recruiterId: string) {
    return await requirementVendorService.syncAllActiveRequirementsToMappedVendors();
  }

  /**
   * Authoritative check if vendor can view a requirement
   */
  static async canVendorViewRequirement(vendorId: string, requirementId: string) {
    return await requirementVendorService.canVendorViewRequirement(vendorId, requirementId);
  }

  /**
   * Get sanitized 360 requirement view for vendor
   */
  static async getRequirement360ForVendor(vendorId: string, requirementId: string) {
    return await requirementVendorService.getRequirement360ForVendor(vendorId, requirementId);
  }
}

export const requirementDistributionService = RequirementDistributionService;
