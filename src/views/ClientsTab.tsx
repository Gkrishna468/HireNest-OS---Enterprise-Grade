import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "../lib/Button";
import { Eye, Star, TrendingUp } from "lucide-react";

export default function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
          setJobs(data.requirements || []);
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Client Governance</h1>
        <p className="text-sm text-slate-500">Monitor active client portfolios and requirement volume.</p>
      </div>
      {loading ? <div className="text-sm text-slate-400 font-mono animate-pulse">Establishing secure link to governance layer...</div> : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
              <th className="pb-3">Company Name</th>
              <th className="pb-3 text-center">Jobs Posted</th>
              <th className="pb-3 text-center">Matching</th>
              <th className="pb-3">Rating</th>
              <th className="pb-3">Compliance</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(c => {
              const jobCount = getJobCount(c.id);
              const matchCount = getMatchCount(c.id);
              const rating = c.rating || (jobCount > 0 ? 4.5 : 0);
              
              return (
                <tr key={c.id} className="hover:bg-slate-50/50 group">
                  <td className="py-4">
                    <div className="font-bold text-slate-700">{c.companyName}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">ID: {c.id}</div>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="font-bold text-indigo-600">{jobCount}</span>
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-tighter">Active Reqs</span>
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">
                          {matchCount} Candidates
                      </span>
                      <div className="flex items-center space-x-1 mt-1 text-[9px] text-slate-400">
                        <TrendingUp size={10} />
                        <span>{matchCount > 0 ? "Above Avg" : "Initial"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center text-amber-500">
                      <Star size={12} fill="currentColor" />
                      <span className="ml-1 text-xs font-bold text-slate-700">{rating === 0 ? "N/A" : rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex gap-2">
                      <span title="Master Service Agreement" className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${c.msaUploaded ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>MSA</span>
                      <span title="Non-Disclosure Agreement" className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${c.ndaUploaded ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>NDA</span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => alert(`Viewing details for ${c.companyName}`)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors">
                        <Eye size={16} />
                      </button>
                      <Button onClick={() => handleDeleteClient(c.id)} className="bg-white hover:bg-red-50 text-red-500 border border-slate-200 hover:border-red-100 px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-all">Terminate</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
