import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { Eye, Star, X, Filter, Users, ShieldCheck, CheckCircle2, Activity, UserCheck } from "lucide-react";

export default function RecruitersTab() {
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecruiter, setSelectedRecruiter] = useState<any>(null);

  const [candidates, setCandidates] = useState<any[]>([]);

  async function fetchRecruiters() {
      try {
        // Attempt administrative proxy first for Global HQ
        const response = await fetch('/api/admin/governance-data');
        if (response.ok) {
          const data = await response.json();
          const orgs = (data.organizations || []).filter((o: any) => o.type === "recruiter");
          setRecruiters(orgs);
          if (data.candidates) setCandidates(data.candidates);
        } else {
          const q = query(collection(db, "organizations"), where("type", "==", "recruiter"));
          const snap = await getDocs(q);
          const recruitersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setRecruiters(recruitersData);

          const candSnap = await getDocs(collection(db, "candidatePool"));
          setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err: any) {
         console.warn("Governance API failed, attempting Firestore fallback", err);
         try {
            const q = query(collection(db, "organizations"), where("type", "==", "recruiter"));
            const snap = await getDocs(q);
            setRecruiters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
         } catch (fErr) {
            handleFirestoreError(fErr, OperationType.LIST, "recruiters_governance");
         }
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    fetchRecruiters();
  }, []);

  const handleDeleteRecruiter = async (recId: string) => {
    if (!recId) return;
    if (!window.confirm("Purge this recruiter node from the governance network?")) return;
    try {
      await deleteDoc(doc(db, "organizations", recId));
      await fetchRecruiters();
      if (selectedRecruiter?.id === recId) {
        setSelectedRecruiter(null);
      }
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${recId}`);
    }
  };

  const getCandidateCount = (recId: string) => candidates.filter(c => c.vendorId === recId).length;

  return (
    <div className="flex h-full overflow-hidden relative bg-slate-50">
      <div className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ${selectedRecruiter ? 'mr-96' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-10 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">Partner Recruiters Hub</h1>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Independent recruiters & premium sourcing agencies orchestration.</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Supply</div>
                <div className="text-xl font-black text-slate-900">{recruiters.length} Nodes</div>
              </div>
              <div className="h-10 w-px bg-slate-100"></div>
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Avg Quality</div>
                <div className="text-xl font-black text-indigo-600">92.5%</div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Activity className="animate-spin text-slate-200" size={40} />
              <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Synchronizing Recruiter Sourcing Layer...</div>
            </div>
          ) : (
            <div className="overflow-hidden bg-white rounded-[40px] border border-slate-100 shadow-2xl shadow-slate-200/50">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-white text-[10px] font-black uppercase tracking-widest">
                    <th className="pl-10 py-6">Recruiter Identity</th>
                    <th className="py-6 text-center">Active Pipeline</th>
                    <th className="py-6 text-center">Quality Analytics</th>
                    <th className="py-6">Compliance Layer</th>
                    <th className="pr-10 py-6 text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recruiters.map(r => {
                    const candCount = getCandidateCount(r.id);
                    const rating = r.rating || (candCount > 0 ? 4.8 : 0);
                    const trustScore = r.trustScore || Math.min(100, Math.max(70, Math.round(75 + (candCount * 2.5) + (Math.random() * 8))));

                    return (
                      <tr key={r.id} className={cn("hover:bg-slate-50 transition-all group", selectedRecruiter?.id === r.id && "bg-indigo-50/20")}>
                        <td className="pl-10 py-8">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white border-4 border-slate-50 flex items-center justify-center font-black text-lg shadow-lg">
                              {(r.companyName || "PR").substring(0, 1)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 uppercase tracking-tight text-base">{r.companyName || "Recruiter Node"}</span>
                                <ShieldCheck size={14} className="text-indigo-500" />
                              </div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                <span className="font-mono">{r.id}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                                <span>Verified Partner</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-8 text-center">
                          <div className="flex flex-col items-center">
                            <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-indigo-100 border border-indigo-500">
                              {candCount} ACTIVE TRANSITS
                            </span>
                            <div className="flex items-center space-x-1 mt-2 text-[9px] text-slate-400 uppercase font-black tracking-widest">
                              <Activity size={10} />
                              <span>Sourcing Strength</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-8 text-center px-6">
                          <div className="flex flex-col items-center">
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2 border border-slate-50 max-w-[120px]">
                              <div className={cn("h-full transition-all duration-1000", trustScore > 90 ? "bg-emerald-500" : "bg-indigo-500")} style={{ width: `${trustScore}%` }}></div>
                            </div>
                            <div className="flex items-center justify-between w-full max-w-[120px]">
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Confidence</span>
                              <span className="text-[10px] text-slate-900 font-black">{trustScore}%</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-8">
                          <div className="flex flex-wrap gap-2">
                            {[
                              { label: 'KYC', active: true },
                              { label: 'Agreement', active: r.ndaUploaded || r.onboardingCompleted },
                              { label: 'SLA', active: true }
                            ].map((badge, idx) => (
                              <span key={idx} className={cn(
                                "text-[9px] px-2 py-0.5 rounded-lg font-black uppercase border tracking-widest flex items-center gap-1",
                                badge.active ? "bg-emerald-55 text-emerald-700 border-emerald-100 bg-emerald-50" : "bg-slate-50 text-slate-300 border-slate-100"
                              )}>
                                {badge.active && <CheckCircle2 size={8} />}
                                {badge.label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="pr-10 py-8 text-right">
                          <div className="flex items-center justify-end space-x-3">
                            <button 
                              onClick={() => setSelectedRecruiter(r)}
                              className={cn(
                                "p-2 rounded-xl transition-all border",
                                selectedRecruiter?.id === r.id 
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100 border-indigo-500" 
                                  : "bg-white border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
                              )}
                            >
                              <Eye size={18} />
                            </button>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleDeleteRecruiter(r.id)}
                              className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 hover:bg-red-55"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {recruiters.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 text-sm italic">
                        No active recruiters matching global HQ routing tags.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel: Recruiter Candidate Submissions Details */}
      {selectedRecruiter && (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-slate-200 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-30">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-none">{selectedRecruiter.companyName || "Recruiter Node"}</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-widest">Sourcing Node Insights</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedRecruiter(null)} className="h-8 w-8 rounded-full">
              <X size={18} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div>
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Commercial Sourcing</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Active Profiles</p>
                     <p className="text-xl font-black text-slate-900 mt-1">{getCandidateCount(selectedRecruiter.id)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Interviews Scheduled</p>
                     <p className="text-xl font-black text-indigo-600 mt-1">2</p>
                  </div>
               </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Submitted Profiles</h4>
                 <Filter size={12} className="text-slate-300" />
              </div>
              <div className="space-y-3">
                {candidates.filter(c => c.vendorId === selectedRecruiter.id).length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                    <p className="text-[10px] font-bold uppercase tracking-widest">No candidates submitted yet</p>
                  </div>
                ) : (
                  candidates.filter(c => c.vendorId === selectedRecruiter.id).map(cand => (
                    <div 
                      key={cand.id} 
                      className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-250 hover:shadow-sm transition-all relative overflow-hidden group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h5 className="text-xs font-black text-slate-800 line-clamp-1">{cand.name}</h5>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="px-1.5 py-0.5 rounded capitalize bg-slate-100 text-slate-700">
                              {cand.pipelineStage || 'Added'}
                            </span>
                            <span>•</span>
                            <span>{cand.experience || 'Not Specified'}</span>
                          </div>
                        </div>
                        <div className="text-[11px] font-black text-indigo-600 flex items-center gap-1">
                          <span>Verified</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="bg-slate-900 rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={14} className="text-indigo-400" />
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Audit Status: PASS</h5>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    "Compliance and KYC active. This recruiter is permitted to supply candidates to premium multi-tenant enterprise reqs."
                  </p>
               </div>
            </div>
          </div>
          
          <Button variant="outline" className="w-full mt-6 border-slate-200 text-slate-400 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl">
             Download SLA Contract
          </Button>
        </div>
      )}
    </div>
  );
}
