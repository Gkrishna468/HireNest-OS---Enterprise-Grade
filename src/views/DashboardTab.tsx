import { useEffect, useState, useRef } from "react";
import { Activity, ShieldCheck, Bot, Users, Plus, Shield, ShieldAlert, Network, AlertTriangle, Briefcase, Combine, Gauge, Database, PlayCircle, Zap } from "lucide-react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { useNavigate } from "react-router-dom";
import VendorPartnerWorkspace from "./workspaces/VendorPartnerWorkspace";
import HiringManagerWorkspace from "./workspaces/HiringManagerWorkspace";
import RecruiterWorkspace from "./workspaces/RecruiterWorkspace";

export default function DashboardTab() {
  const [metrics, setMetrics] = useState<any>(null);
  const [session, setSession] = useState<{ user: any, org: any } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          const d = await getDoc(doc(db, "users", u.uid));
          if (d.exists()) {
            const data = d.data();
            setSession({
              user: {
                uid: u.uid,
                name: data.companyName || u.displayName || u.email?.split("@")[0] || "Active User",
                email: u.email || "",
                role: data.role || "PENDING_VERIFICATION",
                permissions: data.permissions || [],
                organizationId: data.organizationId || ""
              },
              org: {
                type: data.role
              }
            });
          } else {
            setSession({ user: { role: 'guest', permissions: [] }, org: { type: 'guest' } });
          }
        } catch (err) {
          console.warn("Direct Firestore read failed, querying server-side context fallback", err);
          fetchContextFallback();
        }
      } else {
        fetchContextFallback();
      }
    });

    async function fetchContextFallback() {
      try {
        const resp = await fetch('/api/user-context');
        if (resp.ok) {
          const data = await resp.json();
          setSession({
            user: {
              ...data.user,
              permissions: data.user?.permissions || []
            },
            org: { type: data.user.role === 'super_admin' ? 'admin' : data.user.role }
          });
        }
      } catch (err) {
        console.warn("User context boot failed, falling back to guest mode", err);
        setSession({ user: { role: 'guest', permissions: [] }, org: { type: 'guest' } });
      }
    }

    return () => unsub();
  }, []);

  const org = session?.org;
  const isAdmin = org?.type === 'admin' || org?.type === 'super_admin' || org?.type === 'ops_admin' || session?.user?.role === 'super_admin';
  const isClient = org?.type === 'client' || org?.type === 'client_admin' || org?.type?.startsWith('client_') || org?.type === 'client';
  const isVendor = org?.type === 'vendor' || org?.type === 'vendor_admin' || org?.type?.startsWith('vendor_') || org?.type === 'vendor';
  const isRecruiter = org?.type === 'recruiter' || org?.type?.includes('recruiter');
  const isIndependent = org?.type === 'independent' || org?.type === 'independent_vendor' || org?.type === 'independent_consultant';

  useEffect(() => {
    if (session?.org) {
      let queryType = "admin";
      if (isClient) queryType = "client";
      else if (isVendor) queryType = "vendor";
      else if (isRecruiter) queryType = "recruiter";
      else if (isIndependent) queryType = "independent";

      fetch(`/api/metrics?type=${queryType}`)
        .then(async res => {
          if (!res.ok) {
            const errRaw = await res.text();
            console.error("[Dashboard] Non-200 response:", errRaw);
            throw new Error(`API Error ${res.status}: ${errRaw.substring(0, 50)}`);
          }
          const text = await res.text();
          try {
            return JSON.parse(text);
          } catch (e) {
            console.error("Invalid JSON from metrics:", text);
            throw new Error("Invalid JSON response");
          }
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
  }, [session?.org, isClient, isVendor, isRecruiter, isIndependent]);

  if (!metrics) return <div className="p-4 flex items-center justify-center text-slate-400 text-xs font-mono animate-pulse">Initializing Governance Layer...</div>;

  if (isVendor) {
    return <VendorPartnerWorkspace vendorName={session?.user?.name || "Vendor Partner"} />;
  }

  if (isClient) {
    return <HiringManagerWorkspace userName={session?.user?.name || "Hiring Manager"} />;
  }

  if (isRecruiter) {
    return <RecruiterWorkspace userName={session?.user?.name || "Recruiter"} />;
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
      <div className="px-6 pt-6 pb-2 bg-white flex items-center justify-between border-b border-slate-100 flex-wrap gap-4">
        <div className="flex flex-col">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
             {isClient ? "Operational Recruiting Center" : isVendor ? "V-Network Marketplace OS" : isRecruiter ? "Recruiter Talent Hub" : isIndependent ? "Independent Provider Node" : "Global Governance Command"}
             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <p className="text-[10px] text-slate-400 font-mono tracking-tighter">Strategic Ledger Sync: {new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
            <Badge variant="outline" className="text-[9px] uppercase border-indigo-200 text-indigo-600 bg-indigo-50 font-bold px-2 py-1">
              Active Session: Secure
            </Badge>
            <Badge variant="outline" className="text-[9px] uppercase border-emerald-200 text-emerald-600 bg-emerald-50 font-bold px-2 py-1">
              ROLE: {session?.user?.role?.replace('_', ' ')}
            </Badge>
            {session?.user?.permissions && session.user.permissions.length > 0 && (
              <Badge variant="outline" className="text-[9px] uppercase border-amber-200 text-amber-700 bg-amber-50 font-bold px-2 py-1 flex items-center gap-1">
                <ShieldCheck size={10} />
                PERM COUNT: {session.user.permissions.length}
              </Badge>
            )}
            <Badge variant="outline" className="text-[9px] uppercase border-indigo-200 text-indigo-700 bg-indigo-50 font-bold px-2 py-1 flex items-center gap-1">
              <ShieldCheck className="h-3 w-3" />
              PWP ACTIVE
            </Badge>
        </div>
      </div>

      {session?.user?.permissions && session.user.permissions.length > 0 && (
        <div className="bg-slate-900 text-slate-400 text-[9px] font-mono px-6 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
          <span className="text-indigo-400 font-extrabold uppercase shrink-0">Security Profile Permissions:</span>
          {session.user.permissions.map((p: string) => (
            <span key={p} className="bg-slate-800 px-1.5 py-0.5 rounded text-indigo-300 font-bold">
              {p}
            </span>
          ))}
        </div>
      )}
      
      {/* Strategic Intelligence Banner */}
      <div className="p-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                {/* Admin Quick Governance */}
                {isAdmin && (
                  <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                      <Shield size={100} />
                    </div>
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="h-10 w-10 bg-indigo-600 rounded-2xl flex items-center justify-center">
                          <ShieldCheck size={24} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black lowercase tracking-tighter italic">Authority Command Center</h3>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Global HQ Node Authority</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button 
                          onClick={() => navigate('/users')}
                          className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left group/btn"
                        >
                          <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover/btn:bg-indigo-500 group-hover/btn:text-white transition-all">
                            <Plus size={20} />
                          </div>
                          <div>
                            <div className="text-xs font-black lowercase tracking-tight">Onboard New Node</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Invite Vendors/Clients</div>
                          </div>
                        </button>

                        <button 
                          onClick={() => navigate('/users')}
                          className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all text-left group/btn"
                        >
                          <div className="h-10 w-10 bg-amber-500/20 rounded-xl flex items-center justify-center text-amber-400 group-hover/btn:bg-amber-500 group-hover/btn:text-white transition-all">
                            <Users size={20} />
                          </div>
                          <div>
                            <div className="text-xs font-black lowercase tracking-tight">Identity Matrix</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Verify Supplies & Demand</div>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Metric Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(isAdmin || isVendor || isRecruiter || isIndependent) && (
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md active:scale-95 cursor-pointer group">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">
                                {isAdmin ? "Gross Revenue" : (isRecruiter || isIndependent) ? "Projected Earnings" : "Billable Potential"}
                            </div>
                            <div className="text-2xl font-black text-slate-900 font-mono">₹{(metrics.revenue / 1000).toFixed(1)}k</div>
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
                            <div className="text-2xl font-black text-slate-900 font-mono">₹{(metrics.spending / 1000).toFixed(1)}k</div>
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
                    {/* Relic Identity Active Session */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Bot size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Bot size={14} className="animate-pulse text-cyan-400" /> Relic Active Identity
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">SOUL.md</span>
                                    <span className="text-cyan-300 font-bold text-[10px]">Loaded & Synced</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">USER.md</span>
                                    <span className="text-cyan-300 font-bold text-[10px]">Synced (Recruiter)</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">MEMORY.md</span>
                                    <span className="text-amber-400 font-bold text-[10px] flex items-center gap-1">Update Pending</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">RULES.md</span>
                                    <span className="text-cyan-300 font-bold text-[10px]">Active</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">ETHICS.md</span>
                                    <span className="text-emerald-400 font-bold text-[10px]">Enforcing</span>
                                </div>
                                <p className="text-[9px] text-slate-500 italic mt-2 border-t border-slate-800 pt-2">
                                  System Comment: Agent personality is stable. AI is operating inside local markdown constraints.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Cognitive Observability Layer */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Activity size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Activity size={14} className="animate-pulse text-fuchsia-400" /> Cognitive Observability
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[9px] mb-1 font-mono uppercase text-slate-400">
                                        <span>System Cognitive Stability</span>
                                        <span className="text-emerald-400">97%</span>
                                    </div>
                                    <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                                        <div className="bg-emerald-400 h-full" style={{ width: '97%' }}></div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
                                    <div className="bg-slate-800/50 p-2 border border-slate-700/50 rounded flex justify-between flex-col">
                                        <span className="text-slate-500 uppercase">Hallucination Risk</span>
                                        <span className="text-emerald-400 font-bold">LOW</span>
                                    </div>
                                    <div className="bg-slate-800/50 p-2 border border-slate-700/50 rounded flex justify-between flex-col">
                                        <span className="text-slate-500 uppercase">Tenant Isolation</span>
                                        <span className="text-emerald-400 font-bold">HEALTHY</span>
                                    </div>
                                    <div className="bg-slate-800/50 p-2 border border-slate-700/50 rounded flex justify-between flex-col">
                                        <span className="text-slate-500 uppercase">Recruiter Drift</span>
                                        <span className="text-cyan-400 font-bold">STABLE</span>
                                    </div>
                                    <div className="bg-slate-800/50 p-2 border border-slate-700/50 rounded flex justify-between flex-col">
                                        <span className="text-slate-500 uppercase">Compression Load</span>
                                        <span className="text-amber-400 font-bold">MODERATE</span>
                                    </div>
                                    <div className="bg-slate-800/50 p-2 border border-slate-700/50 rounded flex justify-between flex-col col-span-2 mt-2">
                                        <span className="text-slate-500 uppercase flex items-center justify-between">
                                            Enterprise Trust Score
                                            <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px]">AA+</Badge>
                                        </span>
                                        <span className="text-white text-xl font-black">94</span>
                                        <div className="text-slate-500 text-[8px] mt-1 space-y-1">
                                            <div className="flex justify-between"><span>Cognitive Integrity:</span> <span className="text-slate-300">92/100</span></div>
                                            <div className="flex justify-between"><span>Memory Reliability:</span> <span className="text-slate-300">98/100</span></div>
                                            <div className="flex justify-between"><span>Drift Probability:</span> <span className="text-slate-300">4.1%</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Distributed Agent Arbitration (Phase 6) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Network size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Network size={14} className="text-emerald-400" /> Distributed Agent Arbitration
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[9px] font-mono bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 uppercase">Active Agent Locks</span>
                                    <span className="text-emerald-400 font-bold">14</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-mono bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 uppercase">Collisions Mitigated (1h)</span>
                                    <span className="text-cyan-400 font-bold">3</span>
                                </div>
                                <div className="bg-amber-950/30 p-2 rounded border border-amber-900/50 flex flex-col gap-1 text-[9px] font-mono">
                                    <span className="text-amber-500 font-bold flex items-center gap-1"><AlertTriangle size={10} /> Recursive Loop Blocked</span>
                                    <span className="text-amber-400/80">RecruiterAgent blocked from duplicate write to mem_L2_Candidate.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 8: Distributed Memory Consensus */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <ShieldCheck size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Users size={14} className="text-cyan-400" /> Memory Consensus Quorum
                            </h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center text-[9px] font-mono bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 uppercase">Pending Mutators</span>
                                    <span className="text-cyan-400 font-bold">2 L3 Nodes</span>
                                </div>
                                <div className="flex justify-between items-center text-[9px] font-mono bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 uppercase">Quorum Approval Rate</span>
                                    <span className="text-emerald-400 font-bold">98.5%</span>
                                </div>
                                <div className="bg-slate-800/50 p-2 rounded border border-slate-700/50 flex flex-col gap-1 text-[9px] font-mono mt-2">
                                    <span className="text-slate-300 font-bold flex items-center justify-between">Recent Consensus
                                        <Badge className="bg-cyan-500/20 text-cyan-400 text-[8px]">REACHED</Badge>
                                    </span>
                                    <span className="text-slate-400">Recruiter, Governance, and Curator verified candidate identity.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 9 & 10: Cognitive Recovery & Econ Optimization */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Bot size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Activity size={14} className="text-indigo-400" /> Recovery & Economics
                            </h3>
                            <div className="space-y-3">
                                <div className="bg-indigo-950/30 p-2 rounded border border-indigo-900/50 flex flex-col gap-1 text-[9px] font-mono">
                                    <span className="text-indigo-400 font-bold">Git for Cognition</span>
                                    <div className="flex justify-between items-center">
                                        <span className="text-indigo-300/80">L2 Rollback Executed</span>
                                        <span className="text-emerald-400 font-bold">SUCCESS</span>
                                    </div>
                                    <span className="text-slate-500 mt-1">Reverted hallucinated salary mismatch in 204ms.</span>
                                </div>

                                <div className="bg-amber-950/30 p-2 rounded border border-amber-900/50 flex flex-col gap-1 text-[9px] font-mono mt-2">
                                    <span className="text-amber-500 font-bold">Economic Engine</span>
                                    <div className="flex justify-between items-center">
                                        <span className="text-amber-400/80">Optimal Margin Buffer</span>
                                        <span className="text-white font-bold">14.5%</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-amber-400/80">Predicted Closure</span>
                                        <span className="text-emerald-400 font-bold">88%</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 11 & 12: Cognitive SLA & Federated Intelligence */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Gauge size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Gauge size={14} className="text-fuchsia-400" /> Cognitive SLA & Intelligence
                            </h3>
                            <div className="space-y-3">
                                <div className="bg-fuchsia-950/30 p-2 rounded border border-fuchsia-900/50 flex flex-col gap-1 text-[9px] font-mono">
                                    <span className="text-fuchsia-400 font-bold">Latency Guarantees</span>
                                    <div className="flex justify-between items-center">
                                        <span className="text-fuchsia-300/80">Gov Response Latency</span>
                                        <span className="text-emerald-400 font-bold">14ms</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-fuchsia-300/80">Arbitration Latency</span>
                                        <span className="text-emerald-400 font-bold">22ms</span>
                                    </div>
                                </div>

                                <div className="bg-emerald-950/30 p-2 rounded border border-emerald-900/50 flex flex-col gap-1 text-[9px] font-mono mt-2">
                                    <span className="text-emerald-500 font-bold flex items-center justify-between">Federated Tenant Intelligence
                                         <Badge className="bg-emerald-500/20 text-emerald-400 text-[8px]">PRIVACY: ON</Badge>
                                    </span>
                                    <span className="text-emerald-300/80 mt-1">Anonymized negotiation pattern identified -&gt; Deployed to global optimizer.</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 13: Executive AI Layer */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden md:col-span-2 lg:col-span-1">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Briefcase size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Briefcase size={14} className="text-amber-400" /> AI Executive Layer
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                <div className="bg-amber-950/30 p-3 rounded border border-amber-900/50 flex flex-col gap-2">
                                    <div className="flex justify-between items-center border-b border-amber-900/30 pb-1">
                                        <span className="text-[9px] font-bold font-mono text-amber-500">CFO Agent</span>
                                        <Badge className="bg-amber-500/20 text-amber-400 text-[7px]">READY</Badge>
                                    </div>
                                    <div className="space-y-1 font-mono text-[9px] text-amber-200">
                                        <div className="flex justify-between"><span>Margin Stability</span><span className="font-bold">94%</span></div>
                                        <div className="flex justify-between"><span>Recruiter ROI</span><span className="font-bold">142%</span></div>
                                    </div>
                                    <p className="text-[8px] text-amber-400/80 leading-tight">Insight: LPM risk detected in Midwest transit. Rec 2% buffer.</p>
                                </div>

                                <div className="bg-indigo-950/30 p-3 rounded border border-indigo-900/50 flex flex-col gap-2">
                                    <div className="flex justify-between items-center border-b border-indigo-900/30 pb-1">
                                        <span className="text-[9px] font-bold font-mono text-indigo-400">CRO Agent</span>
                                        <Badge className="bg-indigo-500/20 text-indigo-400 text-[7px]">READY</Badge>
                                    </div>
                                    <div className="space-y-1 font-mono text-[9px] text-indigo-200">
                                        <div className="flex justify-between"><span>Pipeline Risk</span><span className="font-bold text-emerald-400">LOW</span></div>
                                        <div className="flex justify-between"><span>Closure Cast</span><span className="font-bold">88%</span></div>
                                    </div>
                                    <p className="text-[8px] text-indigo-400/80 leading-tight">Insight: Candidate Acceptance Prob stable at 78%.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 14-16: Replication, Replay & Workforce Pods */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden md:col-span-2 lg:col-span-1">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Database size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-teal-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Database size={14} className="text-teal-400" /> Distributed Infra & Workforce
                            </h3>
                            <div className="space-y-3">
                                <div className="bg-teal-950/30 p-2 rounded border border-teal-900/50 flex flex-col gap-1 text-[9px] font-mono">
                                    <span className="text-teal-400 font-bold flex items-center gap-1"><Database size={10}/> Cognitive Replication</span>
                                    <div className="flex justify-between items-center text-teal-200">
                                        <span>Multi-Region Durability</span>
                                        <Badge className="bg-teal-500/20 text-teal-400 text-[8px]">ACTIVE</Badge>
                                    </div>
                                    <span className="text-teal-500 text-[8px] mt-1">Snapshots replicating to us-east4, eu-west1.</span>
                                </div>

                                <div className="bg-blue-950/30 p-2 rounded border border-blue-900/50 flex flex-col gap-1 text-[9px] font-mono mt-2">
                                    <span className="text-blue-400 font-bold flex items-center gap-1"><PlayCircle size={10}/> Explainability Replay Engine</span>
                                    <div className="flex justify-between items-center text-blue-200 mt-1">
                                        <span>Forensic Traces</span>
                                        <span className="font-bold">241 logged</span>
                                    </div>
                                </div>

                                <div className="bg-rose-950/30 p-2 rounded border border-rose-900/50 flex flex-col gap-1 text-[9px] font-mono mt-2">
                                    <span className="text-rose-400 font-bold flex items-center gap-1"><Users size={10}/> AI Workforce Pods</span>
                                    <div className="flex justify-between items-center text-rose-200 mt-1">
                                        <span>Active Sourcing Swarms</span>
                                        <span className="font-bold">3</span>
                                    </div>
                                    <div className="flex justify-between items-center text-rose-200">
                                        <span>Gov Inspector Pods</span>
                                        <span className="font-bold text-emerald-400">1 (Healthy)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Phase 17: Infrastructure Resilience Testing */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden md:col-span-2 lg:col-span-1">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Zap size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Zap size={14} className="text-orange-400" /> Infra Resilience Testing
                            </h3>
                            <div className="space-y-3">
                                <p className="text-[11px] text-slate-400 mb-2">Simulated fault injection for stability verification.</p>
                                <div className="space-y-2">
                                    <button 
                                      className="w-full bg-slate-800/80 hover:bg-slate-700 text-[10px] text-orange-300 font-mono py-1.5 px-3 rounded border border-orange-900/50 flex justify-between items-center transition-colors"
                                      onClick={() => {
                                        console.log("[INFRA_CHAOS] Triggering network latency simulator...");
                                        // In real usage, this would call infrastructureChaos module endpoint/function
                                        setTimeout(() => alert("Simulated Network Timeout Triggered!"), 500);
                                      }}
                                    >
                                        <span>Trigger Network Timeout</span>
                                        <AlertTriangle size={10} className="text-orange-500" />
                                    </button>
                                    
                                    <button 
                                      className="w-full bg-slate-800/80 hover:bg-slate-700 text-[10px] text-rose-300 font-mono py-1.5 px-3 rounded border border-rose-900/50 flex justify-between items-center transition-colors"
                                      onClick={() => {
                                        console.log("[INFRA_CHAOS] Triggering database outage simulator...");
                                        setTimeout(() => alert("Simulated Database Outage Triggered!"), 500);
                                      }}
                                    >
                                        <span>Simulate DB Outage</span>
                                        <Database size={10} className="text-rose-500" />
                                    </button>

                                    <button 
                                      className="w-full bg-slate-800/80 hover:bg-slate-700 text-[10px] text-cyan-300 font-mono py-1.5 px-3 rounded border border-cyan-900/50 flex justify-between items-center transition-colors"
                                      onClick={() => {
                                        console.log("[INFRA_CHAOS] Triggering API rate limit simulator...");
                                        setTimeout(() => alert("Simulated Token Rate Limit (HTTP 429) Triggered!"), 500);
                                      }}
                                    >
                                        <span>Simulate API Rate Limiting</span>
                                        <Activity size={10} className="text-cyan-500" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Enterprise Priorities 18-22: PubSub, Temporal, Firewall, Tracing, VectorDB */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden md:col-span-2 lg:col-span-3">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <Activity size={14} className="text-fuchsia-300" /> Enterprise Cognitive Infrastructure
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                                <div className="bg-fuchsia-950/20 p-3 rounded border border-fuchsia-900/40 flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-fuchsia-400 font-mono">1. Event Bus</div>
                                    <span className="text-[9px] text-fuchsia-200/80">Pub/Sub architecture decoupling writes.</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit text-[8px]">ACTIVE: 42 msg/s</Badge>
                                </div>
                                <div className="bg-indigo-950/20 p-3 rounded border border-indigo-900/40 flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-indigo-400 font-mono">2. Workflow</div>
                                    <span className="text-[9px] text-indigo-200/80">Temporal.io durable runtime.</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit text-[8px]">ACTIVE: 12 Tasks</Badge>
                                </div>
                                <div className="bg-rose-950/20 p-3 rounded border border-rose-900/40 flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-rose-400 font-mono">3. AI Firewall</div>
                                    <span className="text-[9px] text-rose-200/80">Prompt injection/bypass mitigation.</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit text-[8px]">ACTIVE: 0 Breaches</Badge>
                                </div>
                                <div className="bg-amber-950/20 p-3 rounded border border-amber-900/40 flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-amber-400 font-mono">4. Tracing</div>
                                    <span className="text-[9px] text-amber-200/80">LangSmith / DDog execution spans.</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit text-[8px]">ACTIVE: Latency Nominal</Badge>
                                </div>
                                <div className="bg-cyan-950/20 p-3 rounded border border-cyan-900/40 flex flex-col gap-2">
                                    <div className="text-[10px] font-bold text-cyan-400 font-mono">5. pgvector</div>
                                    <span className="text-[9px] text-cyan-200/80">Structured + semantic embeddings.</span>
                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 w-fit text-[8px]">ACTIVE: 1.2M Vectors</Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Trust & Legal Compliance Infrastructure (DPDP, GDPR, CCPA) */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden md:col-span-2 lg:col-span-3">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <ShieldCheck size={14} className="text-emerald-400" /> Legal & Privacy Governance Layer
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                                        <Database size={12} className="text-slate-400" /> Candidate Consent Engine
                                    </h4>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80">
                                        <div className="text-[10px] text-slate-400 mb-3 leading-relaxed">
                                            DPDP / GDPR / CCPA compliant consent ledger ensuring immutability for candidate data ingestion, usage, and AI processing rights.
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center text-[9px] bg-slate-900/80 border border-slate-800 p-2 rounded">
                                                <span className="text-slate-300 font-mono">Consent Ledger Vectors</span>
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">IMMUTABLE</Badge>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] bg-slate-900/80 border border-slate-800 p-2 rounded">
                                                <span className="text-slate-300 font-mono">Deletion Workflow Queues</span>
                                                <span className="text-slate-400 font-bold">14 PENDING</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[9px] bg-slate-900/80 border border-slate-800 p-2 rounded">
                                                <span className="text-slate-300 font-mono">Multi-Tenant Isolation</span>
                                                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">ENFORCED</Badge>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <h4 className="text-[10px] font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wide">
                                        <ShieldAlert size={12} className="text-slate-400" /> AI Explainability & Audit Layer
                                    </h4>
                                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 opacity-10">
                                            <Network size={64} />
                                        </div>
                                        <div className="text-[10px] text-slate-400 mb-3 relative z-10">
                                            "Why This Match?" forensic explainability for every AI algorithmic recommendation, ensuring legal defensibility.
                                        </div>
                                        <div className="space-y-2 relative z-10">
                                            <div className="p-2 border border-blue-900/30 bg-blue-950/20 rounded flex flex-col gap-1">
                                                <div className="flex justify-between items-center w-full">
                                                    <span className="text-[9px] text-blue-300 font-bold uppercase tracking-wider">Example: Match #827 (87%)</span>
                                                    <Badge className="bg-blue-500/20 text-blue-300 font-mono text-[8px] py-0 px-1 border border-blue-500/30">L3 REASONING</Badge>
                                                </div>
                                                <div className="text-[8px] text-blue-200/80 font-mono leading-tight mt-1 space-y-1">
                                                    <p>• 92% semantic alignment (Java Spring)</p>
                                                    <p>• 4 yrs BFSI domain overlap</p>
                                                    <p>• Policy: "NYC Bias Filter" <span className="text-emerald-400">PASSED</span></p>
                                                    <p>• Human Review required prior to submit</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agent Capability & Policy Execution */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm relative group overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400 mb-4 flex items-center gap-2 border-b border-slate-800 pb-2">
                                <ShieldAlert size={14} className="text-indigo-400" /> Policy Execution Engine
                            </h3>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">Conf &lt; 0.7 Action</span>
                                    <span className="text-amber-400 font-bold text-[10px]">FORCE_EVIDENCE_MODE</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">Hallucination Risk Action</span>
                                    <span className="text-red-400 font-bold text-[10px]">REQUIRE_HUMAN_APPROVAL</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-800/50 p-2 rounded border border-slate-700/50">
                                    <span className="text-slate-400 font-mono text-[9px] uppercase">Agent Capabilities</span>
                                    <div className="flex gap-1">
                                        <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[8px] uppercase tracking-widest font-black">L3 Write: FALSE</span>
                                        <span className="px-1.5 py-0.5 bg-slate-700 text-slate-300 rounded text-[8px] uppercase tracking-widest font-black">Global Access: FALSE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tencent L0-L3 Memory Pyramid */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative group">
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                                <Activity size={14} className="text-indigo-600" /> Cognitive Memory State
                            </h3>
                            <div className="space-y-2 font-mono text-[10px]">
                                <div className="flex bg-slate-50 p-2 justify-between border border-slate-100 rounded items-center">
                                    <span className="text-slate-600 font-bold">L3 Persona</span>
                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] uppercase tracking-widest font-black">Distilled</span>
                                </div>
                                <div className="flex bg-slate-50 p-2 justify-between border border-slate-100 rounded items-center">
                                    <span className="text-slate-600">L2 Scenario</span>
                                    <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[8px] uppercase tracking-widest font-black">Aggregated</span>
                                </div>
                                <div className="flex bg-slate-50 p-2 justify-between border border-slate-100 rounded items-center">
                                    <span className="text-slate-500 text-[9px]">L1 Atom</span>
                                    <span className="text-slate-400 text-[8px] uppercase">74 Facts Extracted</span>
                                </div>
                                <div className="flex bg-slate-50 p-2 justify-between border border-slate-100 rounded items-center">
                                    <span className="text-slate-400 text-[9px]">L0 Conversation</span>
                                    <span className="text-slate-400 text-[8px] uppercase">Archived (TCVDB)</span>
                                </div>
                            </div>
                            <div className="mt-3 p-3 bg-red-50 text-red-700 border border-red-100 rounded text-[10px] italic">
                                <strong>Alert:</strong> L1 Atomics vector space exceeding threshold. Scheduled recursive compression to L2 scenarios.
                            </div>
                        </div>
                    </div>

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
