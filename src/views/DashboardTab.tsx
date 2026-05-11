import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Cpu } from "lucide-react";

export default function DashboardTab() {
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    fetch("/api/metrics").then(res => res.json()).then(setMetrics);
  }, []);

  if (!metrics) return <div className="p-4 flex items-center justify-center text-slate-400 text-xs font-mono animate-pulse">Loading intelligence models...</div>;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Metric Bar Structure mimicking the High Density design */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 border-b border-slate-200 bg-white shrink-0">
        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Platform Revenue</div>
          <div className="text-xl font-bold font-mono">${(metrics.revenue / 1000).toFixed(1)}k</div>
          <div className="text-[10px] text-emerald-600">↑ 14.5% vs last month</div>
        </div>
        
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
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Vendor Quality</div>
          <div className="text-xl font-bold font-mono text-emerald-600">{metrics.vendorQuality}/100</div>
          <div className="text-[10px] text-slate-500">0% duplicate rate</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Avg Margin</div>
          <div className="text-xl font-bold font-mono">{metrics.margin}</div>
          <div className="text-[10px] text-amber-600 text-right font-bold italic underline">Optimize ✦</div>
        </div>

        <div className="p-3 bg-slate-50 rounded border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Recruiter Productivity</div>
          <div className="text-xl font-bold font-mono text-blue-600">{metrics.recruiterProductivity}/100</div>
          <div className="text-[10px] text-slate-500">Top quartile efficiency</div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4">
        {/* We can re-use the AI Copilot Insights box but styled with High Density theme */}
        <div className="bg-indigo-900 text-white rounded-lg p-4 shadow-lg max-w-3xl mb-6">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 mb-3 flex items-center gap-2">
            <span className="animate-pulse">✦</span> Intelligence Alert
          </h4>
          <div className="space-y-3">
            <div className="bg-indigo-800 p-3 rounded border border-indigo-700">
              <p className="text-xs font-semibold mb-1 flex items-center gap-2"><Cpu size={14}/> Active Insights</p>
              <ul className="text-[11px] text-indigo-200 space-y-2">
                <li>• <strong className="text-white">Vendor V-2048</strong> submitted a strong match for REQ-001 with a 94% match probability. Deal Room DR-501 is engaged.</li>
                <li>• Cloud Architect (REQ-003) has 0 submissions. Consider deploying AI Outreach Agent.</li>
                <li>• Client C-8821 response velocity is slowing down. Automated follow-up suggested.</li>
              </ul>
              <button className="mt-3 w-full py-1.5 bg-indigo-500 hover:bg-indigo-400 text-[10px] font-bold rounded uppercase tracking-wider transition-colors">
                Initiate Guided Workflow
              </button>
            </div>
          </div>
        </div>
        
        {/* Placeholder for standard dashboard content if needed */}
        <div>
           <div className="text-[10px] font-bold text-slate-400 uppercase pb-2 border-b border-slate-200 mb-4">Operations Feed</div>
           <div className="text-xs text-slate-500">No active operations events. System is stable.</div>
        </div>
      </div>
    </div>
  );
}
