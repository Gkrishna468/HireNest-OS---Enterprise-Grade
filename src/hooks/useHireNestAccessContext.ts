import { useMemo } from "react";
import { useSystemStore } from "../stores/SystemStore.js";
import { HireNestAccessContext } from "../core/types.js";
import { normalizeRole, isRoleAdminEquivalent, getPermissionsForRole } from "../lib/rbac.js";

export function useHireNestAccessContext(): HireNestAccessContext | null {
  const { user, userData } = useSystemStore();

  return useMemo(() => {
    if (!user) return null;

    const rawRole = userData?.role || "VENDOR_RECRUITER";
    const role = normalizeRole(rawRole);
    const isAdminEquivalent = isRoleAdminEquivalent(role);
    const permissions = getPermissionsForRole(role);

    const organizationId = userData?.organizationId || userData?.orgId || (isAdminEquivalent ? "ORG-GLOBAL-HQ" : "ORG-DEFAULT");
    const vendorId = userData?.vendorId || (role.startsWith("VENDOR_") ? organizationId : undefined);
    const clientId = userData?.clientId || (role.startsWith("CLIENT_") ? organizationId : undefined);
    const managedByVendorId = userData?.managedByVendorId;

    return {
      uid: user.uid,
      email: user.email || "",
      role,
      organizationId,
      vendorId,
      clientId,
      managedByVendorId,
      permissions,
      isAdminEquivalent,
      status: userData?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    };
  }, [user, userData]);
}
