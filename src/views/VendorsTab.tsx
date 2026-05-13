import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Button } from "../lib/Button";

export default function VendorsTab() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [candidates, setCandidates] = useState<any[]>([]);

  async function fetchVendors() {
      const q = query(collection(db, "organizations"), where("type", "==", "vendor"));
      const snap = await getDocs(q);
      const vendorsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setVendors(vendorsData);

      const candSnap = await getDocs(collection(db, "candidatePool"));
      setCandidates(candSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
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
      {loading ? <div>Loading...</div> : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-widest">
              <th className="pb-3">Organization Name</th>
              <th className="pb-3">Vendor ID</th>
              <th className="pb-3 text-center">Bench Resources</th>
              <th className="pb-3">Compliance</th>
              <th className="pb-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vendors.map(v => (
              <tr key={v.id} className="hover:bg-slate-50/50">
                <td className="py-4 font-bold text-slate-700">{v.companyName}</td>
                <td className="py-4 font-mono text-[10px] text-slate-400">{v.id}</td>
                <td className="py-4 text-center">
                    <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                        {getCandidateCount(v.id)} Active
                    </span>
                </td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${v.msaUploaded ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>MSA</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${v.ndaUploaded ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>NDA</span>
                  </div>
                </td>
                <td className="py-4 text-right">
                  <Button onClick={() => handleDeleteVendor(v.id)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 px-2 py-1 text-[10px] font-bold uppercase">Terminate</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
