import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "../lib/Button";
import { Eye, Star, Briefcase, Activity } from "lucide-react";

export default function VendorsTab() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [candidates, setCandidates] = useState<any[]>([]);

  async function fetchVendors() {
      try {
        // Attempt administrative proxy first for Global HQ
        const response = await fetch('/api/admin/governance-data');
        if (response.ok) {
          const data = await response.json();
          const orgs = (data.organizations || []).filter((o: any) => o.type === "vendor");
          setVendors(orgs);
          if (data.candidatePool) setCandidates(data.candidatePool);
        } else {
          const q = query(collection(db, "organizations"), where("type", "==", "vendor"));
          const snap = await getDocs(q);
          const vendorsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          setVendors(vendorsData);

          const candSnap = await getDocs(collection(db, "candidatePool"));
          setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      } catch (err: any) {
        console.warn("Governance API failed, attempting Firestore fallback", err);
        try {
          const q = query(collection(db, "organizations"), where("type", "==", "vendor"));
          const snap = await getDocs(q);
          setVendors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (fErr) {
          handleFirestoreError(fErr, OperationType.LIST, "vendors_governance");
        }
      } finally {
        setLoading(false);
      }
  }

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleDeleteVendor = async (vendorId: string) => {
    if (!vendorId) return;
    if (!window.confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "organizations", vendorId));
      await fetchVendors();
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `organizations/${vendorId}`);
    }
  };

  const getCandidateCount = (vendorId: string) => candidates.filter(c => c.vendorId === vendorId).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Vendor Governance</h1>
        <p className="text-sm text-slate-500">Manage vendor bench strength and compliance status.</p>
      </div>
      {loading ? <div className="text-sm text-slate-400 font-mono animate-pulse">Establishing secure link to governance layer...</div> : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
              <th className="pb-3">Organization Name</th>
              <th className="pb-3 text-center">Bench Resources</th>
              <th className="pb-3 text-center">Efficiency</th>
              <th className="pb-3">Rating</th>
              <th className="pb-3">Compliance</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.map(v => {
              const candCount = getCandidateCount(v.id);
              const rating = v.rating || (candCount > 0 ? 4.2 : 0);
              
              return (
                <tr key={v.id} className="hover:bg-slate-50/50 group">
                  <td className="py-4">
                    <div className="font-bold text-slate-700">{v.companyName}</div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Vendor ID: {v.id}</div>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                          {candCount} Active
                      </span>
                      <div className="flex items-center space-x-1 mt-1 text-[9px] text-slate-400 uppercase font-bold">
                        <Briefcase size={10} />
                        <span>Bench Strength</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 text-center">
                    <div className="flex flex-col items-center">
                       <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden mb-1">
                          <div className="bg-indigo-500 h-full" style={{ width: candCount > 0 ? '65%' : '0%' }}></div>
                       </div>
                       <div className="flex items-center space-x-1 text-[9px] text-slate-500 font-bold uppercase">
                          <Activity size={10} />
                          <span>{candCount > 0 ? 'High' : 'N/A'}</span>
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
                       <span title="Master Service Agreement" className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${v.msaUploaded ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>MSA</span>
                       <span title="Non-Disclosure Agreement" className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${v.ndaUploaded ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>NDA</span>
                    </div>
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button onClick={() => alert(`Viewing analytics for ${v.companyName}`)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors">
                        <Eye size={16} />
                      </button>
                      <Button onClick={() => handleDeleteVendor(v.id)} className="bg-white hover:bg-red-50 text-red-500 border border-slate-200 hover:border-red-100 px-2 py-1 text-[9px] font-bold uppercase tracking-widest transition-all">Terminate</Button>
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
