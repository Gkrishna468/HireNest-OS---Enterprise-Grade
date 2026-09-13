export type SystemRole =
  | "PLATFORM_AUTHORITY"
  | "BUSINESS_OPERATIONS"
  | "CLIENT_ADMIN"
  | "CLIENT_HM"
  | "CLIENT_FINANCE"
  | "VENDOR_ADMIN"
  | "VENDOR_RECRUITER";

export interface RoleDefinition {
  id: SystemRole;
  aliases: string[];
  displayName: string;
  category: "GOVERNANCE" | "DEMAND" | "SUPPLY";
  isAdminEquivalent: boolean;
  scopeDescription: string;
  permissions: string[];
  description: string;
}

export const ROLE_CATALOG: Record<SystemRole, RoleDefinition> = {
  PLATFORM_AUTHORITY: {
    id: "PLATFORM_AUTHORITY",
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
      "audit.read",
    ],
  },
  BUSINESS_OPERATIONS: {
    id: "BUSINESS_OPERATIONS",
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
      "performance.read",
    ],
  },
  CLIENT_HM: {
    id: "CLIENT_HM",
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
      "commercials.read",
      "performance.read",
      "placements.read",
      "offers.read",
    ],
  },
  VENDOR_ADMIN: {
    id: "VENDOR_ADMIN",
    aliases: ["vendor_admin", "vendor"],
    displayName: "Vendor Admin",
    category: "SUPPLY",
    isAdminEquivalent: false,
    scopeDescription: "Own vendor agency workspace",
    description: "Oversees vendor bench, submits candidate profiles, tracks pipeline performance, and manages vendor recruiter seats.",
    permissions: [
      "dashboard.read",
      "requirements.read",
      "vendors.manage_recruiters",
      "candidates.read",
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
  VENDOR_RECRUITER: {
    id: "VENDOR_RECRUITER",
    aliases: ["vendor_recruiter", "recruiter", "independent"],
    displayName: "Vendor Recruiter",
    category: "SUPPLY",
    isAdminEquivalent: false,
    scopeDescription: "Own mapped vendor organization",
    description: "Sources candidates, views Candidate 360 dossiers, runs matching against published client requirements, and submits candidates.",
    permissions: [
      "dashboard.read",
      "requirements.read",
      "candidates.read",
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
    ],
  },
};

export const AUTHORITATIVE_ROLES: RoleDefinition[] = Object.values(ROLE_CATALOG);

/**
 * Normalizes any role string or legacy alias into the standard SystemRole.
 */
export function normalizeRole(rawRole?: string | null): SystemRole {
  if (!rawRole) return "VENDOR_RECRUITER";
  const cleaned = rawRole.trim().toUpperCase().replace(/[\s-]/g, "_");

  if (cleaned in ROLE_CATALOG) {
    return cleaned as SystemRole;
  }

  const lower = rawRole.trim().toLowerCase();
  for (const roleDef of AUTHORITATIVE_ROLES) {
    if (roleDef.aliases.includes(lower)) {
      return roleDef.id;
    }
  }

  if (lower.includes("super_admin") || lower.includes("platform_authority")) return "PLATFORM_AUTHORITY";
  if (lower.includes("business_operations") || lower.includes("ops_admin") || lower.includes("business_manager")) return "BUSINESS_OPERATIONS";
  if (lower.includes("client_hm") || lower.includes("hiring_manager")) return "CLIENT_HM";
  if (lower.includes("finance")) return "CLIENT_FINANCE";
  if (lower.includes("client")) return "CLIENT_ADMIN";
  if (lower.includes("vendor_admin")) return "VENDOR_ADMIN";
  if (lower.includes("recruiter") || lower.includes("vendor") || lower.includes("independent")) return "VENDOR_RECRUITER";

  return "VENDOR_RECRUITER";
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
  return ROLE_CATALOG[norm]?.permissions || [];
}

/**
 * Validates whether a given actor role can assign a target role.
 * Non-admin roles cannot assign Admin-Equivalent roles.
 */
export function canActorAssignRole(actorRole: string | null | undefined, targetRole: string): boolean {
  const isActorAdmin = isRoleAdminEquivalent(actorRole);
  const isTargetAdmin = isRoleAdminEquivalent(targetRole);

  if (isTargetAdmin && !isActorAdmin) {
    return false;
  }

  const actorNorm = normalizeRole(actorRole);
  if (actorNorm === "VENDOR_ADMIN") {
    // Vendor Admin can only assign/create Vendor Recruiter seats
    return normalizeRole(targetRole) === "VENDOR_RECRUITER";
  }

  return isActorAdmin;
}
