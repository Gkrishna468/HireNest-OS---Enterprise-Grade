import React, { useState, useEffect } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import {
  ShieldAlert,
  ShieldCheck,
  Check,
  Lock,
  Clock,
  UserPlus,
  RefreshCw,
  Building,
  UserCheck,
  AlertCircle,
  Eye,
  KeyRound,
  ShieldX,
  Sparkles,
} from "lucide-react";
import { useSystemStore } from "../stores/SystemStore";
import {
  AUTHORITATIVE_ROLES,
  ROLE_CATALOG,
  getPermissionsForRole,
  isRoleAdminEquivalent,
  normalizeRole,
  SystemRole,
} from "../lib/rbac";

export default function AdminUsersManager({ orgData }: { orgData: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "GOVERNANCE" | "DEMAND" | "SUPPLY" | "PERMISSIONS">("ALL");

  // Form state for creating user
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SystemRole>("CLIENT_ADMIN");
  const [companyName, setCompanyName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [userToChangeRole, setUserToChangeRole] = useState<any | null>(null);
  const [newRoleForChange, setNewRoleForChange] = useState<SystemRole>("VENDOR_RECRUITER");
  const [newVendorIdForChange, setNewVendorIdForChange] = useState("");
  const [userToDeactivate, setUserToDeactivate] = useState<any | null>(null);

  const activeActorRole = normalizeRole(orgData?.role || (auth.currentUser as any)?.role);
  const isActorAdmin = isRoleAdminEquivalent(activeActorRole);

  const fetchUsersAndOrgs = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      // 1. Try fetching via authoritative backend endpoint
      const res = await fetch("/api/user-admin?action=list", {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      } else {
        // Fallback to direct Firestore query
        const [userSnap, orgSnap] = await Promise.all([
          getDocs(query(collection(db, "users"), limit(100))),
          getDocs(query(collection(db, "organizations"), limit(100))),
        ]);

        const orgs = orgSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        setOrganizations(orgs);

        const loadedUsers = userSnap.docs.map((d) => {
          const u = d.data() as any;
          const roleNorm = normalizeRole(u.role);
          const roleDef = ROLE_CATALOG[roleNorm];
          const org = orgs.find((o) => o.id === u.organizationId || o.id === u.vendorId);
          return {
            id: d.id,
            uid: u.uid || d.id,
            email: u.email || "",
            displayName: u.displayName || u.name || u.email?.split("@")[0] || "User",
            role: roleNorm,
            roleDisplayName: roleDef?.displayName || roleNorm,
            category: roleDef?.category || "GOVERNANCE",
            isAdminEquivalent: roleDef?.isAdminEquivalent || false,
            permissions: u.permissions || getPermissionsForRole(roleNorm),
            organizationId: u.organizationId || "",
            vendorId: u.vendorId || (roleNorm === "VENDOR_RECRUITER" ? u.organizationId : undefined),
            managedByVendorId: u.managedByVendorId || u.vendorId || "",
            org,
            status: u.status || (u.disabled ? "INACTIVE" : "ACTIVE"),
            disabled: u.disabled || u.status === "INACTIVE",
            createdByUserId: u.createdByUserId || "",
            createdByEmail: u.createdByEmail || "",
            createdAt: u.createdAt || "",
            updatedAt: u.updatedAt || "",
            deactivatedAt: u.deactivatedAt || "",
            deactivatedBy: u.deactivatedBy || "",
          };
        });

        setUsers(loadedUsers);
      }

      // Also ensure organizations are populated
      const orgSnap = await getDocs(query(collection(db, "organizations"), limit(100)));
      setOrganizations(orgSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any));
    } catch (err: any) {
      console.error("[AdminUsersManager] Fetch failed:", err);
      setError(`Failed to load identity matrix: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndOrgs();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      if (password.length < 6) {
        throw new Error("Password must be at least 6 characters.");
      }

      if (role === "VENDOR_RECRUITER" && !selectedOrgId) {
        throw new Error("Vendor Recruiter must be mapped to a Vendor Organization.");
      }

      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          email,
          password,
          role,
          companyName: companyName || (role.includes("VENDOR") ? "Vendor Agency" : "Client Organization"),
          organizationId: selectedOrgId || undefined,
          vendorId: role === "VENDOR_RECRUITER" ? selectedOrgId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user identity.");
      }

      setSuccessMsg(`User ${email} successfully provisioned with role [${ROLE_CATALOG[role].displayName}].`);
      setEmail("");
      setPassword("");
      setCompanyName("");
      setSelectedOrgId("");
      await fetchUsersAndOrgs();
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveRoleChange = async () => {
    if (!userToChangeRole) return;
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      if (newRoleForChange === "VENDOR_RECRUITER" && !newVendorIdForChange && !userToChangeRole.vendorId) {
        throw new Error("Vendor Recruiter must have an assigned Vendor Organization.");
      }

      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/assign-role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          uid: userToChangeRole.uid || userToChangeRole.id,
          role: newRoleForChange,
          organizationId: newRoleForChange === "VENDOR_RECRUITER" ? (newVendorIdForChange || userToChangeRole.organizationId) : userToChangeRole.organizationId,
          vendorId: newRoleForChange === "VENDOR_RECRUITER" ? (newVendorIdForChange || userToChangeRole.vendorId) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role.");
      }

      setSuccessMsg(`Role for ${userToChangeRole.email} updated to [${ROLE_CATALOG[newRoleForChange].displayName}].`);
      setUserToChangeRole(null);
      if (selectedUserDetail && (selectedUserDetail.uid === userToChangeRole.uid || selectedUserDetail.id === userToChangeRole.id)) {
        setSelectedUserDetail(null);
      }
      await fetchUsersAndOrgs();
    } catch (err: any) {
      setError(err.message || "Failed to assign role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDeactivate = async () => {
    if (!userToDeactivate) return;
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/deactivate-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          uid: userToDeactivate.uid || userToDeactivate.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to deactivate user.");
      }

      setSuccessMsg(`Identity for ${userToDeactivate.email} deactivated. Historical business records and ledger preserved.`);
      setUserToDeactivate(null);
      if (selectedUserDetail && (selectedUserDetail.uid === userToDeactivate.uid || selectedUserDetail.id === userToDeactivate.id)) {
        setSelectedUserDetail(null);
      }
      await fetchUsersAndOrgs();
    } catch (err: any) {
      setError(err.message || "Failed to deactivate user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (activeTab === "ALL") return true;
    return u.category === activeTab;
  });

  const vendorOrgs = organizations.filter((o) => o.type === "vendor" || o.id?.startsWith("ORG-V"));
  const clientOrgs = organizations.filter((o) => o.type === "client" || o.id?.startsWith("ORG-C"));

  if (!isActorAdmin) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 text-center">
          <ShieldX className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-sm text-red-700">
            User administration is restricted to <strong>Platform Authority (HQ)</strong> and <strong>Business Operations (HQ)</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">HireNest Workforce Identity & Access</h1>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider">
              SSOT Enforced
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Authoritative 7-Role RBAC model with vendor-recruiter hierarchy, creator attribution, and non-destructive deactivation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchUsersAndOrgs}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl text-xs font-bold border-slate-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
          <AlertCircle size={18} className="text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium">
          <ShieldCheck size={18} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Onboard New User Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Provision User Identity</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">User Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Initial Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Authoritative Role</label>
                <select
                  value={role}
                  onChange={(e) => {
                    const newR = e.target.value as SystemRole;
                    setRole(newR);
                    setSelectedOrgId("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-semibold outline-none transition-all"
                >
                  <optgroup label="Governance (HQ)">
                    <option value="PLATFORM_AUTHORITY">Platform Authority (HQ)</option>
                    <option value="BUSINESS_OPERATIONS">Business Operations (HQ)</option>
                  </optgroup>
                  <optgroup label="Demand (Clients)">
                    <option value="CLIENT_ADMIN">Client Admin</option>
                    <option value="CLIENT_HM">Client Hiring Manager</option>
                    <option value="CLIENT_FINANCE">Client Finance</option>
                  </optgroup>
                  <optgroup label="Supply (Vendors)">
                    <option value="VENDOR_ADMIN">Vendor Admin</option>
                    <option value="VENDOR_RECRUITER">Vendor Recruiter</option>
                  </optgroup>
                </select>
              </div>

              {/* Hierarchy enforcement: Vendor Recruiter requires mapped Vendor Org */}
              {role === "VENDOR_RECRUITER" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mapped Vendor Organization <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                  >
                    <option value="">Select Vendor Agency...</option>
                    {vendorOrgs.map((vo) => (
                      <option key={vo.id} value={vo.id}>
                        {vo.companyName || vo.name || vo.id} ({vo.id})
                      </option>
                    ))}
                    {vendorOrgs.length === 0 && <option value="ORG-VENDOR-DEFAULT">Default Vendor Agency (ORG-VENDOR-DEFAULT)</option>}
                  </select>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Recruiters must be strictly mapped under a parent Vendor entity.
                  </p>
                </div>
              ) : role.startsWith("CLIENT") ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Client Organization (Optional)
                  </label>
                  <select
                    value={selectedOrgId}
                    onChange={(e) => setSelectedOrgId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                  >
                    <option value="">Auto-create or pick client...</option>
                    {clientOrgs.map((co) => (
                      <option key={co.id} value={co.id}>
                        {co.companyName || co.name || co.id}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Company / Entity Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Staffing / Enterprise Corp"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                />
              </div>

              {/* Real-time Permission Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Permissions granted by this role</span>
                  <span className="text-indigo-600">{ROLE_CATALOG[role].permissions.length} total</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs text-slate-600">
                  {ROLE_CATALOG[role].permissions.map((perm) => (
                    <div key={perm} className="flex items-center gap-1.5">
                      <Check size={12} className="text-emerald-600 flex-shrink-0" />
                      <span className="font-mono text-[11px]">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all"
              >
                {isSubmitting ? "Provisioning..." : "Provision User"}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: User Management Matrix & Role Catalog */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit">
            {(["ALL", "GOVERNANCE", "DEMAND", "SUPPLY", "PERMISSIONS"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                  activeTab === tab ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab === "ALL" ? "All Users" : tab === "PERMISSIONS" ? "Role & Permissions Catalog" : tab}
              </button>
            ))}
          </div>

          {activeTab === "PERMISSIONS" ? (
            /* Authoritative Role Catalog Tab */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Authoritative Role & Permission Catalog</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Single source of truth role definitions. No arbitrary or unassigned permissions.
                </p>
              </div>

              <div className="space-y-4">
                {AUTHORITATIVE_ROLES.map((roleDef) => (
                  <div key={roleDef.id} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-900 text-base">{roleDef.displayName}</span>
                        <span className="text-xs font-mono text-slate-500">[{roleDef.id}]</span>
                        {roleDef.isAdminEquivalent && (
                          <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-black uppercase">
                            Admin Equivalent
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                        Category: {roleDef.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{roleDef.description}</p>
                    <div className="text-xs font-semibold text-slate-500">
                      <strong>Scope:</strong> {roleDef.scopeDescription}
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Authoritative Permissions ({roleDef.permissions.length})
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 bg-white p-3 rounded-xl border border-slate-200">
                        {roleDef.permissions.map((p) => (
                          <div key={p} className="flex items-center gap-1.5 text-[11px] text-slate-700">
                            <Check size={12} className="text-emerald-600 flex-shrink-0" />
                            <span className="font-mono">{p}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Users List */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-900">
                  Registered Identities ({filteredUsers.length})
                </h2>
              </div>

              {loading ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-400">Loading user matrix...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-16 text-center text-sm font-semibold text-slate-400">No users found in this category.</div>
              ) : (
                <div className="space-y-3">
                  {filteredUsers.map((u) => {
                    const roleDef = ROLE_CATALOG[u.role as SystemRole];
                    const isInactive = u.status === "INACTIVE" || u.disabled;

                    return (
                      <div
                        key={u.uid || u.id}
                        className={cn(
                          "flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all gap-4",
                          isInactive
                            ? "bg-slate-50 border-slate-200 opacity-60"
                            : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                        )}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 mt-0.5",
                              roleDef?.category === "GOVERNANCE"
                                ? "bg-slate-900 text-white"
                                : roleDef?.category === "DEMAND"
                                ? "bg-indigo-600 text-white"
                                : "bg-amber-600 text-white"
                            )}
                          >
                            {(u.email || "U").charAt(0).toUpperCase()}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setSelectedUserDetail(u)}
                                className="font-bold text-slate-900 hover:text-indigo-600 text-sm underline decoration-slate-200 underline-offset-2 text-left"
                              >
                                {u.email}
                              </button>
                              {roleDef?.isAdminEquivalent && (
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded">
                                  HQ Authority
                                </span>
                              )}
                              {isInactive && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black uppercase rounded">
                                  Deactivated / Inactive
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              <span className="font-semibold text-slate-700">{roleDef?.displayName || u.role}</span>
                              <span>•</span>
                              <span>{u.org?.companyName || u.organizationId || "HireNest Workforce"}</span>
                              {u.vendorId && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-700 font-medium">Vendor: {u.vendorId}</span>
                                </>
                              )}
                            </div>

                            {u.createdByEmail && (
                              <div className="text-[11px] text-slate-400">
                                Created by: <span className="text-slate-600 font-medium">{u.createdByEmail}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <Button
                            variant="outline"
                            onClick={() => setSelectedUserDetail(u)}
                            className="text-xs h-9 px-3 rounded-xl border-slate-200 hover:bg-slate-50"
                          >
                            <Eye size={14} className="mr-1.5" />
                            View Permissions
                          </Button>

                          {!isInactive && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setUserToChangeRole(u);
                                  setNewRoleForChange(u.role);
                                  setNewVendorIdForChange(u.vendorId || "");
                                }}
                                className="text-xs h-9 px-3 rounded-xl border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                              >
                                Change Role
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => setUserToDeactivate(u)}
                                className="text-xs h-9 px-3 rounded-xl border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                              >
                                Deactivate
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* User Details & Permissions Modal (Exact Layout Matching Specification) */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedUserDetail.email}</h2>
                <p className="text-sm font-bold text-indigo-600">
                  {ROLE_CATALOG[selectedUserDetail.role as SystemRole]?.displayName || selectedUserDetail.role}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserDetail(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">ROLE</span>
                <span className="text-sm font-bold text-slate-900">
                  {ROLE_CATALOG[selectedUserDetail.role as SystemRole]?.displayName}
                </span>
              </div>

              {ROLE_CATALOG[selectedUserDetail.role as SystemRole]?.isAdminEquivalent && (
                <div className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase rounded-lg tracking-wider">
                  ADMIN-EQUIVALENT
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Created By</span>
                  <span className="font-semibold text-slate-700">
                    {selectedUserDetail.createdByEmail || selectedUserDetail.createdByUserId || "System Genesis"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Created At</span>
                  <span className="font-semibold text-slate-700">
                    {selectedUserDetail.createdAt ? new Date(selectedUserDetail.createdAt).toLocaleString() : "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Organization / Mapped Vendor</span>
                  <span className="font-semibold text-slate-700">
                    {selectedUserDetail.org?.companyName || selectedUserDetail.organizationId || "HireNest Workforce"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Status</span>
                  <span
                    className={cn(
                      "font-bold uppercase",
                      selectedUserDetail.status === "ACTIVE" && !selectedUserDetail.disabled
                        ? "text-emerald-600"
                        : "text-rose-600"
                    )}
                  >
                    {selectedUserDetail.status || (selectedUserDetail.disabled ? "INACTIVE" : "ACTIVE")}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                  ENABLED PERMISSIONS ({getPermissionsForRole(selectedUserDetail.role).length})
                </span>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-56 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {getPermissionsForRole(selectedUserDetail.role).map((p) => (
                    <div key={p} className="flex items-center gap-1.5 text-slate-700 font-mono text-[11px]">
                      <Check size={14} className="text-emerald-600 flex-shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedUserDetail(null)}
                className="rounded-xl text-xs font-bold"
              >
                Close
              </Button>

              {selectedUserDetail.status !== "INACTIVE" && !selectedUserDetail.disabled && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setUserToChangeRole(selectedUserDetail);
                      setNewRoleForChange(selectedUserDetail.role);
                      setNewVendorIdForChange(selectedUserDetail.vendorId || "");
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                  >
                    CHANGE ROLE
                  </Button>
                  <Button
                    onClick={() => setUserToDeactivate(selectedUserDetail)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                  >
                    DEACTIVATE
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {userToChangeRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Change Role & Permissions</h2>
                <p className="text-xs text-slate-500 mt-0.5">{userToChangeRole.email}</p>
              </div>
              <button
                onClick={() => setUserToChangeRole(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Role</label>
                <select
                  value={newRoleForChange}
                  onChange={(e) => setNewRoleForChange(e.target.value as SystemRole)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-sm font-semibold outline-none"
                >
                  <optgroup label="Governance (HQ)">
                    <option value="PLATFORM_AUTHORITY">Platform Authority (HQ)</option>
                    <option value="BUSINESS_OPERATIONS">Business Operations (HQ)</option>
                  </optgroup>
                  <optgroup label="Demand (Clients)">
                    <option value="CLIENT_ADMIN">Client Admin</option>
                    <option value="CLIENT_HM">Client Hiring Manager</option>
                    <option value="CLIENT_FINANCE">Client Finance</option>
                  </optgroup>
                  <optgroup label="Supply (Vendors)">
                    <option value="VENDOR_ADMIN">Vendor Admin</option>
                    <option value="VENDOR_RECRUITER">Vendor Recruiter</option>
                  </optgroup>
                </select>
              </div>

              {/* If Vendor Recruiter is selected, show Vendor mapping */}
              {newRoleForChange === "VENDOR_RECRUITER" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Mapped Vendor Organization <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={newVendorIdForChange}
                    onChange={(e) => setNewVendorIdForChange(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-sm font-semibold outline-none"
                  >
                    <option value="">Select Vendor...</option>
                    {vendorOrgs.map((vo) => (
                      <option key={vo.id} value={vo.id}>
                        {vo.companyName || vo.name || vo.id} ({vo.id})
                      </option>
                    ))}
                    {vendorOrgs.length === 0 && <option value="ORG-VENDOR-DEFAULT">Default Vendor Agency</option>}
                  </select>
                </div>
              )}

              {/* Dynamic Permissions Enabled By Role */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Permissions enabled by this role</span>
                  <span className="text-indigo-600 font-mono">{ROLE_CATALOG[newRoleForChange].permissions.length} total</span>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs text-slate-700">
                  {ROLE_CATALOG[newRoleForChange].permissions.map((perm) => (
                    <div key={perm} className="flex items-center gap-1.5">
                      <Check size={13} className="text-emerald-600 flex-shrink-0" />
                      <span className="font-mono text-[11px]">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setUserToChangeRole(null)}
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRoleChange}
                disabled={isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl px-5"
              >
                {isSubmitting ? "Saving..." : "Save Role & Permissions"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Safe Deactivate Modal */}
      {userToDeactivate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldAlert size={28} />
              </div>
              <h2 className="text-xl font-black text-slate-900">Deactivate & Revoke Access</h2>
              <p className="text-xs text-slate-500">
                Are you sure you want to deactivate <strong>{userToDeactivate.email}</strong>?
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
              <div className="flex items-start gap-2">
                <Check size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <span>Firebase active sessions revoked and Auth account disabled.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <span>Firestore status set to <code>INACTIVE</code>.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Historical Preservation:</strong> Submissions, requirements, candidate profiles, interviews, offers, and audit logs remain strictly preserved.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setUserToDeactivate(null)}
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteDeactivate}
                disabled={isSubmitting}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl flex-1"
              >
                {isSubmitting ? "Deactivating..." : "Deactivate & Revoke"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
