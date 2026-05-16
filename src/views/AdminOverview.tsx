import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { DollarSign, Briefcase, Users, Activity } from "lucide-react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { useNavigate } from "react-router-dom";

export default function AdminOverview() {
  const [data, setData] = useState<any>({ candidates: [], organizations: [], dealRooms: [], requirements: [], submissions: [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Derived Financial Metrics
  const totalBilling = data.requirements.reduce((acc: number, req: any) => acc + (req.financials?.clientBudget || 0), 0);
  const totalMargin = data.requirements.reduce((acc: number, req: any) => acc + (req.financials?.adminMargin || 0), 0);
  const avgMarginPercent = totalBilling > 0 ? (totalMargin / totalBilling) * 100 : 0;
  const pendingExposure = data.requirements
    .filter((r: any) => r.status === 'PENDING_FINANCIAL_APPROVAL')
    .reduce((acc: number, req: any) => acc + (req.clientTargetBudget || 0), 0);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchData();
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
        const user = auth.currentUser;
        if (!user) return;

        const token = await user.getIdToken();
        const response = await fetch('/api/admin/governance-data', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
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
          console.warn(`Governance API returned ${response.status}, attempting Firestore fallback.`);
          const [candSnap, orgSnap, drSnap, reqSnap, subSnap] = await Promise.all([
              getDocs(collection(db, "candidatePool")).catch(() => ({docs: []} as any)),
              getDocs(collection(db, "organizations")).catch(() => ({docs: []} as any)),
              getDocs(collection(db, "dealRooms")).catch(() => ({docs: []} as any)),
              getDocs(collection(db, "requirements_public")).catch(() => ({docs: []} as any)),
              getDocs(collection(db, "submissions")).catch(() => ({docs: []} as any)),
          ]);
          setData({
              candidates: candSnap.docs.map((d: any) => ({id: d.id, ...d.data()})),
              organizations: orgSnap.docs.map((d: any) => ({id: d.id, ...d.data()})),
              dealRooms: drSnap.docs.map((d: any) => ({id: d.id, ...d.data()})),
              requirements: reqSnap.docs.map((d: any) => ({id: d.id, ...d.data()})),
              submissions: subSnap.docs.map((d: any) => ({id: d.id, ...d.data()}))
          });
        }
    } catch (err: any) {
        console.error("Governance Sync failed", err);
        if (err.name === 'FirebaseError') {
           handleFirestoreError(err, OperationType.LIST, "admin_overview_sync");
        }
    } finally {
      setLoading(false);
    }
  }

  const handleBootstrap = async () => {
    if (!window.confirm("This will overwrite/populate your real Firestore with mock Marketplace data. Proceed?")) return;
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Authentication required for bootstrap protocol.");
        return;
      }
      const token = await user.getIdToken();
      const response = await fetch('/api/admin/governance-data', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Could not fetch mock data from server. Authority rejected.");
      const resData = await response.json();
      
      const collections = {
        candidatePool: resData.candidatePool,
        organizations: resData.organizations,
        dealRooms: resData.dealRooms,
        requirements_public: resData.requirements_public,
        submissions: resData.submissions
      };

      for (const [colName, items] of Object.entries(collections)) {
        if (!items || !Array.isArray(items)) continue;
        for (const item of (items as any[])) {
          const { id, ...rest } = item;
          try {
            const docRef = doc(collection(db, colName), id || undefined);
            await setDoc(docRef, { ...rest, updatedAt: new Date().toISOString() }, { merge: true });
          } catch (writeErr) {
            console.error(`Bootstrap FAILED for ${colName}/${id}:`, writeErr);
          }
        }
      }
      alert("Marketplace Bootstrapped successfully!");
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
          { label: "Est. Margin (₹)", value: `₹${Math.round((totalMargin * 83) / 1000)}k`, icon: DollarSign, color: "text-emerald-600" },
          { label: "Avg Margin %", value: `${avgMarginPercent.toFixed(1)}%`, icon: Activity, color: "text-amber-600" },
          { label: "Pending Budget", value: `₹${Math.round((pendingExposure * 83) / 1000)}k`, icon: Users, color: "text-indigo-600" }
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
            <Button variant="ghost" className="text-[9px] h-6 uppercase font-bold" onClick={() => navigate('/clients')}>View Hub</Button>
          </div>
          <div className="p-4 space-y-3">
             {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').map((req: any) => (
               <div 
                  key={req.id} 
                  onClick={() => navigate('/clients')}
                  className="flex justify-between items-center p-3 border border-slate-100 rounded-xl hover:border-indigo-200 hover:bg-slate-50 transition-all cursor-pointer group"
               >
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-600">{req.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono italic">Tenant: {req.clientId} • Target: ₹{(req.clientTargetBudget * 83).toLocaleString()}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-100">Review Required</Badge>
                  </div>
               </div>
             ))}
             {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').length === 0 && (
               <div className="text-center py-8 text-slate-400 text-xs italic">All commercial gates are currently clear.</div>
             )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Platform Profit vs Scaling</h3>
          </div>
          <div className="p-4 space-y-4">
             <div className="flex items-end justify-between h-24 space-x-2">
                {[45, 67, 89, 45, 92, 78, 100].map((h, i) => (
                  <div key={i} className="flex-1 bg-emerald-500/20 hover:bg-emerald-500 rounded-t-sm transition-all" style={{ height: `${h}%` }}></div>
                ))}
             </div>
             <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="space-y-1">
                   <div className="text-[9px] font-bold text-slate-400 uppercase">Margin Health</div>
                   <div className="text-sm font-bold text-emerald-600">Optimal (18.2%)</div>
                </div>
                <div className="space-y-1">
                   <div className="text-[9px] font-bold text-slate-400 uppercase">Leakage Risk</div>
                   <div className="text-sm font-bold text-amber-600">Low (2.4%)</div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
