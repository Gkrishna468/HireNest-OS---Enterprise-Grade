export type UserType = "HQ" | "CLIENT" | "VENDOR" | "RECRUITER";

export type SystemRole =
  | "PLATFORM_AUTHORITY"
  | "BUSINESS_OPERATIONS"
  | "CLIENT_ADMIN"
  | "CLIENT_HM"
  | "CLIENT_FINANCE"
  | "VENDOR_ADMIN"
  | "RECRUITER"
  | "VENDOR_RECRUITER"; // Backward compatibility alias

export type RecruiterSubtype = "INTERNAL" | "VENDOR" | "FREELANCE";

export type RequirementScopeType = "ASSIGNED_ONLY" | "ALL_PERMITTED" | "EXPLICIT_ONLY";

export interface RoleDefinition {
  id: SystemRole;
  userType: UserType;
  aliases: string[];
  displayName: string;
  category: "GOVERNANCE" | "DEMAND" | "SUPPLY";
  isAdminEquivalent: boolean;
  scopeDescription: string;
  permissions: string[];
  description: string;
}

export interface RecruiterSubtypeDefinition {
  id: RecruiterSubtype;
  displayName: string;
  category: "SUPPLY" | "GOVERNANCE";
  organizationDefault: string;
  scopeDescription: string;
  description: string;
}

export const RECRUITER_SUBTYPES: Record<RecruiterSubtype, RecruiterSubtypeDefinition> = {
  INTERNAL: {
    id: "INTERNAL",
    displayName: "Internal Recruiter",
    category: "GOVERNANCE",
    organizationDefault: "HireNest Workforce HQ",
    scopeDescription: "Assigned & permitted requisitions across internal team",
    description: "Internal talent acquisition team member. Operates across requisitions assigned to HireNest recruiting.",
  },
  VENDOR: {
    id: "VENDOR",
    displayName: "Vendor Recruiter",
    category: "SUPPLY",
    organizationDefault: "Mapped Vendor Agency",
    scopeDescription: "Vendor Agency + Assigned requisitions",
    description: "Recruits within a partner vendor agency on requisitions distributed and assigned to that vendor.",
  },
  FREELANCE: {
    id: "FREELANCE",
    displayName: "Freelance Recruiter",
    category: "SUPPLY",
    organizationDefault: "HireNest / Freelance Network",
    scopeDescription: "Strictly explicitly assigned requisitions only",
    description: "Independent recruiter with isolated access limited exclusively to explicitly assigned job orders.",
  },
};

export const RECRUITER_PERMISSIONS: string[] = [
  "dashboard.read",
  "requirements.read",
  "candidates.read",
  "candidates.create",
  "candidates.update",
  "candidate360.read",
  "matching.read",
  "matching.run",
  "submissions.read",
  "submissions.create",
  "submissions.update",
  "interviews.read",
  "interviews.create",
  "offers.read",
  "placements.read",
  "performance.read",
];

