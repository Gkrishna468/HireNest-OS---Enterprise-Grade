import { useEffect, useState, useRef } from "react";
import { Activity, ShieldCheck, Bot, Users, Plus, Shield, ShieldAlert, Network, AlertTriangle, Briefcase, Combine, Gauge, Database, PlayCircle, Zap, TrendingUp, DollarSign } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { collection, getDocs, query, where, deleteDoc } from "firebase/firestore";
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
  const [execStats, setExecStats] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) return;
    const unsubEvents = subscribeToEvents((events) => {
      setRecentEvents(events);
    }, 10, session.user?.organizationId, session.user?.role);
    return () => unsubEvents();
  }, [session]);

  const fetchReportingStats = async () => {
    try {
      // Requirements
      const reqSnap = await getDocs(collection(db, "requirements_public"));
      const requirements = reqSnap.docs.map(d => d.data());
      const openReqs = requirements.filter(r => r.status && ["ACTIVE", "PUBLISHED", "PENDING"].includes(r.status.toUpperCase())).length;

      // Candidates & Submissions
      const subSnap = await getDocs(collection(db, "submissions"));
      const allSubs = subSnap.docs.map(d => d.data()).filter((s:any) => s.status !== "DELETED" && s.isActive !== false);
      
      let submissions = 0;
      let interviews = 0;
      let offers = 0;
      let placements = 0;

      allSubs.forEach(s => {
         const stage = (s.status || "").toUpperCase();
         if (stage === "SUBMITTED" || stage === "DEAL ROOM" || stage === "MATCHED" || stage === "MATCH") submissions++;
         if (stage.includes("INTERVIEW") || stage === "SHORTLISTED") interviews++;
         if (stage.includes("OFFER")) offers++;
         if (stage === "PLACED" || stage === "HIRED" || stage === "ONBOARDED") placements++;
      });
      
      const candSnap = await getDocs(collection(db, "candidatePool"));
      const candidates = candSnap.docs.map(d => d.data()).filter((c:any) => c.status !== "DELETED" && c.isActive !== false);

      // DealRooms (Backup placements count, etc.)
      const drSnap = await getDocs(collection(db, "dealRooms"));
      const dealRooms = drSnap.docs.map(d => d.data());
      dealRooms.forEach(dr => {
         const drStage = dr.currentStage || "";
         if (drStage === "technical_l1" || drStage === "technical_l2" || drStage === "final_round") interviews++;
         if (drStage === "offer") offers++;
         // deduplication logic can be added if needed, approximating here.
      });

      setExecStats({
        openReqs,
        submissions,
        interviews,
        offers,
        placements
      });
    } catch (err) {
      console.warn("Failed to fetch executive stats", err);
    }
  };

  const handlePurgeData = async () => {
      if(!window.confirm("WARNING: This will delete all seed/test requirements, dummy deal rooms, and placeholder candidates. Are you sure?")) {
        return;
      }
      try {
          // Delete test stuff from candidatePool
          const candSnap = await getDocs(collection(db, "candidatePool"));
          for (let doc of candSnap.docs) {
              const d = doc.data();
              if (d.name?.toLowerCase().includes("test") || d.email?.toLowerCase().includes("test") || d.testData || d.email === "john@example.com") {
                  await deleteDoc(doc.ref);
              }
          }
          // Delete dummy requirements
          const reqSnap = await getDocs(collection(db, "requirements_public"));
          for (let doc of reqSnap.docs) {
              const d = doc.data();
              if (d.title?.toLowerCase().includes("test") || d.testData) {
                  await deleteDoc(doc.ref);
              }
          }
          // Check submissions
          const subSnap = await getDocs(collection(db, "submissions"));
          for (let doc of subSnap.docs) {
              if (doc.data().testData) await deleteDoc(doc.ref);
          }
           alert("Data Integrity Cleanup Complete. Test records purged.");
           fetchReportingStats();
      } catch (err) {
          alert("Error clearing data: " + err);
      }
  };

  const handleCleanMocks = async () => {
      if(!window.confirm("This will delete all Local Mock Generated and pending mock records. Continue?")) {
        return;
      }
      try {
          const { collection, getDocs, deleteDoc, doc } = await import("firebase/firestore");
          const cacheSnap = await getDocs(collection(db, "resume_cache"));
          for(const d of cacheSnap.docs) {
             const data = d.data();
             if (
                data.name === "Local Mock Generated" ||
                data.email === "mock@example.com" ||
                data.email === "pending@hirenest.os" ||
                data.name === "Parsing Pending" ||
                data.name === "Pending Distillation"
             ) {
                await deleteDoc(doc(db, "resume_cache", d.id));
             }
          }
          const snap = await getDocs(collection(db, "candidatePool"));
          let count = 0;
          for (const d of snap.docs) {
             const data = d.data();
             if (
                data.name === "Local Mock Generated" ||
                data.email === "mock@example.com" ||
                data.email === "pending@hirenest.os" ||
                data.name === "Pending Distillation" ||
                data.name === "Parsing Pending" ||
                data.name === "Sarah Jenkins" ||
                data.name === "Unnamed Candidate" ||
                data.name === "Unknown Candidate"
              ) {
                await deleteDoc(doc(db, "candidatePool", d.id));
                count++;
              }
          }
          alert(`Deleted ${count} mock candidates.`);
      } catch(e:any) {
          alert(e.message);
      }
  };

  const handleFixDataDrift = async () => {
      if(!window.confirm("This will migrate generic candidatePool.pipelineStage records to their actual submission.status (resolving data drift). Continue?")) {
        return;
      }
      try {
          const { doc, updateDoc } = await import("firebase/firestore");
          const cands = await getDocs(collection(db, "candidatePool"));
          const subs = await getDocs(collection(db, "submissions"));

          const subMap: Record<string, string> = {};
          subs.forEach((d) => {
            const data = d.data();
            if (data.candidateId && data.status) {
              subMap[data.candidateId] = data.status;
            }
          });

          let migratedCount = 0;
          for (const c of cands.docs) {
            const cData = c.data();
            const cId = cData.candidateId || c.id;
            const subStatus = subMap[cId];
            if (subStatus && cData.pipelineStage !== subStatus) {
              await updateDoc(doc(db, "candidatePool", c.id), {
                pipelineStage: subStatus
              });
              migratedCount++;
            }
          }
          alert(`Migration Complete! Fixed drift for ${migratedCount} candidates.`);
      } catch (err: any) {
          alert("Migration failed: " + err.message);
      }
  };

  const handleFixVisibilityDrift = async () => {
      if(!window.confirm("This will synchronize candidatePool.activePipelines with existing submissions and remove orphans. Continue?")) {
        return;
      }
      try {
          const { doc, updateDoc } = await import("firebase/firestore");
          const cands = await getDocs(collection(db, "candidatePool"));
          const subs = await getDocs(collection(db, "submissions"));

          let fixedCount = 0;

          // Process candidates
          for (const c of cands.docs) {
             const cand = c.data();
             const candId = cand.candidateId || c.id;
             let changed = false;
             const activePipelines = cand.activePipelines || [];
             let updatedPipelines = [...activePipelines];

             // 1. Remove orphaned activePipelines (candidate has reqId but no matching submission)
             for (const reqId of activePipelines) {
                const hasSub = subs.docs.some(s => {
                    const sData = s.data();
                    return sData.candidateId === candId && (sData.requirementId === reqId || sData.canonicalRequirementId === reqId);
                });
                if (!hasSub) {
                   updatedPipelines = updatedPipelines.filter(id => id !== reqId);
                   changed = true;
                }
             }

             // 2. Add missing activePipelines (submission exists but candidate missing reqId)
             subs.docs.forEach(sDoc => {
                const s = sDoc.data();
                if (s.candidateId === candId && s.status !== "REJECTED" && s.status !== "REJECT") {
                   const reqId = s.requirementId || s.canonicalRequirementId;
                   if (reqId && !updatedPipelines.includes(reqId)) {
                      updatedPipelines.push(reqId);
                      changed = true;
                   }
                }
             });

             if (changed) {
                await updateDoc(doc(db, "candidatePool", c.id), {
                   activePipelines: updatedPipelines
                });
                fixedCount++;
             }
          }

          alert(`Visibility Drift Fixed! Repaired ${fixedCount} candidate pipelines.`);
      } catch (err: any) {
          alert("Fix failed: " + err.message);
      }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          const d = await getDocs(query(collection(db, "users"), where("__name__", "==", u.uid))).then(s => s.empty ? null : s.docs[0]);
          if (d) {
            const data = d.data();
            let finalRole = data.role || "PENDING_VERIFICATION";
            let finalOrgId = data.organizationId || "";
            const superAdmins = [
              "gopal@hirenestworkforce.com",
              "gopalkrishna0046@gmail.com",
            ];
            if (u.email && superAdmins.includes(u.email.toLowerCase())) {
              finalRole = "super_admin";
              finalOrgId = "ORG-GLOBAL-HQ";
            }
            setSession({
              user: {
                uid: u.uid,
                name: data.companyName || u.displayName || u.email?.split("@")[0] || "Active User",
                email: u.email || "",
                role: finalRole,
                permissions: data.permissions || [],
                organizationId: finalOrgId
              },
              org: { type: finalRole }
            });
            if (finalRole === "super_admin" || finalRole === "admin" || finalRole === "ops_admin") {
                 fetchReportingStats();
            }
          } else {
            setSession({ user: { role: 'guest', permissions: [] }, org: { type: 'guest' } });
          }
        } catch (err) {
          console.warn("Direct Firestore read failed, querying server-side context fallback", err);
        }
      } 
    });
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

      auth.currentUser?.getIdToken().then(token => {
        fetch(`/api/analytics?type=${queryType}&orgId=${session.org.id || session.user.organizationId || ''}&userId=${session.user.uid || ''}&role=${session.user.role || ''}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
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
           .then(async (data) => {
             // If Backend lacks credentials (adminDb null fallback) and returns all 0s, fetch natively
             if (data.fallbackRequired && (isVendor || isClient)) {
                 console.log("Analytics backend requested fallback. Hydrating via Client SDK...");
                 const orgId = session.org.id || session.user.organizationId || '';
                 if (orgId) {
                     try {
                         let allocatedReqs = 0;
                         try {
                             if (isVendor) {
                                 const reqSnap = await getDocs(query(collection(db, "requirements_public"), where("assignedVendorIds", "array-contains", orgId)));
                                 allocatedReqs = reqSnap.docs.length;
                             } else if (isClient) {
                                  const reqSnap = await getDocs(query(collection(db, "requirements_public"), where("clientId", "==", orgId)));
                                  allocatedReqs = reqSnap.docs.length;
                             }
                         } catch (e: any) { console.error("requirements_public query failed:", e.message); }
                         
                         let candsCount = 0;
                         let readyForSubmit = 0;
                         try {
                             const candQuery = isVendor 
                                ? query(collection(db, "candidatePool"), where("vendorId", "==", orgId))
                                : query(collection(db, "candidatePool"), where("clientId", "==", orgId));
                             const candsSnap = await getDocs(candQuery);
                             candsCount = candsSnap.docs.length;
                             candsSnap.docs.forEach((d: any) => {
                                const data = d.data();
                                if (data.status !== "DELETED" && data.isActive !== false) {
                                   const stage = (data.pipelineStage || '').toUpperCase();
                                   if (stage === 'MATCHED' || stage === 'READY' || stage === 'AVAILABLE' || stage === '') {
                                       readyForSubmit++;
                                   }
                                }
                             });
                         } catch(e: any) { console.error("candidatePool query failed:", e.message); }

                         let matchesCount = 0;
                         try {
                             if (isVendor) {
                                 const matchesSnap = await getDocs(query(collection(db, "candidate_matches"), where("vendorId", "==", orgId)));
                                 matchesCount = matchesSnap.docs.length;
                             } else {
                                 const matchesClientSnap = await getDocs(query(collection(db, "candidate_matches"), where("clientId", "==", orgId)));
                                 matchesCount = matchesClientSnap.docs.length;
                             }
                         } catch(e: any) { console.error("candidate_matches query failed:", e.message); }

                         let revenue = 0;
                         let interviews = 0;
                         let placements = 0;
                         let pendingReview = 0;
                         try {
                             const subsQuery = isVendor
                               ? query(collection(db, "submissions"), where("vendorId", "==", orgId))
                               : query(collection(db, "submissions"), where("clientId", "==", orgId));
                             const subsSnap = await getDocs(subsQuery);
                             subsSnap.docs.forEach((d: any) => {
                                const data = d.data();
                                if (data.status === "DELETED" || data.isActive === false) return;
                                const status = (data.status || '').toUpperCase();
                                if (status === 'SUBMITTED' || status === 'REVIEW_PENDING' || status === 'PENDING') pendingReview++;
                                if (status.includes('INTERVIEW') || status === 'SHORTLISTED') interviews++;
                                if (['OFFER_RELEASED', 'OFFER_ACCEPTED', 'ONBOARDED', 'HIRED', 'PLACED'].includes(status)) {
                                   placements++;
                                   revenue += Number(data.vendorPayout || data.financials?.vendorPayout || data.financials?.clientBudget || data.budget?.amount) || 0;
                                }
                             });
                         } catch(e: any) { console.error("submissions query failed:", e.message); }
                         
                         setMetrics({
                            ...data,
                            revenue: revenue,
                            spending: isClient ? revenue : data.spending,
                            totalJobs: allocatedReqs,
                            totalCandidates: isClient ? pendingReview : candsCount,
                            aiMatches: matchesCount,
                            readyForSubmission: readyForSubmit,
                            interviewsToday: interviews,
                            placements: placements
                         });
                         return;
                     } catch(err) {
                         console.error("Client fallback fetch failed", err);
                     }
                 }
             }
             setMetrics(data);
          })
          .catch(err => {
            console.warn("Metrics fetch failed, using zeroed fallback", err);
            setMetrics({
              revenue: 0,
              spending: 0,
              activeDeals: 0,
              placements: 0,
              avgMargin: 0,
              vendorQuality: 0,
              recruiterProductivity: 0,
              timeToHireDays: 0,
              offerAcceptanceRate: 0,
              totalJobs: 0,
              totalCandidates: 0,
              interviewsToday: 0,
              aiMatches: 0,
              readyForSubmission: 0
            });
          });
      });
    }
  }, [session?.org, isClient, isVendor, isRecruiter, isIndependent]);

  if (!metrics) return <div className="p-4 flex items-center justify-center text-slate-400 text-xs font-mono animate-pulse">Initializing Governance Layer...</div>;

  if (isVendor) {
    return <VendorPartnerWorkspace vendorName={session?.user?.name || "Vendor Partner"} orgId={session?.user?.organizationId} metrics={metrics} />;
  }

  if (isClient) {
    return <HiringManagerWorkspace userName={session?.user?.name || "Hiring Manager"} orgId={session?.user?.organizationId} metrics={metrics} />;
  }

  if (isRecruiter) {
    return <RecruiterWorkspace userName={session?.user?.name || "Recruiter"} orgId={session?.user?.organizationId} metrics={metrics} />;
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

                      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-4">
                        <Button
                           onClick={handlePurgeData}
                           variant="outline"
                           className="text-[9px] uppercase font-bold tracking-widest border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-8"
                        >
                           <AlertTriangle size={12} className="mr-2" />
                           Purge Demo / Test Data
                        </Button>
                        <Button
                           onClick={handleCleanMocks}
                           variant="outline"
                           className="text-[9px] uppercase font-bold tracking-widest border-rose-500/30 text-rose-400 hover:bg-rose-500/10 h-8 mr-2"
                        >
                           Clean Mock Candidates
                        </Button>
                        <Button
                           onClick={handleFixDataDrift}
                           variant="outline"
                           className="text-[9px] uppercase font-bold tracking-widest border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-8"
                        >
                           <Database size={12} className="mr-2" />
                           Fix Candidate Drift
                        </Button>
                        <Button
                           onClick={handleFixVisibilityDrift}
                           variant="outline"
                           className="text-[9px] uppercase font-bold tracking-widest border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-8"
                        >
                           <Database size={12} className="mr-2" />
                           Fix Visibility Drift
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* EXECUTIVE REPORTING (Admin Only) */}
                {isAdmin && execStats && (
                  <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden group border border-slate-800">
                     <div className="flex items-center justify-between mb-6">
                         <h3 className="text-sm font-black lowercase tracking-tighter italic flex items-center gap-2">
                             <TrendingUp className="text-indigo-400" /> Executive Reporting
                         </h3>
                         <Badge className="bg-indigo-500/20 text-indigo-300">LIVE</Badge>
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                         {[
                            { label: "Reqs Open", value: execStats.openReqs, color: "text-indigo-400" },
                            { label: "Submissions", value: execStats.submissions, color: "text-blue-400" },
                            { label: "Interviews", value: execStats.interviews, color: "text-amber-400" },
                            { label: "Offers", value: execStats.offers, color: "text-fuchsia-400" },
                            { label: "Placements", value: execStats.placements, color: "text-emerald-400" },
                         ].map((s, i) => (
                           <div key={i} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex flex-col justify-center text-center">
                             <div className="text-[9px] uppercase tracking-widest text-slate-400 font-bold mb-1">{s.label}</div>
                             <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                           </div>
                         ))}
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
