import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "../lib/Button";

export default function ClientsTab() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [jobs, setJobs] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  async function fetchClients() {
      const q = query(collection(db, "organizations"), where("type", "==", "client"));
      const snap = await getDocs(q);
      const clientsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClients(clientsData);

      // Fetch jobs and submissions to show counts
      const jobsSnap = await getDocs(collection(db, "requirements_public"));
      setJobs(jobsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const subsSnap = await getDocs(collection(db, "submissions"));
      setSubmissions(subsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      setLoading(false);
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
      {loading ? <div>Loading...</div> : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
              <th className="pb-3">Company Name</th>
              <th className="pb-3">Client ID</th>
              <th className="pb-3 text-center">Jobs Posted</th>
              <th className="pb-3 text-center">Matching</th>
              <th className="pb-3">Compliance</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map(c => (
              <tr key={c.id} className="hover:bg-slate-50/50">
                <td className="py-4 font-bold text-slate-700">{c.companyName}</td>
                <td className="py-4 font-mono text-[10px] text-slate-400">{c.id}</td>
                <td className="py-4 text-center font-bold text-indigo-600">{getJobCount(c.id)}</td>
                <td className="py-4 text-center">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-100">
                        {getMatchCount(c.id)} Candidates
                    </span>
                </td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${c.msaUploaded ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>MSA</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${c.ndaUploaded ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>NDA</span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <Button onClick={() => handleDeleteClient(c.id)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-2 py-1 text-[10px] font-bold uppercase">Terminate</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
