import React from "react";
import DirectCandidatesWorkspace from "./DirectCandidatesWorkspace";
import { useSystemStore } from "../stores/SystemStore";
import { checkIsAdmin } from "../lib/permissions";
import { ShieldAlert } from "lucide-react";

export default function DirectCandidatesView() {
  const { user, userData, loading } = useSystemStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const userRole = userData?.role || (user ? "CANDIDATE" : "GUEST");
  const isAdmin = checkIsAdmin(userRole) || userData?.isAdmin === true || user?.email?.includes("admin") || userRole === "PLATFORM_AUTHORITY" || userRole === "BUSINESS_OPERATIONS";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <div className="p-4 bg-red-500/10 rounded-full text-red-500 border border-red-500/20">
          <ShieldAlert size={32} />
        </div>
        <p className="text-sm font-bold text-slate-700">
          Direct Candidates (Candidate Portal) is an Admin-only workspace.
        </p>
        <p className="text-xs text-slate-500">
          Your current role ({userRole}) does not have Global HQ administration privileges.
        </p>
      </div>
    );
  }

  return <DirectCandidatesWorkspace isAdmin={isAdmin} userRole={userRole} />;
}