export const ROLE_CATALOG: Record<SystemRole, RoleDefinition> = {
  PLATFORM_AUTHORITY: {
    id: "PLATFORM_AUTHORITY",
    userType: "HQ",
    aliases: ["super_admin", "platform_authority", "admin", "global_hq"],
    displayName: "Platform Authority (HQ)",
    category: "GOVERNANCE",
    isAdminEquivalent: true,
    scopeDescription: "Entire HireNest Workforce ecosystem",
    description: "Full system administration, security configurations, and global user management authority.",
    permissions: [
      "system.manage",
      "security.configure",
      "dashboard.read",
      "requirements.read",
      "requirements.create",
      "requirements.update",
      "requirements.publish",
      "requirements.delete",
      "clients.read",
      "clients.create",
      "clients.update",
      "vendors.read",
      "vendors.create",
      "vendors.update",
      "vendors.manage_recruiters",
      "candidates.read",
      "candidate360.read",
      "candidates.create",
      "candidates.update",
      "matching.read",
      "matching.run",
      "submissions.read",
      "submissions.create",
      "submissions.update",
      "interviews.read",
      "interviews.create",
      "interviews.update",
      "offers.read",
      "offers.create",
      "offers.update",
      "placements.read",
      "placements.create",
      "sla.manage",
      "budgets.manage",
      "performance.read",
      "users.read",
      "users.create",
      "users.update_role",
      "users.deactivate",
      "users.reactivate",
      "audit.read",
    ],
  },
  BUSINESS_OPERATIONS: {
    id: "BUSINESS_OPERATIONS",
    userType: "HQ",
    aliases: ["business_operations", "ops_admin", "hq_admin", "business_manager"],
    displayName: "Business Operations (HQ)",
    category: "GOVERNANCE",
    isAdminEquivalent: true,
    scopeDescription: "Entire operational staffing ecosystem",
    description: "End-to-end operational authority across requirements, clients, vendors, recruiters, matching, and lifecycle.",
    permissions: [
      "dashboard.read",
      "requirements.read",
      "requirements.create",
      "requirements.update",
      "requirements.publish",
      "clients.read",
      "clients.create",
      "clients.update",
      "vendors.read",
      "vendors.create",
      "vendors.manage_recruiters",
      "candidates.read",
      "candidate360.read",
      "candidates.create",
      "candidates.update",
      "matching.read",
      "matching.run",
      "submissions.read",
      "submissions.create",
      "submissions.update",
      "interviews.read",
      "interviews.create",
      "interviews.update",
      "offers.read",
      "offers.create",
      "placements.read",
      "placements.create",
      "sla.manage",
      "budgets.manage",
      "performance.read",
      "users.read",
      "users.create",
      "users.update_role",
      "users.deactivate",
      "audit.read",
    ],
  },
  CLIENT_ADMIN: {
    id: "CLIENT_ADMIN",
    userType: "CLIENT",
    aliases: ["client_admin", "client"],
    displayName: "Client Admin",
    category: "DEMAND",
    isAdminEquivalent: false,
    scopeDescription: "Own client organization workspace",
    description: "Manages organizational requisitions, reviews candidates, orchestrates interviews, and executes offers.",
    permissions: [
      "dashboard.read",
      "requirements.read",
      "requirements.create",
      "requirements.update",
      "candidates.read",
      "candidate360.read",
      "matching.read",
      "matching.run",
      "submissions.read",
      "submissions.create",
      "submissions.update",
      "interviews.read",
      "interviews.create",
      "interviews.update",
      "offers.read",
      "offers.create",
      "placements.read",
      "placements.create",
      "performance.read",
    ],
  },
  CLIENT_HM: {
    id: "CLIENT_HM",
    userType: "CLIENT",
    aliases: ["client_hm", "client_hiring_manager", "hiring_manager"],
    displayName: "Client Hiring Manager",
    category: "DEMAND",
    isAdminEquivalent: false,
    scopeDescription: "Assigned client job requisitions",
    description: "Reviews candidate submissions, evaluates AI match analysis, conducts interviews, and approves shortlists.",
    permissions: [
      "dashboard.read",
      "requirements.read",
      "candidates.read",
      "candidate360.read",
      "matching.read",
      "submissions.read",
      "interviews.read",
      "interviews.create",
      "interviews.update",
      "offers.read",
      "placements.read",
    ],
  },
  CLIENT_FINANCE: {
    id: "CLIENT_FINANCE",
    userType: "CLIENT",
    aliases: ["client_finance", "finance"],
    displayName: "Client Finance",
    category: "DEMAND",
    isAdminEquivalent: false,
    scopeDescription: "Own client commercial & budget workspace",
    description: "Supervises departmental hiring budgets, placement billing, commercial visibility, and rate cards.",
    permissions: [
      "dashboard.read",
      "requirements.read",
      "budgets.manage",
      "budgets.read",
      "commercials.read",
      "placements.read",
    ],
  },
  VENDOR_ADMIN: {
    id: "VENDOR_ADMIN",
    userType: "VENDOR",
    aliases: ["vendor_admin", "vendor"],
    displayName: "Vendor Admin",
    category: "SUPPLY",
    isAdminEquivalent: false,
    scopeDescription: "Own vendor agency workspace",
    description: "Oversees vendor bench, submits candidate profiles, tracks pipeline performance, and manages vendor recruiter seats.",
    permissions: [
      "dashboard.read",
      "requirements.read",
      "vendors.read",
      "vendors.update",
      "vendors.manage_recruiters",
      "candidates.read",
      "candidates.create",
      "candidates.update",
      "candidate360.read",
      "matching.read",
      "matching.run",
      "submissions.read",
      "submissions.create",
      "submissions.update",
      "interviews.read",
      "interviews.create",
      "offers.read",
      "placements.read",
      "performance.read",
      "users.create_recruiter",
      "users.deactivate_recruiter",
    ],
  },
  RECRUITER: {
    id: "RECRUITER",
    userType: "RECRUITER",
    aliases: ["recruiter", "internal_recruiter", "freelance_recruiter", "independent_recruiter", "freelance"],
    displayName: "Recruiter",
    category: "SUPPLY",
    isAdminEquivalent: false,
    scopeDescription: "ABAC scope determined by recruiter subtype (Internal, Vendor, Freelance)",
    description: "First-class role family with standard recruiter capabilities, bounded by subtype-specific access boundaries.",
    permissions: RECRUITER_PERMISSIONS,
  },
  VENDOR_RECRUITER: {
    id: "VENDOR_RECRUITER",
    userType: "RECRUITER",
    aliases: ["vendor_recruiter", "independent"],
    displayName: "Vendor Recruiter",
    category: "SUPPLY",
    isAdminEquivalent: false,
    scopeDescription: "Own mapped vendor organization",
    description: "Sources candidates, views Candidate 360 dossiers, runs matching against published client requirements, and submits candidates.",
    permissions: RECRUITER_PERMISSIONS,
  },
};

