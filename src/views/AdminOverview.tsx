import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function AdminOverview() {
  const [data, setData] = useState<any>({ candidates: [], organizations: [], dealRooms: [] });

  useEffect(() => {
    async function fetchData() {
        const [candSnap, orgSnap, drSnap] = await Promise.all([
            getDocs(collection(db, "candidates")),
            getDocs(collection(db, "organizations")),
            getDocs(collection(db, "dealRooms")),
        ]);
        setData({
            candidates: candSnap.docs.map(d => ({id: d.id, ...d.data()})),
            organizations: orgSnap.docs.map(d => ({id: d.id, ...d.data()})),
            dealRooms: drSnap.docs.map(d => ({id: d.id, ...d.data()}))
        });
    }
    fetchData();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Admin Overview</h1>
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded border border-slate-200">
            <h3 className="font-bold">Total Candidates</h3>
            <p className="text-3xl">{data.candidates.length}</p>
        </div>
        <div className="p-4 bg-white rounded border border-slate-200">
            <h3 className="font-bold">Total Orgs</h3>
            <p className="text-3xl">{data.organizations.length}</p>
        </div>
        <div className="p-4 bg-white rounded border border-slate-200">
            <h3 className="font-bold">Active Deal Rooms</h3>
            <p className="text-3xl">{data.dealRooms.length}</p>
        </div>
      </div>
      
      <h2 className="text-xl font-bold mb-4">All Candidates</h2>
      <table className="w-full text-left">
        <thead>
            <tr><th>Name</th><th>Vendor</th><th>Stage</th></tr>
        </thead>
        <tbody>
            {data.candidates.map((c: any) => (
                <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.vendorId}</td>
                    <td>{c.pipelineStage}</td>
                </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
