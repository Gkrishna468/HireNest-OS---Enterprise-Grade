import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "../lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { DollarSign, Briefcase, Users, Activity, Shield, ChevronRight } from "lucide-react";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import { useNavigate } from "react-router-dom";

export default function AdminOverview() {
  const [data, setData] = useState<any>({ 
    candidates: [], 
    organizations: [], 
    dealRooms: [], 
    requirements: [], 
    submissions: [],
    onboardingRequests: [] 
  });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Derived Financial Metrics
  const totalBilling = data.requirements.reduce((acc: number, req: any) => acc + (req.financials?.clientBudget || 0), 0);
  const totalMargin = data.requirements.reduce((acc: number, req: any) => acc + (req.financials?.adminMargin || 0), 0);
  const avgMarginPercent = totalBilling > 0 ? (totalMargin / totalBilling) * 100 : 0;
  const pendingExposure = data.requirements
    .filter((r: any) => r.status === 'PENDING_FINANCIAL_APPROVAL')
    .reduce((acc: number, req: any) => acc + (req.clientTargetBudget || 0), 0);

  const pendingOnboarding = data.onboardingRequests.filter((r: any) => r.verificationStatus === 'PENDING').length;

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
        const [govResp, reqSnap] = await Promise.all([
          fetch('/api/admin/governance-data', {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          getDocs(collection(db, "onboarding_requests")).catch(() => ({ docs: [] } as any))
        ]);

        const onboardReqs = reqSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

        if (govResp.ok) {
          const resData = await govResp.json();
          setData({
              candidates: resData.candidatePool || [],
              organizations: resData.organizations || [],
              dealRooms: resData.dealRooms || [],
              requirements: resData.requirements_public || [],
              submissions: resData.submissions || [],
              onboardingRequests: onboardReqs
          });
        } else {
          console.warn(`Governance API returned ${govResp.status}, attempting Firestore fallback.`);
          const [candSnap, orgSnap, drSnap, reqSnapFull, subSnap] = await Promise.all([
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
              requirements: reqSnapFull.docs.map((d: any) => ({id: d.id, ...d.data()})),
              submissions: subSnap.docs.map((d: any) => ({id: d.id, ...d.data()})),
              onboardingRequests: onboardReqs
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
            <h1 className="text-xl font-black text-slate-900 lowercase tracking-tighter italic">operational trust infrastructure</h1>
            <p className="text-xs text-slate-500 font-bold lowercase">global synchronization across the verified staffing execution network.</p>
        </div>
        <div className="flex items-center space-x-3">
           <button 
             onClick={handleBootstrap}
             className="text-[10px] font-black uppercase tracking-widest text-white bg-slate-900 hover:bg-slate-800 px-6 py-2 rounded-xl shadow-xl shadow-slate-200 transition-all flex items-center gap-2"
           >
             <Activity size={14} /> bootstrap marketplace
           </button>
           <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
              <Shield size={12} />
              <span>network healthy</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Verified Req Pool", value: data.requirements.length, icon: Briefcase, color: "text-indigo-600", desc: "authenticated demand" },
          { label: "Governance Volume", value: `₹${Math.round((totalMargin * 83) / 1000)}k`, icon: DollarSign, color: "text-emerald-600", desc: "platform profit capture" },
          { label: "Onboarding Queue", value: pendingOnboarding, icon: Users, color: "text-amber-600", desc: "Awaiting Network Admission", action: () => navigate('/admin/users') },
          { label: "Node Population", value: data.organizations.length, icon: Shield, color: "text-slate-900", desc: "entities in execution" }
        ].map((stat) => (
          <div 
            key={stat.label} 
            onClick={stat.action}
            className={cn(
              "bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm transition-all",
              stat.action ? "cursor-pointer hover:border-indigo-200 hover:shadow-xl hover:scale-[1.02]" : "hover:shadow-md"
            )}
          >
             <div className="flex items-center justify-between mb-4">
               <div className={`p-2 rounded-xl bg-slate-50 border border-slate-100 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
               </div>
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
             </div>
             <div className="text-2xl font-black text-slate-900 tracking-tighter mb-1">{stat.value}</div>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{stat.desc}</p>
          </div>
        ))}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Node Verification Velocity</h3>
            <div className="flex gap-2">
                <Badge variant="outline" className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border-emerald-100">82% Verified</Badge>
            </div>
          </div>
          <div className="p-8">
             <div className="grid grid-cols-3 gap-8 mb-10">
                {[
                    { label: "GST/Company", count: "14", total: "18", color: "bg-indigo-500" },
                    { label: "Aadhaar/Identity", count: "42", total: "50", color: "bg-emerald-500" },
                    { label: "Official Email", count: "68", total: "74", color: "bg-amber-500" }
                ].map((item, i) => (
                    <div key={i}>
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-[10px] font-black text-slate-800 uppercase italic">{item.label}</span>
                            <span className="text-xs font-black text-slate-900">{Math.round((parseInt(item.count)/parseInt(item.total))*100)}%</span>
                        </div>
                        <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                            <div className={`h-full ${item.color}`} style={{ width: `${(parseInt(item.count)/parseInt(item.total))*100}%` }}></div>
                        </div>
                    </div>
                ))}
             </div>

             <div className="space-y-4">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-300 mb-2">High-Priority Approvals</h4>
                {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').map((req: any) => (
                   <div 
                      key={req.id} 
                      onClick={() => navigate('/admin/execution')}
                      className="flex justify-between items-center p-5 bg-slate-50 border border-slate-100 rounded-3xl hover:border-indigo-200 hover:bg-white hover:shadow-xl transition-all cursor-pointer group"
                   >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-indigo-500 font-black">
                            {req.title.substring(0,1)}
                        </div>
                        <div>
                            <div className="text-xs font-black text-slate-900 uppercase tracking-tight group-hover:text-indigo-600">{req.title}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Budget Exposure: ₹{(req.clientTargetBudget * 83).toLocaleString()} • Pipeline Pending</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="text-right hidden sm:block">
                            <div className="text-[10px] font-black text-slate-400 uppercase italic">Awaiting HQ</div>
                            <div className="text-[9px] text-slate-300 font-bold">2h 45m left</div>
                         </div>
                        <ChevronRight size={16} className="text-slate-200 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                      </div>
                   </div>
                ))}
                {data.requirements.filter((r:any) => r.status === 'PENDING_FINANCIAL_APPROVAL').length === 0 && (
                   <div className="text-center py-8 text-slate-400 text-xs italic">All commercial gates are currently clear.</div>
                )}
             </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-[40px] p-10 text-white flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={160} />
            </div>
            <div className="relative z-10">
                <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-2">Execution Scoreboard</h3>
                <h2 className="text-4xl font-black text-white italic tracking-tighter mb-8 leading-none">network <br/> liquidity v3</h2>
                
                <div className="space-y-8 mt-10">
                    {[
                        { label: "Submission Flow", val: "94.2/min", change: "+12%" },
                        { label: "Closure Turnaround", val: "3.4 Days", change: "-0.8d" },
                        { label: "Trust Degradation", val: "0.2%", change: "stable" }
                    ].map((m, i) => (
                        <div key={i} className="flex justify-between items-end border-b border-slate-800 pb-4">
                            <div>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{m.label}</div>
                                <div className="text-xl font-black font-mono tracking-tighter">{m.val}</div>
                            </div>
                            <div className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-lg border border-emerald-400/20">{m.change}</div>
                        </div>
                    ))}
                </div>

                <Button 
                    onClick={() => navigate('/admin/execution')}
                    className="w-full mt-10 bg-indigo-600 hover:bg-white hover:text-slate-900 h-14 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-2xl shadow-indigo-500/20"
                >
                    go to execution hq
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
}