export const AUTHORITATIVE_ROLES: RoleDefinition[] = [
  ROLE_CATALOG.PLATFORM_AUTHORITY,
  ROLE_CATALOG.BUSINESS_OPERATIONS,
  ROLE_CATALOG.CLIENT_ADMIN,
  ROLE_CATALOG.CLIENT_HM,
  ROLE_CATALOG.CLIENT_FINANCE,
  ROLE_CATALOG.VENDOR_ADMIN,
  ROLE_CATALOG.RECRUITER,
];

/**
 * Returns available system roles for a given UserType.
 */
export function getRolesForUserType(userType: UserType): SystemRole[] {
  switch (userType) {
    case "HQ":
      return ["PLATFORM_AUTHORITY", "BUSINESS_OPERATIONS"];
    case "CLIENT":
      return ["CLIENT_ADMIN", "CLIENT_HM", "CLIENT_FINANCE"];
    case "VENDOR":
      return ["VENDOR_ADMIN"];
    case "RECRUITER":
      return ["RECRUITER"];
    default:
      return ["RECRUITER"];
  }
}

/**
 * Derives the UserType from a given SystemRole.
 */
export function getUserTypeForRole(rawRole?: string | null): UserType {
  const norm = normalizeRole(rawRole);
  if (norm === "PLATFORM_AUTHORITY" || norm === "BUSINESS_OPERATIONS") return "HQ";
  if (norm.startsWith("CLIENT_")) return "CLIENT";
  if (norm === "VENDOR_ADMIN") return "VENDOR";
  return "RECRUITER";
}

/**
 * Normalizes any role string or legacy alias into the standard SystemRole.
 */
export function normalizeRole(rawRole?: string | null): SystemRole {
  if (!rawRole) return "RECRUITER";
  const cleaned = rawRole.trim().toUpperCase().replace(/[\s-]/g, "_");

  if (cleaned in ROLE_CATALOG) {
    if (cleaned === "VENDOR_RECRUITER") return "RECRUITER";
    return cleaned as SystemRole;
  }

  const lower = rawRole.trim().toLowerCase();
  for (const roleDef of Object.values(ROLE_CATALOG)) {
    if (roleDef.aliases.includes(lower)) {
      return roleDef.id === "VENDOR_RECRUITER" ? "RECRUITER" : roleDef.id;
    }
  }

  if (lower.includes("super_admin") || lower.includes("platform_authority")) return "PLATFORM_AUTHORITY";
  if (lower.includes("business_operations") || lower.includes("ops_admin") || lower.includes("business_manager")) return "BUSINESS_OPERATIONS";
  if (lower.includes("client_hm") || lower.includes("hiring_manager")) return "CLIENT_HM";
  if (lower.includes("finance")) return "CLIENT_FINANCE";
  if (lower.includes("client")) return "CLIENT_ADMIN";
  if (lower.includes("vendor_admin")) return "VENDOR_ADMIN";
  if (lower.includes("recruiter") || lower.includes("vendor") || lower.includes("independent") || lower.includes("freelance")) {
    return "RECRUITER";
  }

  return "RECRUITER";
}

