import React from "react";

export default function DirectCandidatesDashboardTab({ userRole, orgId }: { userRole: string; orgId: string }) {
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Direct Candidates</h1>
        <div className="text-sm text-slate-500">Tracking all non-vendor sourced direct applications</div>
      </header>
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <p className="text-slate-600">This dashboard tracks candidates who applied directly to the organization.</p>
        {/* Dashboard content to be implemented */}
      </div>
    </div>
  );
}
