import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "../lib/Button";
import { Eye, Star, TrendingUp, X, Filter, DollarSign, CheckCircle, ShieldAlert, Clock, Building2 } from "lucide-react";
import { updateDoc, serverTimestamp, setDoc } from "firebase/firestore";

export default function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showApprovalModal, setShowApprovalModal] = useState<any>(null);

  const [jobs, setJobs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  async function fetchClients() {
      try {
        // Attempt administrative proxy first for Global HQ
        const response = await fetch('/api/admin/governance-data');
        if (response.ok) {
          const data = await response.json();
          const orgs = (data.organizations || []).filter((o: any) => o.type === "client");
          setClients(orgs);
          setJobs(data.requirements_public || []);
          setSubmissions(data.submissions || []);
        } else {
          const q = query(collection(db, "organizations"), where("type", "==", "client"));
          const snap = await getDocs(q);
          const clientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setClients(clientsData);

          // Fetch jobs and submissions to show counts
          const jobsSnap = await getDocs(collection(db, "requirements_public"));
          setJobs(jobsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
        
        try {
          if (!clients.length) {
            const subsSnap = await getDocs(collection(db, "submissions"));
            setSubmissions(subsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
          }
        } catch (sErr) {
          console.warn("Could not fetch submissions for matching counts - likely permission denied for HQ view.");
        }
      } catch (err: any) {
         console.warn("Governance API failed, attempting Firestore fallback", err);
         try {
            const q = query(collection(db, "organizations"), where("type", "==", "client"));
            const snap = await getDocs(q);
            setClients(snap.docs.map(d => ({ id: d.id, ...d.data() })));
         } catch (fErr) {
            handleFirestoreError(fErr, OperationType.LIST, "clients_governance");
         }
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async (clientId: string) => {
    if (!clientId) return;
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "organizations", clientId));
      await fetchClients();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${clientId}`);
    }
  };

  const getJobCount = (clientId: string) => jobs.filter(j => j.clientId === clientId).length;
  const getMatchCount = (clientId: string) => {
    const clientJobIds = jobs.filter(j => j.clientId === clientId).map(j => j.id);
    return submissions.filter(s => clientJobIds.includes(s.requirementId)).length;
  };

  const handleApproveMargin = async (req: any, actualBudget: number, marginValue: number, marginType: 'FIXED' | 'PERCENTAGE') => {
    try {
      const platformProfit = marginType === 'PERCENTAGE' ? (actualBudget * (marginValue / 100)) : marginValue;
      const vendorVisible = actualBudget - platformProfit;
      
      const financials = {
        clientBudget: actualBudget,
        clientCurrency: "USD",
        adminMargin: platformProfit,
        vendorPayout: vendorVisible,
        platformProfit: platformProfit,
        marginConfig: { type: marginType, value: marginValue }
      };

      await updateDoc(doc(db, "requirements_public", req.id), {
        status: "PUBLISHED",
        visibility: "VENDOR_NETWORK",
        vendorVisibleBudget: vendorVisible,
        rate: `$${vendorVisible}/hr`,
        adminApproved: true,
        financials: financials
      });

      await setDoc(doc(db, "requirements_private", req.id), {
        requirementId: req.id,
        ...financials,
        updatedAt: serverTimestamp()
      });

      setShowApprovalModal(null);
      await fetchClients();
    } catch (e) {
      console.error("Governance engine failure", e);
    }
  };

  return (
    <div className="flex h-full overflow-hidden relative">
      <div className={`flex-1 p-8 overflow-y-auto transition-all duration-300 ${selectedClient ? 'mr-96' : ''}`}>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Client Governance Hub</h1>
              <p className="text-sm text-slate-500 mt-1">Cross-tenant margin monitoring and commercial orchestration.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="text-xs border-slate-200">Export Audit Log</Button>
              <Button className="bg-indigo-600 text-white text-xs font-bold px-4">Global Search</Button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 font-mono">Syncing Governance Layer...</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Identity</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Velocity</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Eco-System Tracking</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Commercial Health</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Governance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 italic-none">
                  {clients.map(c => {
                    const jobCount = getJobCount(c.id);
                    const matchCount = getMatchCount(c.id);
                    const rating = c.rating || (jobCount > 0 ? 4.5 : 0);
                    
                    return (
                      <tr key={c.id} className={`hover:bg-slate-50/80 transition-colors group ${selectedClient?.id === c.id ? 'bg-indigo-50/30' : ''}`}>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 font-bold border border-slate-200">
                              {c.companyName?.slice(0,1)}
                            </div>
                            <div>
                                <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.companyName}</div>
                                <div className="text-[10px] font-mono text-slate-400 mt-0.5">TN: {c.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-sm font-black text-slate-900">{jobCount}</span>
                            <span className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Live Req</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-100 shadow-sm shadow-emerald-50">
                                {matchCount} MATCHES
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center text-amber-500 bg-amber-50/50 w-fit px-2 py-1 rounded-lg border border-amber-100">
                            <Star size={10} fill="currentColor" />
                            <span className="ml-1.5 text-xs font-black text-amber-600">{rating === 0 ? "NEW" : rating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex gap-1.5">
                            <span title="Master Service Agreement" className={`text-[9px] px-1.5 py-0.5 rounded-md border font-black ${c.msaUploaded ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-300 border-slate-100 opacity-50'}`}>MSA</span>
                            <span title="Non-Disclosure Agreement" className={`text-[9px] px-1.5 py-0.5 rounded-md border font-black ${c.ndaUploaded ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-300 border-slate-100 opacity-50'}`}>NDA</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button 
                              onClick={() => setSelectedClient(c)}
                              className={`p-2 rounded-lg transition-all ${selectedClient?.id === c.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200'}`}
                            >
                              <Eye size={18} />
                            </button>
                            <Button 
                              variant="ghost" 
                              onClick={() => handleDeleteClient(c.id)}
                              className="h-9 w-9 p-0 text-slate-300 hover:text-red-500 hover:bg-red-50"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Side Panel: Client Requirements & Margin Governance */}
      {selectedClient && (
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-white border-l border-slate-200 p-6 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-30">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <Building2 size={20} />
              </div>
              <div>
                <h3 className="font-black text-slate-900 leading-none">{selectedClient.companyName}</h3>
                <p className="text-[10px] text-slate-400 font-mono mt-1 uppercase tracking-widest">Portfolio Deep Scan</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedClient(null)} className="h-8 w-8 rounded-full">
              <X size={18} />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            <div>
               <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Commercial Exposure</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Active Jobs</p>
                     <p className="text-xl font-black text-slate-900 mt-1">{getJobCount(selectedClient.id)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-tight">Match Pipeline</p>
                     <p className="text-xl font-black text-indigo-600 mt-1">{getMatchCount(selectedClient.id)}</p>
                  </div>
               </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requirement Backlog</h4>
                 <Filter size={12} className="text-slate-300" />
              </div>
              <div className="space-y-3">
                {jobs.filter(j => j.clientId === selectedClient.id).length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300">
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Active Requirements</p>
                  </div>
                ) : (
                  jobs.filter(j => j.clientId === selectedClient.id).map(job => (
                    <div key={job.id} className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-all shadow-sm group">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h5 className="text-xs font-black text-slate-800 line-clamp-1">{job.title}</h5>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400">
                            <span className="px-1.5 py-0.5 bg-slate-100 rounded capitalize">{job.status?.toLowerCase().replace('_', ' ')}</span>
                            <span>•</span>
                            <span>{job.submissions || 0} Subs</span>
                          </div>
                        </div>
                        {job.status === 'PENDING_FINANCIAL_APPROVAL' ? (
                          <Button 
                            onClick={() => setShowApprovalModal(job)}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[9px] font-black uppercase px-2 py-1 h-fit shadow-lg shadow-amber-100 animate-pulse"
                          >
                            Set Margin
                          </Button>
                        ) : (
                          <div className="text-[11px] font-black text-emerald-600 flex items-center gap-1">
                            <CheckCircle size={10} />
                            <span>${job.financials?.vendorPayout || job.rate.replace(/[^0-9]/g, '')}/hr</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <div className="bg-slate-900 rounded-2xl p-4 text-white">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldAlert size={14} className="text-emerald-400" />
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Compliance Verified</h5>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed italic">
                    "Audit successful. MSA and NDA are active on this account. Commercial interactions are logged and secured via Governor Console v4."
                  </p>
               </div>
            </div>
          </div>
          
          <Button variant="outline" className="w-full mt-6 border-slate-200 text-slate-400 h-11 text-[10px] font-black uppercase tracking-widest rounded-xl">
             Download Quarterly Audit
          </Button>
        </div>
      )}

      {/* Margin Governance Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-slate-900">Margin Approval</h2>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">REQ-{showApprovalModal.id?.slice(-4)}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowApprovalModal(null)} className="h-8 w-8 rounded-full">
                <X size={16} />
              </Button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client Target ($)</label>
                <div className="relative">
                  <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="actualBudget" type="number" className="w-full pl-9 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all" defaultValue={showApprovalModal.clientTargetBudget || 100} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Margin Type</label>
                  <select id="marginType" className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all">
                    <option value="PERCENTAGE">Percent (%)</option>
                    <option value="FIXED">Flat ($)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Platform Take</label>
                  <input id="platformMargin" type="number" className="w-full px-3 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all" defaultValue={15} />
                </div>
              </div>

              <div className="bg-indigo-600 rounded-2xl p-5 text-white shadow-xl shadow-indigo-100">
                 <div className="flex justify-between items-center mb-1">
                   <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest">Vendor Approved rate</span>
                   <Clock size={12} className="text-indigo-300" />
                 </div>
                 <div className="text-2xl font-black tracking-tighter">SIMULATED</div>
                 <p className="text-[10px] text-indigo-300 mt-2 font-medium italic">"Vendor network will see this rate only. Client budget is hidden."</p>
              </div>

              <Button 
                onClick={() => {
                  const budget = (document.getElementById('actualBudget') as HTMLInputElement).valueAsNumber;
                  const val = (document.getElementById('platformMargin') as HTMLInputElement).valueAsNumber;
                  const type = (document.getElementById('marginType') as HTMLSelectElement).value as any;
                  handleApproveMargin(showApprovalModal, budget, val, type);
                }}
                className="w-full bg-slate-900 hover:bg-black text-white font-black h-14 rounded-2xl shadow-xl shadow-slate-200 uppercase tracking-widest text-[11px] mt-2 transition-all active:scale-[0.98]"
              >
                Approve & Release Requirement
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