/**
 * Normalizes Recruiter Subtype from raw strings.
 */
export function normalizeRecruiterSubtype(
  rawSubtype?: string | null,
  rawRole?: string | null
): RecruiterSubtype {
  if (rawSubtype) {
    const cleaned = rawSubtype.trim().toUpperCase();
    if (cleaned === "INTERNAL" || cleaned === "VENDOR" || cleaned === "FREELANCE") {
      return cleaned as RecruiterSubtype;
    }
  }

  const roleLower = (rawRole || "").trim().toLowerCase();
  if (roleLower.includes("internal")) return "INTERNAL";
  if (roleLower.includes("freelance") || roleLower.includes("independent")) return "FREELANCE";
  return "VENDOR";
}

/**
 * Returns true if the role is an admin-equivalent role (Platform Authority or Business Operations HQ).
 * NEVER grants admin based on arbitrary organization ID strings.
 */
export function isRoleAdminEquivalent(rawRole?: string | null): boolean {
  const norm = normalizeRole(rawRole);
  return ROLE_CATALOG[norm]?.isAdminEquivalent || false;
}

/**
 * Retrieves the authoritative permissions for a given role.
 */
export function getPermissionsForRole(rawRole?: string | null): string[] {
  const norm = normalizeRole(rawRole);
  return ROLE_CATALOG[norm]?.permissions || RECRUITER_PERMISSIONS;
}

/**
 * Validates whether a given actor role can assign a target role.
 * Non-admin roles cannot assign Admin-Equivalent roles.
 */
export function canActorAssignRole(actorRole: string | null | undefined, targetRole: string): boolean {
  const isActorAdmin = isRoleAdminEquivalent(actorRole);
  const isTargetAdmin = isRoleAdminEquivalent(targetRole);

  const actorNorm = normalizeRole(actorRole);
  const targetNorm = normalizeRole(targetRole);

  if (actorNorm === "BUSINESS_OPERATIONS" && targetNorm === "PLATFORM_AUTHORITY") {
    return false;
  }

  if (isTargetAdmin && !isActorAdmin) {
    return false;
  }

  if (actorNorm === "VENDOR_ADMIN") {
    // Vendor Admin can only assign/create Vendor Recruiter seats
    return targetNorm === "RECRUITER" || targetNorm === "VENDOR_RECRUITER";
  }

  return isActorAdmin;
}

/**
 * Authoritative Access Evaluation:
 * CAN(user, permission, resource) =
 *   RBAC permission
 * + user type
 * + recruiter subtype
 * + organization scope
 * + requirement assignment
 */
