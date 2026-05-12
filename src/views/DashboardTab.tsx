import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Cpu } from "lucide-react";
import { currentUserState } from "../App";
import { Badge } from "../lib/Badge";

export default function DashboardTab() {
  const [metrics, setMetrics] = useState<any>(null);
  const user = currentUserState?.user;
  const org = currentUserState?.org;

  useEffect(() => {
    if (org) {
      fetch(`/api/metrics?type=${org.type}`).then(res => res.json()).then(setMetrics);
    }
  }, [org]);

  if (!metrics) return <div className="p-4 flex items-center justify-center text-slate-400 text-xs font-mono animate-pulse">Initializing Governance Layer...</div>;

  const isAdmin = org?.type === 'admin';
  const isClient = org?.type === 'client';
  const isVendor = org?.type === 'vendor';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-4 pt-4 pb-2 bg-white flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
           {isClient ? "Client Lifecycle Management" : isVendor ? "Vendor Service Operations" : "Global Admin Governance"}
        </h2>
        <Badge variant="outline" className="text-[9px] uppercase border-indigo-200 text-indigo-600 bg-indigo-50">
          Sync: Real-Time
        </Badge>
      </div>
      {/* Metric Bar Structure mimicking the High Density design */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 border-b border-slate-200 bg-white shrink-0">
        {(isAdmin || isVendor) && (
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {isAdmin ? "Platform Revenue" : "Earnings Potential"}
            </div>
            <div className="text-xl font-bold font-mono">${(metrics.revenue / 1000).toFixed(1)}k</div>
            <div className="text-[10px] text-emerald-600">↑ 14.5% vs last month</div>
          </div>
        )}

        {(isAdmin || isClient) && (
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
              {isAdmin ? "Total Spending" : "Current Budget Utilization"}
            </div>
            <div className="text-xl font-bold font-mono">${(metrics.spending / 1000).toFixed(1)}k</div>
            <div className="text-[10px] text-amber-600">82% of quarterly budget</div>
          </div>
        )}
        
        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Active Deal Rooms</div>
          <div className="text-xl font-bold font-mono">{metrics.activeDeals}</div>
          <div className="text-[10px] text-slate-500">12 pending feedback</div>
        </div>
        
        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">AI Placements</div>
          <div className="text-xl font-bold font-mono">{metrics.placements}</div>
          <div className="text-[10px] text-indigo-600">Avg 92% Match</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
            {isVendor ? "Submission Quality" : "Candidate Quality"}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-600">{metrics.vendorQuality}/100</div>
          <div className="text-[10px] text-slate-500">0% duplicate rate</div>
        </div>

        {isAdmin && (
          <div className="p-3 bg-slate-50 rounded border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Platform Margin</div>
            <div className="text-xl font-bold font-mono text-amber-600">{metrics.avgMargin}%</div>
            <div className="text-[10px] text-slate-500 italic">Target: 20%</div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-indigo-900 text-white rounded-lg p-4 shadow-lg max-w-3xl mb-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2">
            <span className="animate-pulse">✦</span> Intelligence Alert
          </h4>
          <div className="space-y-3">
            <div className="bg-indigo-800 p-3 rounded border border-indigo-700">
              <p className="text-xs font-semibold mb-1 flex items-center gap-2"><Cpu size={14}/> Active Insights</p>
              <ul className="text-[11px] text-indigo-200 space-y-2">
                {isAdmin && <li>• <strong className="text-white">Vendor V-2048</strong> submitted a strong match for REQ-001.</li>}
                {isClient && <li>• <strong className="text-white">Senior React Role</strong> has 3 new high-quality submissions.</li>}
                {isVendor && <li>• <strong className="text-white">Cloud Architect</strong> role is trending. You have 2 potential candidates in your pool.</li>}
                <li>• Cloud Architect (REQ-003) has 0 submissions. Consider deploying AI Outreach Agent.</li>
              </ul>
              <button className="mt-3 w-full py-1.5 bg-indigo-500 hover:bg-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider transition-colors">
                Initiate Guided Workflow
              </button>
            </div>
          </div>
        </div>
        
        <div>
           <div className="text-[10px] font-bold text-slate-400 uppercase pb-2 border-b border-slate-200 mb-4">Operations Feed</div>
           <div className="text-xs text-slate-500">No active operations events. Governance layer is secure.</div>
        </div>
      </div>
    </div>
  );
}
