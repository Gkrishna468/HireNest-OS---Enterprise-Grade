import {
  SystemRole,
  UserType,
  RecruiterSubtype,
  RequirementScopeType,
  canUserPerformAction,
} from "../lib/rbac.js";

export interface HireNestAccessContext {
  uid: string;
  email: string;
  userType?: UserType;
  role: SystemRole;
  recruiterSubtype?: RecruiterSubtype;
  organizationId: string;
  vendorId?: string;
  clientId?: string;
  assignedRequirementIds?: string[];
  requirementScope?: RequirementScopeType;
  managedByVendorId?: string;
  permissions: string[];
  isAdminEquivalent: boolean;
  status: "ACTIVE" | "INACTIVE";
}

export class CoreAuthorizationError extends Error {
  public readonly code = "CORE_PERMISSION_DENIED";
  constructor(message: string, public readonly requiredPermission?: string, public readonly currentRole?: string) {
    super(message);
    this.name = "CoreAuthorizationError";
  }
}

export class CoreResourceNotFoundError extends Error {
  public readonly code = "CORE_RESOURCE_NOT_FOUND";
  constructor(resourceType: string, id: string) {
    super(`${resourceType} with ID '${id}' not found in HireNest Core.`);
    this.name = "CoreResourceNotFoundError";
  }
}

/**
 * Standard ABAC & Permission Enforcer for Core Services:
 * CAN(user, permission, resource) =
 *   RBAC permission
 * + user type
 * + recruiter subtype
 * + organization scope
 * + requirement assignment
 */
export function enforceCoreAccess(
  ctx: HireNestAccessContext,
  requiredPermission?: string,
  targetScope?: {
    organizationId?: string;
    vendorId?: string;
    clientId?: string;
    requirementId?: string;
    authorizedVendorIds?: string[];
    assignedRecruiterIds?: string[];
    distributionState?: string;
  }
): void {
  const check = canUserPerformAction(ctx, requiredPermission, targetScope);
  if (!check.allowed) {
    throw new CoreAuthorizationError(
      check.reason || "Access denied by HireNest ABAC policy engine.",
      requiredPermission,
      ctx.role
    );
  }
}

export type RequirementPayload = any;
export type CandidatePayload = any;
export type SubmissionPayload = any;
export type InterviewPayload = any;
export type OfferPayload = any;
export type PlacementPayload = any;

