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
  Phone,
  Layers,
  UserCircle,
  Briefcase,
  Sliders,
} from "lucide-react";
import { useSystemStore } from "../stores/SystemStore";
import {
  AUTHORITATIVE_ROLES,
  ROLE_CATALOG,
  RECRUITER_SUBTYPES,
  getPermissionsForRole,
  isRoleAdminEquivalent,
  normalizeRole,
  normalizeRecruiterSubtype,
  getUserTypeForRole,
  getRolesForUserType,
  SystemRole,
  UserType,
  RecruiterSubtype,
  RequirementScopeType,
} from "../lib/rbac";

export default function AdminUsersManager({ orgData }: { orgData: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [requirementsList, setRequirementsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "GOVERNANCE" | "DEMAND" | "SUPPLY" | "RECRUITERS" | "PERMISSIONS">("ALL");
  const [recruiterFilter, setRecruiterFilter] = useState<"ALL" | "INTERNAL" | "VENDOR" | "FREELANCE">("ALL");

  // Form state for creating user
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("RECRUITER");
  const [recruiterSubtype, setRecruiterSubtype] = useState<RecruiterSubtype>("INTERNAL");
  const [role, setRole] = useState<SystemRole>("RECRUITER");
  const [requirementScope, setRequirementScope] = useState<RequirementScopeType>("ASSIGNED_ONLY");
  const [companyName, setCompanyName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modals state
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);
  const [userToChangeRole, setUserToChangeRole] = useState<any | null>(null);
  const [editUserType, setEditUserType] = useState<UserType>("RECRUITER");
  const [editRecruiterSubtype, setEditRecruiterSubtype] = useState<RecruiterSubtype>("VENDOR");
  const [editRole, setEditRole] = useState<SystemRole>("RECRUITER");
  const [editScope, setEditScope] = useState<RequirementScopeType>("ASSIGNED_ONLY");
  const [editVendorId, setEditVendorId] = useState("");
  const [editOrgId, setEditOrgId] = useState("");
  const [userToDeactivate, setUserToDeactivate] = useState<any | null>(null);
  const [userToReactivate, setUserToReactivate] = useState<any | null>(null);

  const activeActorRole = normalizeRole(orgData?.role || (auth.currentUser as any)?.role);
  const isActorAdmin = isRoleAdminEquivalent(activeActorRole);

  // Sync role when userType changes in creation form
  const handleUserTypeChange = (newType: UserType) => {
    setUserType(newType);
    const availableRoles = getRolesForUserType(newType);
    if (newType === "RECRUITER") {
      setRole("RECRUITER");
      setRecruiterSubtype("INTERNAL");
      setRequirementScope("ASSIGNED_ONLY");
      setSelectedOrgId("ORG-GLOBAL-HQ");
    } else if (newType === "HQ") {
      setRole("BUSINESS_OPERATIONS");
      setSelectedOrgId("ORG-GLOBAL-HQ");
    } else if (newType === "CLIENT") {
      setRole("CLIENT_ADMIN");
      setSelectedOrgId("");
    } else if (newType === "VENDOR") {
      setRole("VENDOR_ADMIN");
      setSelectedOrgId("");
    }
  };

  const handleRecruiterSubtypeChange = (newSubtype: RecruiterSubtype) => {
    setRecruiterSubtype(newSubtype);
    if (newSubtype === "INTERNAL") {
      setSelectedOrgId("ORG-GLOBAL-HQ");
      setSelectedVendorId("");
      setRequirementScope("ASSIGNED_ONLY");
    } else if (newSubtype === "VENDOR") {
      setSelectedOrgId("");
      setRequirementScope("ASSIGNED_ONLY");
    } else if (newSubtype === "FREELANCE") {
      setSelectedOrgId("ORG-FREELANCE-NETWORK");
      setSelectedVendorId("");
      setRequirementScope("EXPLICIT_ONLY");
    }
  };

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
          const derivedUserType: UserType = (u.userType as UserType) || getUserTypeForRole(roleNorm);
          const derivedSubtype: RecruiterSubtype | undefined =
            derivedUserType === "RECRUITER" || roleNorm === "RECRUITER" || roleNorm === "VENDOR_RECRUITER"
              ? normalizeRecruiterSubtype(u.recruiterSubtype || u.subtype, roleNorm)
              : undefined;

          const org = orgs.find((o) => o.id === u.organizationId || o.id === u.vendorId);
          return {
            id: d.id,
            uid: u.uid || d.id,
            email: u.email || "",
            phone: u.phone || "",
            displayName: u.displayName || u.name || u.email?.split("@")[0] || "User",
            userType: derivedUserType,
            role: roleNorm,
            recruiterSubtype: derivedSubtype,
            subtype: derivedSubtype,
            requirementScope: (u.requirementScope as RequirementScopeType) || (derivedSubtype === "FREELANCE" ? "EXPLICIT_ONLY" : "ASSIGNED_ONLY"),
            assignedRequirementIds: u.assignedRequirementIds || [],
            roleDisplayName: roleDef?.displayName || roleNorm,
            category: roleDef?.category || "GOVERNANCE",
            isAdminEquivalent: roleDef?.isAdminEquivalent || false,
            permissions: u.permissions || getPermissionsForRole(roleNorm),
            organizationId: u.organizationId || "",
            vendorId: u.vendorId || (derivedSubtype === "VENDOR" ? u.organizationId : undefined),
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
      const [orgSnap, reqSnap] = await Promise.all([
        getDocs(query(collection(db, "organizations"), limit(100))),
        getDocs(query(collection(db, "requirements_public"), limit(50))),
      ]);
      setOrganizations(orgSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any));
      setRequirementsList(reqSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as any));
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

      if (userType === "RECRUITER" && recruiterSubtype === "VENDOR" && !selectedVendorId && !selectedOrgId) {
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
          displayName: displayName || email.split("@")[0],
          email,
          phone,
          password,
          userType,
          role,
          recruiterSubtype: userType === "RECRUITER" ? recruiterSubtype : undefined,
          requirementScope: userType === "RECRUITER" ? requirementScope : undefined,
          companyName: companyName || (recruiterSubtype === "VENDOR" ? "Vendor Agency" : userType === "CLIENT" ? "Client Organization" : "HireNest Workforce"),
          organizationId: userType === "RECRUITER" && recruiterSubtype === "VENDOR" ? selectedVendorId || selectedOrgId : selectedOrgId || undefined,
          vendorId: userType === "RECRUITER" && recruiterSubtype === "VENDOR" ? selectedVendorId || selectedOrgId : userType === "VENDOR" ? selectedOrgId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user identity.");
      }

      const subDesc = userType === "RECRUITER" ? ` (${RECRUITER_SUBTYPES[recruiterSubtype].displayName})` : "";
      setSuccessMsg(`User ${email} successfully provisioned as [${ROLE_CATALOG[role]?.displayName || role}]${subDesc}.`);
      setDisplayName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setCompanyName("");
      setSelectedOrgId("");
      setSelectedVendorId("");
      await fetchUsersAndOrgs();
    } catch (err: any) {
      setError(err.message || "Failed to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (u: any) => {
    setUserToChangeRole(u);
    const uType: UserType = u.userType || getUserTypeForRole(u.role);
    setEditUserType(uType);
    setEditRole(u.role);
    setEditRecruiterSubtype(u.recruiterSubtype || "VENDOR");
    setEditScope(u.requirementScope || "ASSIGNED_ONLY");
    setEditVendorId(u.vendorId || u.organizationId || "");
    setEditOrgId(u.organizationId || "");
  };

  const handleSaveRoleChange = async () => {
    if (!userToChangeRole) return;
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      if (editUserType === "RECRUITER" && editRecruiterSubtype === "VENDOR" && !editVendorId && !userToChangeRole.vendorId) {
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
          userType: editUserType,
          role: editRole,
          recruiterSubtype: editUserType === "RECRUITER" ? editRecruiterSubtype : undefined,
          requirementScope: editUserType === "RECRUITER" ? editScope : undefined,
          organizationId: editUserType === "RECRUITER" && editRecruiterSubtype === "VENDOR"
            ? (editVendorId || userToChangeRole.organizationId)
            : editOrgId || userToChangeRole.organizationId,
          vendorId: editUserType === "RECRUITER" && editRecruiterSubtype === "VENDOR"
            ? (editVendorId || userToChangeRole.vendorId)
            : editUserType === "VENDOR" ? (editOrgId || userToChangeRole.vendorId) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update role.");
      }

      setSuccessMsg(`Permissions and identity for ${userToChangeRole.email} updated.`);
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

  const handleExecuteReactivate = async () => {
    if (!userToReactivate) return;
    setIsSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/reactivate-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          uid: userToReactivate.uid || userToReactivate.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reactivate user.");
      }

      setSuccessMsg(`Identity for ${userToReactivate.email} successfully reactivated and access restored.`);
      setUserToReactivate(null);
      if (selectedUserDetail && (selectedUserDetail.uid === userToReactivate.uid || selectedUserDetail.id === userToReactivate.id)) {
        setSelectedUserDetail(null);
      }
      await fetchUsersAndOrgs();
    } catch (err: any) {
      setError(err.message || "Failed to reactivate user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "RECRUITERS") {
      const isRecruiter = u.userType === "RECRUITER" || u.role === "RECRUITER" || u.role === "VENDOR_RECRUITER";
      if (!isRecruiter) return false;
      if (recruiterFilter === "ALL") return true;
      return u.recruiterSubtype === recruiterFilter || u.subtype === recruiterFilter;
    }
    if (activeTab === "GOVERNANCE") return u.userType === "HQ" || u.category === "GOVERNANCE";
    if (activeTab === "DEMAND") return u.userType === "CLIENT" || u.category === "DEMAND";
    if (activeTab === "SUPPLY") return u.userType === "VENDOR" || u.role === "VENDOR_ADMIN";
    return true;
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
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">HireNest Users & Permissions</h1>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider">
              RBAC + ABAC SSOT
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Integrated Identity System: User Types (HQ, Client, Vendor, Recruiter), Recruiter Subtypes (Internal, Vendor, Freelance), and ABAC Scopes.
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
            Refresh Matrix
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
        {/* Left Column: Create User Form */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Create User</h2>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. John Doe / Anita Patel"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Min 6 characters"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                />
              </div>

              {/* User Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  User Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={userType}
                  onChange={(e) => handleUserTypeChange(e.target.value as UserType)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-semibold outline-none transition-all"
                >
                  <option value="RECRUITER">Recruiter</option>
                  <option value="HQ">HQ (Platform / Operations)</option>
                  <option value="CLIENT">Client (Demand)</option>
                  <option value="VENDOR">Vendor (Agency Admin)</option>
                </select>
              </div>

              {/* Recruiter Type (Shown when User Type is Recruiter) */}
              {userType === "RECRUITER" && (
                <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-3.5 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-indigo-950 uppercase tracking-wider mb-1.5">
                      Recruiter Type <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={recruiterSubtype}
                      onChange={(e) => handleRecruiterSubtypeChange(e.target.value as RecruiterSubtype)}
                      className="w-full bg-white border border-indigo-200 focus:border-indigo-600 rounded-xl p-2.5 text-sm font-bold text-indigo-900 outline-none"
                    >
                      <option value="INTERNAL">Internal Recruiter (HireNest Workforce HQ)</option>
                      <option value="VENDOR">Vendor Recruiter (Partner Agency Desk)</option>
                      <option value="FREELANCE">Freelance Recruiter (Independent Network)</option>
                    </select>
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-snug">
                    {RECRUITER_SUBTYPES[recruiterSubtype].description}
                  </p>
                </div>
              )}

              {/* Role (Dynamically Filtered Based on User Type) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as SystemRole)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-semibold outline-none transition-all"
                >
                  {userType === "HQ" && (
                    <>
                      <option value="BUSINESS_OPERATIONS">Business Operations (HQ)</option>
                      {activeActorRole === "PLATFORM_AUTHORITY" && (
                        <option value="PLATFORM_AUTHORITY">Platform Authority (HQ)</option>
                      )}
                    </>
                  )}
                  {userType === "CLIENT" && (
                    <>
                      <option value="CLIENT_ADMIN">Client Admin</option>
                      <option value="CLIENT_HM">Client Hiring Manager</option>
                      <option value="CLIENT_FINANCE">Client Finance</option>
                    </>
                  )}
                  {userType === "VENDOR" && (
                    <option value="VENDOR_ADMIN">Vendor Admin</option>
                  )}
                  {userType === "RECRUITER" && (
                    <option value="RECRUITER">Recruiter</option>
                  )}
                </select>
              </div>

              {/* Organization Mapping */}
              {userType === "RECRUITER" && recruiterSubtype === "VENDOR" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Vendor Organization <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
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
                </div>
              ) : userType === "VENDOR" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Vendor Agency Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Shreeji Consulting / Apex Staffing"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-medium outline-none transition-all"
                  />
                </div>
              ) : userType === "CLIENT" ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Client Organization
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
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Organization Scope
                  </label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-semibold text-slate-700">
                    {userType === "HQ" || recruiterSubtype === "INTERNAL" ? "HireNest Workforce HQ" : "HireNest Freelance Network"}
                  </div>
                </div>
              )}

              {/* Requirement Scope (For Recruiters) */}
              {userType === "RECRUITER" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Requirement Scope
                  </label>
                  <select
                    value={requirementScope}
                    onChange={(e) => setRequirementScope(e.target.value as RequirementScopeType)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white rounded-xl p-3 text-sm font-semibold outline-none transition-all"
                  >
                    <option value="ASSIGNED_ONLY">Assigned Requirements</option>
                    <option value="ALL_PERMITTED">All Permitted Requirements</option>
                    <option value="EXPLICIT_ONLY">Explicit Requirements Only (Isolated)</option>
                  </select>
                </div>
              )}

              {/* Live Permissions Checklist */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Permissions granted by role</span>
                  <span className="text-indigo-600 font-mono">{ROLE_CATALOG[role]?.permissions.length || 0} total</span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1 text-xs text-slate-600">
                  {(ROLE_CATALOG[role]?.permissions || []).map((perm) => (
                    <div key={perm} className="flex items-center gap-1.5">
                      <Check size={12} className="text-emerald-600 flex-shrink-0" />
                      <span className="font-mono text-[11px]">{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Status</label>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Identity (Access Enabled)
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl text-sm shadow-md transition-all"
              >
                {isSubmitting ? "Provisioning..." : "Create User"}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: User Management Matrix & Role Catalog */}
        <div className="lg:col-span-8 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl w-fit flex-wrap">
            {(activeActorRole === "PLATFORM_AUTHORITY"
              ? ["ALL", "RECRUITERS", "GOVERNANCE", "DEMAND", "SUPPLY", "PERMISSIONS"] as const
              : ["ALL", "RECRUITERS", "GOVERNANCE", "DEMAND", "SUPPLY"] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold transition-all",
                  activeTab === tab ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {tab === "ALL"
                  ? "All Users"
                  : tab === "RECRUITERS"
                  ? "Recruiter Family"
                  : tab === "GOVERNANCE"
                  ? "HQ Governance"
                  : tab === "DEMAND"
                  ? "Clients"
                  : tab === "SUPPLY"
                  ? "Vendors"
                  : "Role Catalog"}
              </button>
            ))}
          </div>

          {/* Subtype Filter Pill bar when in RECRUITERS tab */}
          {activeTab === "RECRUITERS" && (
            <div className="flex items-center gap-2 bg-indigo-50/60 border border-indigo-100 p-2 rounded-2xl text-xs font-bold">
              <span className="text-indigo-900 px-2">Subtype Filter:</span>
              {(["ALL", "INTERNAL", "VENDOR", "FREELANCE"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setRecruiterFilter(sub)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl transition-all",
                    recruiterFilter === sub ? "bg-indigo-600 text-white shadow-sm" : "bg-white text-slate-700 hover:bg-indigo-100"
                  )}
                >
                  {sub === "ALL" ? "All Subtypes" : sub === "INTERNAL" ? "Internal Recruiter" : sub === "VENDOR" ? "Vendor Recruiter" : "Freelance Recruiter"}
                </button>
              ))}
            </div>
          )}

          {activeTab === "PERMISSIONS" ? (
            /* Authoritative Role Catalog Tab */
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-black text-slate-900">Authoritative Roles & Recruiter Subtypes</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Single source of truth role catalog + Recruiter subtype ABAC scope definitions.
                </p>
              </div>

              {/* Recruiter Subtypes Section */}
              <div className="border border-indigo-100 bg-indigo-50/40 rounded-2xl p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <UserCircle className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Recruiter Role Family Subtypes</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {Object.values(RECRUITER_SUBTYPES).map((sub) => (
                    <div key={sub.id} className="bg-white p-4 rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{sub.displayName}</span>
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                          {sub.id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-snug">{sub.description}</p>
                      <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <strong>Scope:</strong> {sub.scopeDescription}
                      </div>
                    </div>
                  ))}
                </div>
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
                        User Type: {roleDef.userType}
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
                    const uType: UserType = u.userType || getUserTypeForRole(u.role);
                    const subType: RecruiterSubtype | undefined = u.recruiterSubtype || u.subtype;

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
                              uType === "HQ"
                                ? "bg-slate-900 text-white"
                                : uType === "CLIENT"
                                ? "bg-indigo-600 text-white"
                                : uType === "VENDOR"
                                ? "bg-amber-600 text-white"
                                : subType === "INTERNAL"
                                ? "bg-indigo-700 text-white"
                                : subType === "FREELANCE"
                                ? "bg-emerald-700 text-white"
                                : "bg-amber-700 text-white"
                            )}
                          >
                            {(u.displayName || u.email || "U").charAt(0).toUpperCase()}
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <button
                                onClick={() => setSelectedUserDetail(u)}
                                className="font-bold text-slate-900 hover:text-indigo-600 text-sm underline decoration-slate-200 underline-offset-2 text-left"
                              >
                                {u.displayName || u.email}
                              </button>

                              {/* User Type Badge */}
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                                {uType}
                              </span>

                              {/* Recruiter Subtype Badge */}
                              {subType && (
                                <span
                                  className={cn(
                                    "px-2 py-0.5 text-[10px] font-bold rounded",
                                    subType === "INTERNAL"
                                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                      : subType === "FREELANCE"
                                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                      : "bg-amber-100 text-amber-800 border border-amber-200"
                                  )}
                                >
                                  {subType === "INTERNAL" ? "Internal Recruiter" : subType === "FREELANCE" ? "Freelance Recruiter" : "Vendor Recruiter"}
                                </span>
                              )}

                              {roleDef?.isAdminEquivalent && (
                                <span className="px-2 py-0.5 bg-slate-900 text-white text-[9px] font-black uppercase rounded">
                                  HQ Authority
                                </span>
                              )}

                              {isInactive && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-black uppercase rounded">
                                  Inactive
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                              <span className="font-semibold text-slate-700">{u.email}</span>
                              {u.phone && <span>• Tel: {u.phone}</span>}
                              <span>•</span>
                              <span>{u.org?.companyName || u.organizationId || (subType === "INTERNAL" ? "HireNest Workforce HQ" : subType === "FREELANCE" ? "Freelance Network" : "Organization")}</span>
                              {u.vendorId && (
                                <>
                                  <span>•</span>
                                  <span className="text-amber-700 font-medium">Vendor: {u.vendorId}</span>
                                </>
                              )}
                            </div>

                            {u.requirementScope && uType === "RECRUITER" && (
                              <div className="text-[11px] text-slate-500">
                                Scope: <span className="font-mono text-indigo-700 font-medium">{u.requirementScope}</span>
                              </div>
                            )}

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
                            View
                          </Button>

                          {!isInactive ? (
                            <>
                              <Button
                                id={`edit-${u.uid || u.id}`}
                                variant="outline"
                                onClick={() => handleOpenEditModal(u)}
                                className="text-xs h-9 px-3 rounded-xl border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
                              >
                                Edit Role
                              </Button>

                              <Button
                                id={`deactivate-${u.uid || u.id}`}
                                variant="outline"
                                onClick={() => setUserToDeactivate(u)}
                                className="text-xs h-9 px-3 rounded-xl border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100"
                              >
                                Deactivate
                              </Button>
                            </>
                          ) : (
                            <Button
                              id={`reactivate-${u.uid || u.id}`}
                              variant="outline"
                              onClick={() => setUserToReactivate(u)}
                              className="text-xs h-9 px-3 rounded-xl border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            >
                              Reactivate
                            </Button>
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

      {/* User Details & Permissions Modal */}
      {selectedUserDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedUserDetail.displayName || selectedUserDetail.email}</h2>
                <p className="text-sm font-bold text-indigo-600">
                  {selectedUserDetail.email}
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl text-xs">
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">User Type</span>
                  <span className="font-bold text-slate-900">{selectedUserDetail.userType || getUserTypeForRole(selectedUserDetail.role)}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Role</span>
                  <span className="font-bold text-indigo-700">{ROLE_CATALOG[selectedUserDetail.role as SystemRole]?.displayName || selectedUserDetail.role}</span>
                </div>
                {selectedUserDetail.recruiterSubtype && (
                  <div>
                    <span className="text-slate-400 font-bold block mb-0.5">Recruiter Subtype</span>
                    <span className="font-bold text-emerald-700">{RECRUITER_SUBTYPES[selectedUserDetail.recruiterSubtype as RecruiterSubtype]?.displayName || selectedUserDetail.recruiterSubtype}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Requirement Scope</span>
                  <span className="font-semibold text-slate-700">{selectedUserDetail.requirementScope || "ASSIGNED_ONLY"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Organization / Vendor</span>
                  <span className="font-semibold text-slate-700">{selectedUserDetail.organizationId || selectedUserDetail.vendorId || "HireNest HQ"}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block mb-0.5">Status</span>
                  <span className={cn("font-bold uppercase", selectedUserDetail.status === "ACTIVE" && !selectedUserDetail.disabled ? "text-emerald-600" : "text-rose-600")}>
                    {selectedUserDetail.status || "ACTIVE"}
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

              {selectedUserDetail.status !== "INACTIVE" && !selectedUserDetail.disabled ? (
                <div className="flex items-center gap-2">
                  <Button
                    id="detail-edit-role"
                    onClick={() => {
                      handleOpenEditModal(selectedUserDetail);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                  >
                    EDIT ROLE & SCOPE
                  </Button>
                  <Button
                    id="detail-deactivate"
                    onClick={() => setUserToDeactivate(selectedUserDetail)}
                    className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl"
                  >
                    DEACTIVATE
                  </Button>
                </div>
              ) : (
                <Button
                  id="detail-reactivate"
                  onClick={() => setUserToReactivate(selectedUserDetail)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  REACTIVATE USER
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change Role & Scope Modal */}
      {userToChangeRole && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900">Edit User Type, Role & Scope</h2>
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
              {/* User Type */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">User Type</label>
                <select
                  value={editUserType}
                  onChange={(e) => {
                    const ut = e.target.value as UserType;
                    setEditUserType(ut);
                    if (ut === "RECRUITER") {
                      setEditRole("RECRUITER");
                      setEditRecruiterSubtype("VENDOR");
                    } else if (ut === "HQ") {
                      setEditRole("BUSINESS_OPERATIONS");
                    } else if (ut === "CLIENT") {
                      setEditRole("CLIENT_ADMIN");
                    } else if (ut === "VENDOR") {
                      setEditRole("VENDOR_ADMIN");
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-sm font-semibold outline-none"
                >
                  <option value="RECRUITER">Recruiter</option>
                  <option value="HQ">HQ (Platform / Operations)</option>
                  <option value="CLIENT">Client (Demand)</option>
                  <option value="VENDOR">Vendor (Agency Admin)</option>
                </select>
              </div>

              {/* Recruiter Subtype */}
              {editUserType === "RECRUITER" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Recruiter Type</label>
                  <select
                    value={editRecruiterSubtype}
                    onChange={(e) => setEditRecruiterSubtype(e.target.value as RecruiterSubtype)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-sm font-semibold outline-none"
                  >
                    <option value="INTERNAL">Internal Recruiter</option>
                    <option value="VENDOR">Vendor Recruiter</option>
                    <option value="FREELANCE">Freelance Recruiter</option>
                  </select>
                </div>
              )}

              {/* Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as SystemRole)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-sm font-semibold outline-none"
                >
                  {editUserType === "HQ" && (
                    <>
                      <option value="BUSINESS_OPERATIONS">Business Operations (HQ)</option>
                      {activeActorRole === "PLATFORM_AUTHORITY" && (
                        <option value="PLATFORM_AUTHORITY">Platform Authority (HQ)</option>
                      )}
                    </>
                  )}
                  {editUserType === "CLIENT" && (
                    <>
                      <option value="CLIENT_ADMIN">Client Admin</option>
                      <option value="CLIENT_HM">Client Hiring Manager</option>
                      <option value="CLIENT_FINANCE">Client Finance</option>
                    </>
                  )}
                  {editUserType === "VENDOR" && (
                    <option value="VENDOR_ADMIN">Vendor Admin</option>
                  )}
                  {editUserType === "RECRUITER" && (
                    <option value="RECRUITER">Recruiter</option>
                  )}
                </select>
              </div>

              {/* Mapped Vendor Org when Recruiter Subtype == VENDOR */}
              {editUserType === "RECRUITER" && editRecruiterSubtype === "VENDOR" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Mapped Vendor Organization <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editVendorId}
                    onChange={(e) => setEditVendorId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-sm font-semibold outline-none"
                  >
                    <option value="">Select Vendor Agency...</option>
                    {vendorOrgs.map((vo) => (
                      <option key={vo.id} value={vo.id}>
                        {vo.companyName || vo.name || vo.id} ({vo.id})
                      </option>
                    ))}
                    {vendorOrgs.length === 0 && <option value="ORG-VENDOR-DEFAULT">Default Vendor Agency</option>}
                  </select>
                </div>
              )}

              {/* Requirement Scope */}
              {editUserType === "RECRUITER" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Requirement Scope
                  </label>
                  <select
                    value={editScope}
                    onChange={(e) => setEditScope(e.target.value as RequirementScopeType)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 rounded-xl p-3 text-sm font-semibold outline-none"
                  >
                    <option value="ASSIGNED_ONLY">Assigned Requirements</option>
                    <option value="ALL_PERMITTED">All Permitted Requirements</option>
                    <option value="EXPLICIT_ONLY">Explicit Requirements Only</option>
                  </select>
                </div>
              )}

              {/* Dynamic Permissions Enabled By Role */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Permissions enabled by role</span>
                  <span className="text-indigo-600 font-mono">{ROLE_CATALOG[editRole]?.permissions.length || 0} total</span>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs text-slate-700">
                  {(ROLE_CATALOG[editRole]?.permissions || []).map((perm) => (
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

      {/* Safe Reactivate Modal */}
      {userToReactivate && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl relative space-y-6">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <ShieldCheck size={28} />
              </div>
              <h2 className="text-xl font-black text-slate-900">Reactivate & Restore Access</h2>
              <p className="text-xs text-slate-500">
                Are you sure you want to reactivate <strong>{userToReactivate.email}</strong>?
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
              <div className="flex items-start gap-2">
                <Check size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <span>Firebase Auth account enabled and user login restored.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={14} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <span>Firestore status restored to <code>ACTIVE</code>.</span>
              </div>
              <div className="flex items-start gap-2">
                <Check size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>All historical mappings, submission registers, and dossiers remain fully connected.</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setUserToReactivate(null)}
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleExecuteReactivate}
                disabled={isSubmitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex-1"
              >
                {isSubmitting ? "Reactivating..." : "Reactivate & Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