export function canUserPerformAction(
  user: {
    uid: string;
    role: SystemRole | string;
    userType?: UserType;
    recruiterSubtype?: RecruiterSubtype;
    organizationId: string;
    vendorId?: string;
    clientId?: string;
    assignedRequirementIds?: string[];
    requirementScope?: RequirementScopeType;
    permissions: string[];
    isAdminEquivalent?: boolean;
    status: "ACTIVE" | "INACTIVE";
  },
  permission?: string,
  resource?: {
    organizationId?: string;
    vendorId?: string;
    clientId?: string;
    requirementId?: string;
    authorizedVendorIds?: string[];
    assignedRecruiterIds?: string[];
    distributionState?: string;
  }
 ): { allowed: boolean; reason?: string } {
  // 1. Account status check
  if (user.status === "INACTIVE") {
    return { allowed: false, reason: "User identity is inactive. Access revoked." };
  }

  const role = normalizeRole(user.role);

  // CRITICAL SECURITY ENFORCEMENT: system.manage and security.configure are strictly PLATFORM_AUTHORITY ONLY
  if (permission === "system.manage" || permission === "security.configure") {
    if (role !== "PLATFORM_AUTHORITY") {
      return {
        allowed: false,
        reason: `Administrative permission '${permission}' is strictly restricted to Platform Authority (PLATFORM_AUTHORITY).`,
      };
    }
  }

  const isAdmin = user.isAdminEquivalent ?? isRoleAdminEquivalent(role);
  const userType: UserType = user.userType || getUserTypeForRole(role);

  // 2. Permission check (HQ bypasses individual permission gates)
  if (permission && !isAdmin) {
    if (!user.permissions.includes(permission)) {
      return {
        allowed: false,
        reason: `Missing required permission: '${permission}' for role [${role}]`,
      };
    }
  }

  // 3. HQ Admin has universal global access
  if (isAdmin) {
    return { allowed: true };
  }

  // 4. Scope Boundaries by User Type & Recruiter Subtype
  if (resource) {
    // Client User Type
    if (userType === "CLIENT" || role.startsWith("CLIENT_")) {
      const userClient = user.clientId || user.organizationId;
      if (resource.clientId && resource.clientId !== userClient) {
        return {
          allowed: false,
          reason: `Cross-client boundary access denied. Target: ${resource.clientId}, User: ${userClient}`,
        };
      }
    }

    // Vendor Admin User Type
    if (userType === "VENDOR" || role === "VENDOR_ADMIN") {
      const userVendor = user.vendorId || user.organizationId;
      if (resource.vendorId && resource.vendorId !== userVendor) {
        return {
          allowed: false,
          reason: `Cross-vendor boundary access denied. Target: ${resource.vendorId}, User: ${userVendor}`,
        };
      }
    }

    // Recruiter User Type & Subtype evaluation
    if (userType === "RECRUITER" || role === "RECRUITER" || role === "VENDOR_RECRUITER") {
      const subtype = normalizeRecruiterSubtype(user.recruiterSubtype, role);

      if (subtype === "INTERNAL") {
        // Internal Recruiter: Assigned / permitted requirements across internal team
        if (resource.requirementId && user.requirementScope === "ASSIGNED_ONLY") {
          const isAssigned =
            (user.assignedRequirementIds && user.assignedRequirementIds.includes(resource.requirementId)) ||
            (resource.assignedRecruiterIds && resource.assignedRecruiterIds.includes(user.uid));
          if (!isAssigned) {
            return {
              allowed: false,
              reason: `Internal recruiter access restricted to assigned requirement: ${resource.requirementId}`,
            };
          }
        }
      } else if (subtype === "VENDOR") {
        // Vendor Recruiter: Vendor Org + Assigned Requirements
        const userVendor = user.vendorId || user.organizationId;
        if (resource.vendorId && resource.vendorId !== userVendor) {
          return {
            allowed: false,
            reason: `Vendor recruiter access denied outside mapped vendor: ${userVendor}`,
          };
        }

        if (resource.requirementId) {
          // If requirement specifies authorized vendors
          if (
            resource.authorizedVendorIds &&
            resource.authorizedVendorIds.length > 0 &&
            resource.distributionState !== "OPEN_ALL_VENDORS"
          ) {
            if (!resource.authorizedVendorIds.includes(userVendor)) {
              return {
                allowed: false,
                reason: `Requirement ${resource.requirementId} is not distributed to vendor ${userVendor}`,
              };
            }
          }

          if (user.requirementScope === "ASSIGNED_ONLY" && user.assignedRequirementIds?.length) {
            if (!user.assignedRequirementIds.includes(resource.requirementId)) {
              return {
                allowed: false,
                reason: `Requirement ${resource.requirementId} is not assigned to this recruiter seat.`,
              };
            }
          }
        }
      } else if (subtype === "FREELANCE") {
        // Freelance Recruiter: Strictly Explicitly Assigned Requirements Only
        if (resource.requirementId) {
          const isAssigned =
            (user.assignedRequirementIds && user.assignedRequirementIds.includes(resource.requirementId)) ||
            (resource.assignedRecruiterIds && resource.assignedRecruiterIds.includes(user.uid));
          if (!isAssigned) {
            return {
              allowed: false,
              reason: `Freelance recruiter access strictly limited to explicitly assigned requirements. Missing assignment for ${resource.requirementId}`,
            };
          }
        } else if (resource.vendorId && resource.vendorId !== "ORG-FREELANCE-NETWORK") {
          return {
            allowed: false,
            reason: "Freelance recruiter cannot access broader vendor agency databases.",
          };
        }
      }
    }
  }

  return { allowed: true };
}

