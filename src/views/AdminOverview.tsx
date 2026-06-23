import { useEffect, useState, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { Users, Briefcase, DollarSign, Activity, Shield, ChevronRight, Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";

export default function AdminOverview() {
  const [data, setData] = useState<any>({ 
    candidates: [], 
    organizations: [], 
    dealRooms: [], 
    requirements: [], 
    submissions: [],
    onboardingRequests: [] 
  });
  const [matchHealth, setMatchHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionStatus, setActionStatus] = useState<string>("");
  const [isActionLoading, setIsActionLoading] = useState<string>("");
  const [targetReqId, setTargetReqId] = useState<string>("");
  const navigate = useNavigate();

  // Derived Financial Metrics
  const totalBilling = data.requirements.reduce((acc: number, req: any) => acc + (req.financials?.clientBudget || 0), 0);
  const totalMargin = data.requirements.reduce((acc: number, req: any) => acc + (req.financials?.adminMargin || 0), 0);
  const avgMarginPercent = totalBilling > 0 ? (totalMargin / totalBilling) * 100 : 0;
  const pendingExposure = data.requirements
    .filter((r: any) => r.status === 'PENDING_FINANCIAL_APPROVAL')
    .reduce((acc: number, req: any) => acc + (req.clientTargetBudget || 0), 0);

  const pendingOnboarding = data.onboardingRequests.filter((r: any) => r.verificationStatus === 'PENDING').length;
  const verifiedNodes = data.organizations.length;
  const totalNodesExpected = verifiedNodes + data.onboardingRequests.length;
  const verificationPercent = totalNodesExpected > 0 ? Math.round((verifiedNodes / totalNodesExpected) * 100) : 0;

  const authStats = {
    business: data.onboardingRequests.filter((r: any) => r.gstNumber || r.type === 'client' || r.type === 'vendor').length,
    identity: data.onboardingRequests.filter((r: any) => r.aadhaarNumber).length,
    email: data.onboardingRequests.filter((r: any) => r.email).length,
    total: data.onboardingRequests.length || 1
  };

  const fetchDataInitialized = useRef(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !fetchDataInitialized.current) {
        fetchData();
        fetchDataInitialized.current = true;
      } else if (!user) {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const govResp = await fetch('/api/governance', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (govResp.ok) {
          const resData = await govResp.json();
          setData({
              candidates: resData.candidates || [],
              organizations: resData.organizations || [],
              dealRooms: resData.dealRooms || [],
              requirements: resData.requirements || [],
              submissions: resData.submissions || [],
              onboardingRequests: resData.onboarding_requests || [] // Keep original key for now or update if needed
          });
        }
        
        const healthResp = await fetch('/api/match-health?role=adminHQ', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (healthResp.ok) {
            const hData = await healthResp.json();
            if (hData.success) setMatchHealth(hData.data);
        }
    } catch (err: any) {
        console.warn("[Admin Overview] Data sync skipped or failed:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-xl font-black text-slate-900 lowercase tracking-tighter italic">operational trust infrastructure</h1>
            <p className="text-xs text-slate-500 font-bold lowercase">global synchronization across the verified staffing execution network.</p>
        </div>
        <div className="flex items-center space-x-3">
           <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
              <Shield size={12} />
              <span>network healthy</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Verified Req Pool", value: data.requirements.length, icon: Briefcase, color: "text-indigo-600", desc: "authenticated demand" },
          { label: "Governance Volume", value: `₹${Math.round(totalMargin / 1000)}k`, icon: DollarSign, color: "text-emerald-600", desc: "platform profit capture" },
          { label: "Onboarding Queue", value: pendingOnboarding, icon: Users, color: "text-amber-600", desc: "Awaiting Network Admission", action: () => navigate('/users') },
          { label: "Node Population", value: data.organizations.length, icon: Shield, color: "text-slate-900", desc: "entities in execution" }
        ].map((stat) => (
          <div 
            key={stat.label} 
            onClick={stat.action}
            className={cn(
              "bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm transition-all",
              stat.action ? "cursor-pointer hover:border-indigo-200 hover:shadow-xl hover:scale-[1.02]" : "hover:shadow-md"
            )}
          >
             <div className="flex items-center justify-between mb-4">
               <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
               </div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
             </div>
             <div className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{stat.value}</div>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={() => navigate('/governance')} className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
            <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
              <Shield size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">View Audit Logs</h4>
              <p className="text-xs text-slate-500">Monitor system governance</p>
            </div>
          </button>
          <button onClick={() => navigate('/hq')} className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
            <div className="bg-amber-50 text-amber-600 p-3 rounded-lg group-hover:bg-amber-100 transition-colors">
              <Activity size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Review Delete Requests</h4>
              <p className="text-xs text-slate-500">Manage data erasure</p>
            </div>
          </button>
          <button onClick={() => navigate('/health')} className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
            <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg group-hover:bg-emerald-100 transition-colors">
              <TrendingUp size={20} />
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">Operational Intelligence</h4>
              <p className="text-xs text-slate-500">Executive dashboard & platform funnel</p>
            </div>
          </button>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 mt-2">
      {actionStatus && <div className="text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-lg">{actionStatus}</div>}
      
      <div className="flex gap-4 items-center">
         <input 
             placeholder="Optional Req ID to specifically purge/refresh" 
             value={targetReqId} 
             onChange={e => setTargetReqId(e.target.value)} 
             className="px-4 py-2 text-sm border border-slate-200 rounded-lg w-72"
         />
      </div>

      <div className="flex justify-start gap-4">
          <Button 
            disabled={isActionLoading !== ""}
            onClick={async () => {
              setIsActionLoading("refresh");
              setActionStatus(targetReqId ? `Refreshing matches for Req ${targetReqId}...` : "Refreshing global Matrix...");
              try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/rescan-matches', { 
                  method: 'POST', 
                  headers: {
                    'Content-Type':'application/json',
                    'Authorization': `Bearer ${token}`
                  }, 
                  body: JSON.stringify({role: 'adminHQ', reqId: targetReqId || undefined}) 
                });
                const d = await res.json();
                if (d.success) {
                   setActionStatus(`Refresh complete. Updated ${d.matchUpdatesCount} matches.`);
                } else {
                   setActionStatus("Error: " + d.error);
                }
              } catch(e:any) {
                setActionStatus("Error: " + e.message);
              } finally {
                setIsActionLoading("");
                setTimeout(() => setActionStatus(""), 8000);
              }
            }}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-4 py-2 text-sm rounded-[20px] flex items-center shadow-sm"
          >
            <Sparkles size={16} className="mr-2"/> {isActionLoading === "refresh" ? "Working..." : "Refresh Scores (AI)"}
          </Button>

          <Button 
            disabled={isActionLoading !== ""}
            onClick={async () => {
              setIsActionLoading("cleanup");
              setActionStatus(targetReqId ? `Force purging all matches for Req ${targetReqId}...` : "Cleaning up orphaned/invalid matches globally...");
              try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/cleanup-matches', { 
                  method: 'POST', 
                  headers: {
                    'Content-Type':'application/json',
                    'Authorization': `Bearer ${token}`
                  }, 
                  body: JSON.stringify({role: 'adminHQ', reqId: targetReqId || undefined}) 
                });
                const d = await res.json();
                if (d.success) {
                   setActionStatus(`Cleanup complete. Deleted ${d.deletedMatchesCount} old records.`);
                   fetchData();
                } else {
                   setActionStatus("Error: " + d.error);
                }
              } catch(e:any) {
                setActionStatus("Error: " + e.message);
              } finally {
                setIsActionLoading("");
                setTimeout(() => setActionStatus(""), 8000);
              }
            }}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 text-sm rounded-[20px] flex items-center shadow-sm"
          >
            <Shield size={16} className="mr-2"/> {isActionLoading === "cleanup" ? "Working..." : "Cleanup Matches / Force Purge Req"}
          </Button>

          <Button 
            disabled={isActionLoading !== ""}
            onClick={async () => {
              setIsActionLoading("backfill");
              setActionStatus("Running migration backfill...");
              try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/admin?action=migration-backfill', { 
                  method: 'GET', 
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                const d = await res.json();
                if (d.success) {
                   setActionStatus(`Backfill complete. Processed ${d.processed} records. Check migration_logs for details.`);
                   fetchData();
                } else {
                   setActionStatus("Error: " + d.error);
                }
              } catch(e:any) {
                setActionStatus("Error: " + e.message);
              } finally {
                setIsActionLoading("");
                setTimeout(() => setActionStatus(""), 8000);
              }
            }}
            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold px-4 py-2 text-sm rounded-[20px] flex items-center shadow-sm"
          >
            <Sparkles size={16} className="mr-2"/> {isActionLoading === "backfill" ? "Working..." : "Run Migration Backfill"}
          </Button>

          <Button 
            disabled={isActionLoading !== ""}
            onClick={async () => {
              setIsActionLoading("revenue");
              setActionStatus("Rebuilding revenue pipeline...");
              try {
                const token = await auth.currentUser?.getIdToken();
                const res = await fetch('/api/admin?action=rebuild-revenue-pipeline', { 
                  method: 'GET', 
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                const d = await res.json();
                if (d.success) {
                   setActionStatus(`Pipeline rebuilt. Processed ${d.processed} requirements.`);
                   fetchData();
                } else {
                   setActionStatus("Error: " + d.error);
                }
              } catch(e:any) {
                setActionStatus("Error: " + e.message);
              } finally {
                setIsActionLoading("");
                setTimeout(() => setActionStatus(""), 8000);
              }
            }}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-4 py-2 text-sm rounded-[20px] flex items-center shadow-sm"
          >
            <DollarSign size={16} className="mr-2"/> {isActionLoading === "revenue" ? "Working..." : "Rebuild Revenue Pipeline"}
          </Button>
      </div>
      </div>
      
      {matchHealth && (
        <div className="bg-slate-900 rounded-[30px] p-8 text-white mt-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Activity size={120} />
          </div>
          <h2 className="text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
            <Activity className="text-emerald-400" /> Matrix Health Dashboard
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 relative z-10 w-full mb-4">
             <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Active Matches</p>
                <p className="text-3xl font-light">{matchHealth.activeMatches}</p>
             </div>
             <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Orphan Matches</p>
                <p className={cn("text-3xl font-light", matchHealth.orphanMatches > 0 ? "text-amber-400" : "")}>{matchHealth.orphanMatches}</p>
             </div>
             <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Archived/Deleted</p>
                <p className={cn("text-3xl font-light", (matchHealth.archivedCandidatesReferenced + matchHealth.deletedCandidatesReferenced) > 0 ? "text-amber-400" : "")}>{matchHealth.archivedCandidatesReferenced + matchHealth.deletedCandidatesReferenced}</p>
             </div>
             <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total Requirements</p>
                <p className="text-3xl font-light">{matchHealth.requirements}</p>
             </div>
          </div>
          <div className="text-xs text-slate-500 font-mono">Last Check: {new Date(matchHealth.lastCheck).toLocaleString()}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="md:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Verification Velocity</h3>
            <div className="flex gap-2">
                <Badge variant="outline" className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border-emerald-100">{verificationPercent}% Verified</Badge>
            </div>
          </div>
          <div className="p-8">
             <div className="grid grid-cols-3 gap-8 mb-10">
                {[
                    { label: "GST/Company", count: authStats.business, total: authStats.total, color: "bg-indigo-500" },
                    { label: "Aadhaar/Identity", count: authStats.identity, total: authStats.total, color: "bg-emerald-500" },
                    { label: "Official Email", count: authStats.email, total: authStats.total, color: "bg-amber-500" }
                ].map((item, i) => (
                    <div key={i}>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-slate-800 uppercase italic">{item.label}</span>
                            <span className="text-xs font-black text-slate-900">{Math.round((item.count/item.total)*100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                            <div className={`h-full ${item.color}`} style={{ width: `${(item.count/item.total)*100}%` }}></div>
                        </div>
                    </div>
                ))}
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">High-Priority Approvals</h4>
                {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').map((req: any) => (
                   <div 
                      key={req.id} 
                      onClick={() => navigate('/hq')}
                      className="flex justify-between items-center p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:border-indigo-200 hover:bg-white hover:shadow-xl transition-all cursor-pointer group"
                   >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-500 font-black">
                            {req.title.substring(0,1)}
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600">{req.title}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Budget Exposure: ₹{req.clientTargetBudget?.toLocaleString()} • Pipeline Pending</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-black text-slate-400 uppercase italic">Awaiting HQ</div>
                            <div className="text-[9px] text-slate-300 font-bold">2h 45m left</div>
                         </div>
                        <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                   </div>
                ))}
                {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').length === 0 && (
                   <div className="text-center py-8 text-slate-400 text-xs italic">All commercial gates are currently clear.</div>
                )}

                {/* Radar: Network Activity Alerts */}
                <div className="mt-10 mb-4 pt-6 border-t border-slate-100 flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-2">
                        <Activity size={14} className="animate-pulse text-indigo-400" /> Active Network Radar
                    </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Recently Online Nodes (approximation via recently formed reqs) */}
                    <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Recently Added Assets & Jobs</h5>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                           {[...(data.requirements || [])].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0,5).map((req: any, i) => (
                             <div key={`req-${i}`} className="flex items-center gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="h-6 w-6 rounded bg-emerald-100 text-emerald-600 flex items-center justify-center"><Briefcase size={10} /></span>
                                <div className="flex-1 overflow-hidden">
                                    <div className="truncate font-black text-slate-800 uppercase text-[10px]">{req.title || 'Untitled Req'}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase truncate">{req.clientId || 'Unknown Source'}</div>
                                </div>
                             </div>
                           ))}
                           {[...(data.candidates || [])].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0,5).map((cand: any, i) => (
                             <div key={`cand-${i}`} className="flex items-center gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                <span className="h-6 w-6 rounded bg-indigo-100 text-indigo-600 flex items-center justify-center"><Users size={10} /></span>
                                <div className="flex-1 overflow-hidden">
                                    <div className="truncate font-black text-slate-800 uppercase text-[10px]">{cand.name || 'Anonymous Profile'}</div>
                                    <div className="text-[8px] text-slate-400 font-bold uppercase truncate">{cand.jobTitle || cand.vendorId || 'Raw Upload'}</div>
                                </div>
                             </div>
                           ))}
                        </div>
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 group">
                        <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Recent Online Verified Nodes</h5>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 custom-scrollbar">
                            {[...(data.organizations || [])].sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime()).slice(0,10).map((org: any, i) => (
                                <div key={i} className="flex items-center gap-3 text-xs bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                    </span>
                                    <span className="font-bold text-[10px] text-slate-700 uppercase">{org.companyName || org.id}</span>
                                    <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded text-slate-500 bg-slate-100 font-mono font-black">{org.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={160} />
            </div>
            <div className="relative z-10">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Execution Scoreboard</h3>
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-8 leading-none">network <br/> liquidity v3</h2>
                
                <div className="space-y-8 mt-10">
                    {[
                        { label: "Submission Flow", val: "94.2/min", change: "+12%" },
                        { label: "Closure Turnaround", val: "3.4 Days", change: "-0.8d" },
                        { label: "Trust Degradation", val: "0.2%", change: "stable" }
                    ].map((m, i) => (
                        <div key={i} className="flex justify-between items-end border-b border-slate-800 pb-4">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.label}</div>
                                <div className="text-xl font-black font-mono tracking-tighter">{m.val}</div>
                            </div>
                            <div className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">{m.change}</div>
                        </div>
                    ))}
                </div>

                <Button 
                    onClick={() => navigate('/hq')}
                    className="w-full mt-10 bg-indigo-600 hover:bg-white hover:text-slate-900 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-indigo-500/20"
                >
                    go to execution hq
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
