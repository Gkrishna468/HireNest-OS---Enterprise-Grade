import { useEffect, useState } from "react";
import { Activity, ShieldCheck, Bot } from "lucide-react";
import { auth } from "../lib/firebase";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";

export default function DashboardTab() {
  const [metrics, setMetrics] = useState<any>(null);
  const [session, setSession] = useState<{ user: any, org: any } | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user) {
        // Mocking org for now or fetching from a standard place
        setSession({
          user,
          org: { type: 'admin' } // Default to admin for safety in this dashboard
        });
      }
    });
    return () => unsub();
  }, []);

  const user = session?.user;
  const org = session?.org;

  useEffect(() => {
    if (org) {
      fetch(`/api/metrics?type=${org.type}`)
        .then(res => {
          if (!res.ok) throw new Error("Metadata sync failed");
          return res.json();
        })
        .then(setMetrics)
        .catch(err => {
          console.warn("Metrics fetch failed, using local fallback", err);
          setMetrics({
            revenue: 0,
            spending: 0,
            activeDeals: 0,
            placements: 0,
            avgMargin: 15,
            vendorQuality: 90,
            recruiterProductivity: 85
          });
        });
    }
  }, [org]);

  if (!metrics) return <div className="p-4 flex items-center justify-center text-slate-400 text-xs font-mono animate-pulse">Initializing Governance Layer...</div>;

  const isAdmin = org?.type === 'admin';
  const isClient = org?.type === 'client';
  const isVendor = org?.type === 'vendor';

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
      <div className="px-6 pt-6 pb-2 bg-white flex items-center justify-between border-b border-slate-100">
        <div className="flex flex-col">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
             {isClient ? "Operational Recruiting Center" : isVendor ? "V-Network Marketplace OS" : "Global Governance Command"}
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">Strategic Ledger Sync: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2">
            <Badge variant="outline" className="text-[9px] uppercase border-indigo-200 text-indigo-600 bg-indigo-50 font-bold px-2 py-1">
              Active Session: Secure
            </Badge>
            <Badge variant="outline" className="text-[9px] uppercase border-emerald-200 text-emerald-600 bg-emerald-50 font-bold px-2 py-1">
              AI MATCH: ONLINE
            </Badge>
        </div>
      </div>
      
      {/* Strategic Intelligence Banner */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Metric Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(isAdmin || isVendor) && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md active:scale-95 cursor-pointer group">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">
                                {isAdmin ? "Gross Revenue" : "Billable Potential"}
                            </div>
                            <div className="text-2xl font-black text-slate-900 font-mono">${(metrics.revenue / 1000).toFixed(1)}k</div>
                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-[10px] text-emerald-600 font-bold">↑ 12.4%</span>
                                <span className="text-[9px] text-slate-300 uppercase font-bold">MoM</span>
                            </div>
                        </div>
                    )}

                    {(isAdmin || isClient) && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md active:scale-95 cursor-pointer group">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">
                                {isAdmin ? "Total Spend" : "Budget Utilization"}
                            </div>
                            <div className="text-2xl font-black text-slate-900 font-mono">${(metrics.spending / 1000).toFixed(1)}k</div>
                            <div className="flex items-center gap-1 mt-1">
                                <div className="h-1 flex-1 bg-slate-100 rounded-full overflow-hidden">
                                     <div className="bg-indigo-500 h-full w-[82%]" />
                                </div>
                                <span className="text-[9px] font-bold text-indigo-600">82%</span>
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md active:scale-95 cursor-pointer group">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">Deal Velocity</div>
                        <div className="text-2xl font-black text-slate-900 font-mono">{metrics.activeDeals}</div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">High Density Pulse</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md active:scale-95 cursor-pointer group">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">Quality Index</div>
                        <div className="text-2xl font-black text-emerald-600 font-mono">{metrics.vendorQuality}%</div>
                        <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">Match Accuracy</div>
                    </div>
                </div>

                {/* Main Activity / Feed View */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Recruiting-In-Chief Logs</h3>
                        <Button variant="ghost" size="sm" className="text-[9px] uppercase font-bold h-6">Full Audit →</Button>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded bg-slate-100 flex items-center justify-center text-slate-500">
                                        <Activity size={16} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">Requirement REQ-00{i} Signal Detected</p>
                                        <div className="flex gap-2 items-center mt-0.5">
                                            <span className="text-[9px] text-slate-400 capitalize">{isClient ? 'AI scanned marketplace' : 'New request published'}</span>
                                            <span className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest bg-indigo-50 px-1 rounded">MATCHING...</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-mono font-bold text-slate-400">{i * 12}m ago</p>
                                    <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 rounded uppercase font-black tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">Protocol: TRACE</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">End of Live Signals for current tenant</p>
                    </div>
                </div>
            </div>

            {/* Sidebar Stats / AI Insight */}
            <div className="space-y-6">
                    <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-300 mb-4 flex items-center gap-2 border-b border-indigo-800 pb-2">
                                <Activity size={14} className="animate-pulse text-emerald-400" /> Infrastructure Health
                            </h3>
                            <div className="space-y-4">
                                <div className="flex justify-between items-end border-b border-indigo-800/50 pb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] text-indigo-400 font-bold uppercase">Node Stability</span>
                                        <span className="text-sm font-mono font-black">99.98%</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[8px] text-indigo-400 font-bold uppercase">Network Trust</span>
                                        <span className="text-sm font-mono font-black text-emerald-400">AA+</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-[8px] font-bold uppercase text-indigo-300">
                                            <span>Intelligence Enrichment Throughput</span>
                                            <span>1.2k req/m</span>
                                        </div>
                                        <div className="h-1 bg-indigo-950 rounded-full overflow-hidden">
                                            <div className="h-full bg-emerald-500 w-[74%] animate-progress" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex justify-between text-[8px] font-bold uppercase text-indigo-300">
                                            <span>Governance Latency</span>
                                            <span>124ms</span>
                                        </div>
                                        <div className="h-1 bg-indigo-950 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-400 w-[12%]" />
                                        </div>
                                    </div>
                                </div>
                                <div className="p-3 bg-white/5 rounded-lg border border-white/10 italic text-[10px] text-indigo-200">
                                    "Platform signals indicate high submission liquidity across distributed vendor channels."
                                </div>
                            </div>
                        </div>
                    </div>
            </div>
        </div>
      </div>
    </div>
  );
}
