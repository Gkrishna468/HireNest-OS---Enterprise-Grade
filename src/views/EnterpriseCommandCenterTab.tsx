import React, { useState, useEffect } from "react";
import { TrendingUp, AlertTriangle, ShieldAlert, Cpu, Users, Building2, Receipt, DollarSign, Activity, CheckCircle2, PlayCircle, Zap } from "lucide-react";
import { cn } from "../lib/utils";
import { EnterpriseViewModelService } from "../services/EnterpriseViewModelService";
import { ProductionDataGuard } from "../lib/ProductionDataGuard";

export default function EnterpriseCommandCenterTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(userRole);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>({
    projectedRevenue: 0,
    revenueAtRisk: 0,
    reqsAtRisk: 0,
    placementPipeline: 0,
    outstandingInvoices: 0,
    pendingPayouts: 0,
    topRecruiters: [],
    topVendors: [],
    pendingApprovals: 0,
    systemHealth: 100,
  });

  useEffect(() => {
    let active = true;
    const fetchTelemetry = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await EnterpriseViewModelService.getEnterpriseCommandCenterMetrics();
        ProductionDataGuard.validate(data, "Command Center Telemetry", "HQ Analytics");
        
        if (active) {
          setMetrics(data);
        }
      } catch (err: any) {
        console.error("Telemetry fetch failed:", err);
        if (active) {
          setError(err?.message || "Failed to aggregate operational metrics from live Business Graph.");
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchTelemetry();
    return () => { active = false; };
  }, []);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HQ
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 overflow-y-auto text-slate-300">
      <div className="px-8 py-8 border-b border-slate-800 bg-slate-900 flex justify-between items-end relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Activity size={200} className="text-emerald-400" />
        </div>
        <div className="relative z-10 w-full flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Activity className="text-emerald-400" size={28} />
              <h1 className="text-3xl font-black text-white tracking-tighter">Enterprise Command Center</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">Unified telemetry across operations, intelligence, and revenue.</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex flex-col items-end">
               <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">System Health</div>
               <div className="text-lg font-black text-white">{metrics.systemHealth}% Online</div>
             </div>
             <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex flex-col items-end">
               <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Autonomous Queue</div>
               <div className="text-lg font-black text-white">{metrics.pendingApprovals} Approvals</div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
        {/* Top KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-4 text-emerald-400">
              <span className="text-[10px] font-bold uppercase tracking-widest">Expected Revenue</span>
              <DollarSign size={16} />
            </div>
            <div className="text-2xl font-black text-white">${loading ? '-' : (metrics.projectedRevenue / 1000).toFixed(1)}k</div>
            <div className="text-xs text-slate-500 mt-1">Closed placements</div>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-4 text-amber-400">
              <span className="text-[10px] font-bold uppercase tracking-widest">Revenue at Risk</span>
              <AlertTriangle size={16} />
            </div>
            <div className="text-2xl font-black text-white">${loading ? '-' : (metrics.revenueAtRisk / 1000).toFixed(1)}k</div>
            <div className="text-xs text-slate-500 mt-1">From {metrics.reqsAtRisk} stalled reqs</div>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-4 text-indigo-400">
              <span className="text-[10px] font-bold uppercase tracking-widest">Outstanding AR</span>
              <Receipt size={16} />
            </div>
            <div className="text-2xl font-black text-white">${loading ? '-' : (metrics.outstandingInvoices / 1000).toFixed(1)}k</div>
            <div className="text-xs text-slate-500 mt-1">Pending client payment</div>
          </div>
          <div className="bg-slate-800/50 p-5 rounded-2xl border border-slate-700">
            <div className="flex items-center justify-between mb-4 text-rose-400">
              <span className="text-[10px] font-bold uppercase tracking-widest">Pending AP</span>
              <Building2 size={16} />
            </div>
            <div className="text-2xl font-black text-white">${loading ? '-' : (metrics.pendingPayouts / 1000).toFixed(1)}k</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting vendor settlement</div>
          </div>
        </div>

        {/* Intelligence Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Top Performers */}
           <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center">
                   <Users className="w-4 h-4 mr-2 text-indigo-400" /> Top Recruiters
                 </h3>
                 <div className="space-y-4">
                   {metrics.topRecruiters.map((r: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                         <div className="text-sm font-bold text-slate-200">{r.name}</div>
                       </div>
                       <div className="text-right">
                         <div className="text-sm font-black text-emerald-400">{r.placements} Placements</div>
                         <div className="text-xs text-slate-500">{r.conv}% Conv Rate</div>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
                 <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center">
                   <Building2 className="w-4 h-4 mr-2 text-amber-400" /> Top Vendors
                 </h3>
                 <div className="space-y-4">
                   {metrics.topVendors.map((v: any, idx: number) => (
                     <div key={idx} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                       <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">{idx + 1}</div>
                         <div>
                           <div className="text-sm font-bold text-slate-200">{v.name || v.id.substring(0,8)}</div>
                           <div className="text-xs text-slate-500">Tier 1 Elite</div>
                         </div>
                       </div>
                       <div className="text-right">
                         <div className="text-sm font-black text-emerald-400">{v.trustScore} Trust</div>
                         <div className="text-xs text-slate-500">{v.placements || 0} Placements</div>
                       </div>
                     </div>
                   ))}
                 </div>
              </div>
           </div>

           {/* Autonomous Ops & Health */}
           <div className="space-y-6">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden flex flex-col h-full relative">
                 <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-rose-500"></div>
                 <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
                   <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center">
                     <Zap className="w-4 h-4 mr-2 text-amber-400" /> Action Required
                   </h3>
                   <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded">0 PENDING</span>
                 </div>
                 <div className="p-0 flex-1 divide-y divide-slate-700/50">
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                        <CheckCircle2 size={32} className="text-emerald-500 mb-3" />
                        <h4 className="text-sm font-bold text-slate-200">No Pending Actions</h4>
                        <p className="text-xs text-slate-500 max-w-[200px] mt-1">All queues and autonomous approvals are clear.</p>
                    </div>
                 </div>
                 <div className="p-4 bg-slate-900 border-t border-slate-700 text-center">
                    <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300">Open Command Center →</button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
