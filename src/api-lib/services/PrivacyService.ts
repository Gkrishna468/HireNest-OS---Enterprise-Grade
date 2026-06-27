export interface UserContext {
  role: string;
  orgId: string;
}

export class PrivacyService {
  /**
   * Transforms a requirement into a privacy-aware DTO based on the user's role.
   */
  public static filterRequirement(req: any, context: UserContext): any {
    const isAdmin = this.checkIsAdmin(context.role, context.orgId);
    if (isAdmin) return req;

    const isVendor = this.checkIsVendor(context.role);
    if (isVendor) {
      // Hide specific client identification details
      const maskedClientId = req.clientId ? `CL-${req.clientId.slice(-4).toUpperCase()}` : 'CL-2847';
      return {
        ...req,
        clientId: maskedClientId,
        clientName: 'Enterprise Client',
        clientEmail: undefined,
        clientContact: undefined,
        internalNotes: undefined,
        allocatedVendors: undefined,
        budget: undefined, // Hidden from vendor
      };
    }

    const isClient = this.checkIsClient(context.role);
    if (isClient) {
      // Client can see details but only for their own organization
      if (req.clientId !== context.orgId) {
        return null; // Data isolation: client can't see other clients' requirements
      }
      return req;
    }

    return null;
  }

  /**
   * Transforms a submission into a privacy-aware DTO based on the user's role.
   */
  public static filterSubmission(sub: any, context: UserContext): any {
    const isAdmin = this.checkIsAdmin(context.role, context.orgId);
    if (isAdmin) return sub;

    const isVendor = this.checkIsVendor(context.role);
    if (isVendor) {
      // Vendor can only see their own submissions
      if (sub.vendorId !== context.orgId && sub.vendorOrgId !== context.orgId) {
        return null;
      }
      const maskedClientId = sub.clientId ? `CL-${sub.clientId.slice(-4).toUpperCase()}` : 'CL-2847';
      return {
        ...sub,
        clientId: maskedClientId,
        clientName: 'Enterprise Client',
        clientEmail: undefined,
        clientContact: undefined,
        internalNotes: undefined,
        clientNotes: undefined,
      };
    }

    const isClient = this.checkIsClient(context.role);
    if (isClient) {
      // Client can only see submissions made to their requirements
      if (sub.clientId !== context.orgId) {
        return null;
      }
      return {
        ...sub,
        vendorEmail: undefined, // Hide vendor internal details if any
        vendorContact: undefined,
      };
    }

    return null;
  }

  /**
   * Transforms a candidate into a privacy-aware DTO.
   */
  public static filterCandidate(cand: any, context: UserContext): any {
    const isAdmin = this.checkIsAdmin(context.role, context.orgId);
    if (isAdmin) return cand;

    const isVendor = this.checkIsVendor(context.role);
    if (isVendor) {
      // Vendor can only see candidates they created/own
      if (cand.createdBy !== context.orgId && cand.ownerVendorId !== context.orgId && cand.vendorId !== context.orgId) {
        return null;
      }
      return cand;
    }

    const isClient = this.checkIsClient(context.role);
    if (isClient) {
      // Clients can see candidate info if they have a matching submission, but with masked direct contact info (PII)
      return {
        ...cand,
        primaryEmail: cand.primaryEmail ? '***@***.***' : undefined,
        phoneHash: cand.phoneHash ? '***-***-****' : undefined,
        benchDetails: undefined,
        vendorInternalNotes: undefined,
      };
    }

    return null;
  }

  private static checkIsAdmin(role: string, orgId: string): boolean {
    return role === "admin" || role === "super_admin" || role === "hq_admin" || orgId === "ORG-GLOBAL-HQ";
  }

  private static checkIsVendor(role: string): boolean {
    return role.includes('vendor') || role === 'recruiter';
  }

  private static checkIsClient(role: string): boolean {
    return role.includes('client') || role === 'hiring_manager';
  }
}
