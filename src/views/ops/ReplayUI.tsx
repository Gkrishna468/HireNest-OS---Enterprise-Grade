import React, { useState } from "react";
import { PlayCircle, Database, RotateCcw, AlertTriangle } from "lucide-react";

export default function ReplayUI() {
  const [selectedTenant, setSelectedTenant] = useState("");

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="bg-indigo-50 border border-indigo-200 rounded-sm p-4 flex items-start gap-3">
        <RotateCcw className="w-5 h-5 text-indigo-600 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-indigo-900">Projection Replay Engine</h3>
          <p className="text-xs text-indigo-700 mt-1">
            Rebuild derivative read-models (Kanbans, Control Towers, Deal Rooms) straight from the immutable Submissions Event Ledger. Use during disaster recovery or structural schema migrations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border rounded-sm p-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center">
            <Database className="w-4 h-4 mr-2" /> Rebuild Tenant Control Tower
          </h2>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1 block">Target Tenant ID</label>
              <input 
                value={selectedTenant}
                onChange={e => setSelectedTenant(e.target.value)}
                className="w-full border border-slate-200 rounded-sm p-2 text-sm font-mono" 
                placeholder="org-xxxxxxxx" 
              />
            </div>
            <div className="bg-amber-50 p-3 rounded-sm border border-amber-200 text-amber-800 text-xs">
              <AlertTriangle className="w-4 h-4 inline mr-1 mb-0.5" />
              Rebuilding a projection is resource-intensive. Control Tower will lock temporarily.
            </div>
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider py-3 rounded-sm flex items-center justify-center gap-2">
              <PlayCircle className="w-4 h-4" /> Initialize Projection Rebuild
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-sm p-6 opacity-60">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 flex items-center">
            <RotateCcw className="w-4 h-4 mr-2" /> Global System Rehydrate
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Rehydrate all analytics, SLA monitors, and system aggregates across all tenants. This operation must be performed during a maintenance window.
          </p>
          <button disabled className="w-full bg-slate-100 text-slate-400 border border-slate-200 text-xs font-bold uppercase tracking-wider py-3 rounded-sm flex items-center justify-center gap-2 cursor-not-allowed">
            Maintenance Window Required
          </button>
        </div>
      </div>
    </div>
  );
}
