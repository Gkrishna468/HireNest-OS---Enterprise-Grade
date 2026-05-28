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
import { subscribeToEvents } from "../services/eventBus";

export default function DashboardTab() {
  const [metrics, setMetrics] = useState<any>(null);
  const [session, setSession] = useState<{ user: any, org: any } | null>(null);
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubEvents = subscribeToEvents((events) => {
      setRecentEvents(events);
    }, 10);
    return () => unsubEvents();
  }, []);

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
      let queryType = "hq";
      if (isClient) queryType = "client";
      else if (isVendor) queryType = "vendor";
      else if (isRecruiter) queryType = "recruiter";
      else if (isIndependent) queryType = "vendor"; // Use vendor for independent

      fetch(`/api/analytics/${queryType}?orgId=${session.org.id || session.user.organizationId || ''}`)
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
    return <VendorPartnerWorkspace vendorName={session?.user?.name || "Vendor Partner"} metrics={metrics} />;
  }

  if (isClient) {
    return <HiringManagerWorkspace userName={session?.user?.name || "Hiring Manager"} />;
  }

  if (isRecruiter) {
    return <RecruiterWorkspace userName={session?.user?.name || "Recruiter"} metrics={metrics} />;
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
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md cursor-pointer group">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-600 transition-colors">Profiles Uploaded</div>
                        <div className="text-2xl font-black text-slate-900 font-mono">
                            {recentEvents.filter(e => e.type === 'CandidateUploaded').length}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md cursor-pointer group">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-600 transition-colors">Client Submissions</div>
                        <div className="text-2xl font-black text-slate-900 font-mono">
                            {recentEvents.filter(e => e.type === 'SubmissionCreated').length}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md cursor-pointer group">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-fuchsia-600 transition-colors">Active Deal Rooms</div>
                        <div className="text-2xl font-black text-slate-900 font-mono">
                            {recentEvents.filter(e => e.type === 'DealRoomOpened').length}
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md cursor-pointer group">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-emerald-600 transition-colors">Converted Placements</div>
                        <div className="text-2xl font-black text-emerald-600 font-mono">
                            {recentEvents.filter(e => e.type === 'PlacementCompleted').length}
                        </div>
                    </div>
                </div>

                {/* Main Activity / Feed View */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-800">Operational Logs</h3>
                        <Button variant="ghost" size="sm" className="text-[9px] uppercase font-bold h-6">Full Audit →</Button>
                    </div>
                    {recentEvents.length === 0 ? (
                      <div className="p-16 text-center border-t border-slate-100">
                           <Activity size={32} className="mx-auto text-slate-300 mb-4" />
                           <h4 className="font-bold text-slate-800 tracking-tight text-sm mb-1">Audit Stream Empty</h4>
                           <p className="text-xs text-slate-500 font-medium">No live signals detected for current tenant.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                        {recentEvents.map((evt) => (
                          <div key={evt.id} className="p-4 flex gap-4 hover:bg-slate-50 transition-colors">
                            <div className="mt-1">
                              {evt.type === 'JobPublished' && <Briefcase size={16} className="text-indigo-500" />}
                              {evt.type === 'CandidateUploaded' && <Users size={16} className="text-emerald-500" />}
                              {evt.type === 'SubmissionCreated' && <Combine size={16} className="text-amber-500" />}
                              {evt.type === 'DealRoomOpened' && <ShieldCheck size={16} className="text-fuchsia-500" />}
                              {evt.type === 'InterviewScheduled' && <PlayCircle size={16} className="text-blue-500" />}
                              {evt.type === 'PlacementCompleted' && <Zap size={16} className="text-rose-500" />}
                              {!['JobPublished', 'CandidateUploaded', 'SubmissionCreated', 'DealRoomOpened', 'InterviewScheduled', 'PlacementCompleted'].includes(evt.type) && <Activity size={16} className="text-slate-400" />}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                                  {evt.type.replace(/([A-Z])/g, ' $1').trim()}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {evt.timestamp?.toDate ? evt.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 mb-2">
                                {evt.type === 'JobPublished' && `New job "${evt.metadata?.title}" was published.`}
                                {evt.type === 'CandidateUploaded' && `Candidate "${evt.metadata?.name}" was ingested successfully.`}
                                {evt.type === 'SubmissionCreated' && `Candidate "${evt.metadata?.candidateName}" submitted for Job "${evt.metadata?.reqTitle}".`}
                                {evt.type === 'DealRoomOpened' && `Deal room created for "${evt.metadata?.candidateName}".`}
                                {evt.type === 'InterviewScheduled' && `Interview scheduled for "${evt.metadata?.candidateName}".`}
                                {evt.type === 'PlacementCompleted' && `Placement finalized for "${evt.metadata?.candidateName}".`}
                                {!['JobPublished', 'CandidateUploaded', 'SubmissionCreated', 'DealRoomOpened', 'InterviewScheduled', 'PlacementCompleted'].includes(evt.type) && JSON.stringify(evt.metadata)}
                              </p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[8px] uppercase tracking-widest font-bold py-0 h-4">
                                  {evt.entityType}
                                </Badge>
                                <span className="text-[9px] text-slate-400 font-mono">ID: {evt.entityId.substring(0, 8)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
            </div>

            {/* Sidebar Stats / AI Insight */}
            <div className="space-y-6">
                    {/* Realtime Operational Monitoring Placeholder */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm text-center min-h-[300px] flex flex-col items-center justify-center">
                        <Activity size={36} className="text-slate-700 mb-4" />
                        <h3 className="text-sm font-bold uppercase tracking-[0.1em] text-slate-100 mb-2">
                             System Telemetry Offline
                        </h3>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-xs">
                          Agent telemetry and organizational traffic observability will activate once real recruitment workloads are initiated by clients or vendors.
                        </p>
                    </div>
            </div>
        </div>
      </div>
    </div>
  );
}
