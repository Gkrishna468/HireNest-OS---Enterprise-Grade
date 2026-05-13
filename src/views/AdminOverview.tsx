import { useEffect, useState } from "react";
import { db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, query, limit, doc, setDoc } from "firebase/firestore";
import { DollarSign, Briefcase, Users, Radio, Activity } from "lucide-react";
import { Badge } from "../lib/Badge";

export default function AdminOverview() {
  const [data, setData] = useState<any>({ candidates: [], organizations: [], dealRooms: [], requirements: [], submissions: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
        setLoading(true);
        try {
            // Priority 1: Administrative HQ Sync Proxy (Bypasses Firestore Rules)
            const response = await fetch('/api/admin/governance-data');
            if (response.ok) {
              const resData = await response.json();
              setData({
                  candidates: resData.candidatePool || [],
                  organizations: resData.organizations || [],
                  dealRooms: resData.dealRooms || [],
                  requirements: resData.requirements_public || [],
                  submissions: resData.submissions || []
              });
            } else {
              console.warn(`Governance API returned ${response.status}, attempting Firestore direct load.`);
              // Priority 2: Direct Firestore Fallback
              const [candSnap, orgSnap, drSnap, reqSnap] = await Promise.all([
                  getDocs(collection(db, "candidatePool")),
                  getDocs(collection(db, "organizations")),
                  getDocs(collection(db, "dealRooms")),
                  getDocs(collection(db, "requirements_public")),
              ]);
              setData({
                  candidates: candSnap.docs.map(d => ({id: d.id, ...d.data()})),
                  organizations: orgSnap.docs.map(d => ({id: d.id, ...d.data()})),
                  dealRooms: drSnap.docs.map(d => ({id: d.id, ...d.data()})),
                  requirements: reqSnap.docs.map(d => ({id: d.id, ...d.data()})),
                  submissions: []
              });
            }
        } catch (err: any) {
            console.error("Governance Sync & Firestore fallback failed", err);
            // We don't throw into handleFirestoreError if we already tried Proxy
            if (err.name !== 'FirebaseError') {
               // Likely a network error for the proxy
            } else {
               handleFirestoreError(err, OperationType.LIST, "admin_overview_collections");
            }
        } finally {
          setLoading(false);
        }
    }
    fetchData();
  }, []);

  const handleBootstrap = async () => {
    if (!window.confirm("This will overwrite/populate your real Firestore with mock Marketplace data. Proceed?")) return;
    try {
      const response = await fetch('/api/admin/governance-data');
      if (!response.ok) throw new Error("Could not fetch mock data from server");
      const resData = await response.json();
      
      const collections = {
        candidatePool: resData.candidatePool,
        organizations: resData.organizations,
        dealRooms: resData.dealRooms,
        requirements_public: resData.requirements_public,
        submissions: resData.submissions
      };

      for (const [colName, items] of Object.entries(collections)) {
        if (!items || !Array.isArray(items)) {
           console.warn(`Collection ${colName} has no items to bootstrap.`);
           continue;
        }
        for (const item of (items as any[])) {
          const { id, ...rest } = item;
          try {
            // Use doc name from ID if possible, or fallback to auto-id
            const docRef = doc(collection(db, colName), id || undefined);
            await setDoc(docRef, { 
              ...rest, 
              updatedAt: new Date().toISOString(),
              lastBootstrap: new Date().toISOString()
            }, { merge: true });
          } catch (writeErr) {
            console.error(`Bootstrap FAILED for ${colName}/${id}:`, writeErr);
          }
        }
      }
      alert("Marketplace Bootstrapped successfully to Production Firestore!");
      window.location.reload();
    } catch (err) {
      console.error("Bootstrap failed", err);
      alert("Bootstrap failed: " + String(err));
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6 bg-slate-50">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 uppercase tracking-widest">Global Governance Control</h1>
          <p className="text-xs text-slate-500 font-mono">Platform-wide visibility across Marketplace and ERP layers.</p>
        </div>
        <div className="flex items-center space-x-3">
           <button 
             onClick={handleBootstrap}
             className="text-[10px] font-bold uppercase text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-md shadow-sm transition-all"
           >
             Bootstrap Marketplace to Prod
           </button>
           <div className="flex items-center space-x-2 text-[10px] font-bold uppercase text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
              <Activity size={12} />
              <span>System Healthy</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Active Reqs", value: data.requirements.length, icon: Briefcase, color: "text-blue-600" },
          { label: "Total Orgs", value: data.organizations.length, icon: Radio, color: "text-emerald-600" },
          { label: "Deal Rooms", value: data.dealRooms.length, icon: Users, color: "text-amber-600" },
          { label: "Revenue (Mock)", value: "$1.45M", icon: DollarSign, color: "text-indigo-600" }
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-2">
               <stat.icon className={`h-4 w-4 ${stat.color}`} />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stat.label}</span>
             </div>
             <div className="text-2xl font-bold text-slate-800 font-mono">{stat.value}</div>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Pending Governance approvals</h3>
          </div>
          <div className="p-4 space-y-3">
             {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').map((req: any) => (
               <div key={req.id} className="flex justify-between items-center p-2 border border-slate-100 rounded-lg">
                  <div>
                    <div className="text-xs font-bold text-slate-800">{req.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono italic">Client ID: {req.clientId}</div>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700">Financial Review</Badge>
               </div>
             ))}
             {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').length === 0 && (
               <div className="text-center py-8 text-slate-400 text-xs">No pending approvals.</div>
             )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Marketplace Velocity</h3>
          </div>
          <div className="p-4">
             <div className="flex items-end justify-between h-32 space-x-2">
                {[45, 67, 89, 45, 92, 78, 100].map((h, i) => (
                  <div key={i} className="flex-1 bg-indigo-500/20 hover:bg-indigo-500 rounded-t-sm transition-all" style={{ height: `${h}%` }}></div>
                ))}
             </div>
             <div className="flex justify-between mt-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                <span>Mon</span>
                <span>Sun</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
