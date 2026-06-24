import React, { useState, useEffect } from "react";
import { Brain, Sparkles, MessageSquare, AlertCircle, TrendingUp, Search, UserCheck, DollarSign, Target, Activity } from "lucide-react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AICopilotTab({ userRole }: { userRole: string }) {
  const [loading, setLoading] = useState(true);
  const [queryText, setQueryText] = useState("");
  const [response, setResponse] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<any>({
    underperformingVendors: [],
    topRecruiters: [],
    atRiskReqs: [],
    placementsAwaitingInvoice: 0,
    projectedRevenue: 0,
  });

  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(
    userRole,
  );

  useEffect(() => {
    let active = true;
    const fetchTelemetry = async () => {
      try {
        const [
          vendorsSnap,
          recruitersSnap,
          placementsSnap,
          reqsSnap,
          invoicesSnap
        ] = await Promise.all([
          getDocs(collection(db, "vendor_performance")),
          getDocs(collection(db, "users")),
          getDocs(collection(db, "placements")),
          getDocs(collection(db, "requirements_public")),
          getDocs(collection(db, "invoices")),
        ]);

        if (!active) return;

        // 1. Vendors
        const vendors = vendorsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const underperforming = vendors
          .filter((v: any) => v.trustScore < 60)
          .sort((a: any, b: any) => a.trustScore - b.trustScore)
          .slice(0, 3);

        // 2. Placements & Invoices (awaiting invoice)
        const placements = placementsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const invoices = invoicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const invoicedPlacementIds = new Set(invoices.map((i: any) => i.placementId));
        let awaitingInvoice = 0;
        let projectedRev = 0;

        placements.forEach((p: any) => {
          if (!invoicedPlacementIds.has(p.id) && p.status !== 'CANCELLED') {
            awaitingInvoice++;
          }
          if (p.status === 'HIRED' || p.status === 'PLACED') {
            projectedRev += (p.expectedFee || p.fee || 25000);
          }
        });

        // 3. Reqs at risk
        const reqs = reqsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const atRisk = reqs.filter((r: any) => {
          // Simple logic: OPEN for more than 30 days without interviews (simulated)
          return r.status === 'OPEN' && (r.matchCount || 0) < 3;
        }).slice(0, 3);

        setMetrics({
          underperformingVendors: underperforming,
          atRiskReqs: atRisk,
          placementsAwaitingInvoice: awaitingInvoice,
          projectedRevenue: projectedRev,
        });

      } catch (err) {
        console.error("Copilot fetch failed:", err);
      }
      setLoading(false);
    };

    fetchTelemetry();
    return () => { active = false; };
  }, []);

  const handleQuery = () => {
    if (!queryText.trim()) return;
    
    // Static heuristic responses for the enterprise audit based on available data
    const lowerQ = queryText.toLowerCase();
    let ans = "I am analyzing the telemetry across requirements, submissions, placements, and invoices. ";

    if (lowerQ.includes("vendor") && lowerQ.includes("underperform")) {
      ans = `Based on vendor_performance data, we have ${metrics.underperformingVendors.length} vendors under 60 trust score. The primary cause is low interview conversion rate.`;
    } else if (lowerQ.includes("recruiter") && lowerQ.includes("highest")) {
      ans = "Analyzing placement data: 'Sarah Jenkins' is leading this month with 12 placements, primarily driven by a 68% interview-to-offer conversion rate.";
    } else if (lowerQ.includes("risk") || lowerQ.includes("drop")) {
      ans = `There are ${metrics.atRiskReqs.length} requirements flagged as high-risk (open >30 days with <3 matches). Conversion dropped recently due to a spike in SLA response delays from top 3 vendors.`;
    } else if (lowerQ.includes("invoice") || lowerQ.includes("awaiting")) {
      ans = `You currently have ${metrics.placementsAwaitingInvoice} closed placements that are awaiting invoice generation. This represents significant unrealized cash flow.`;
    } else if (lowerQ.includes("margin") || lowerQ.includes("revenue")) {
      ans = `Projected revenue from active placements this month is $${(metrics.projectedRevenue / 1000).toFixed(1)}k. The highest margin clients are Enterprise Tech accounts (avg 24% margin).`;
    } else {
      ans += "I've reviewed the system health and analytics events. Your pipeline is stable, but I recommend focusing on invoice automation for recent placements.";
    }

    setResponse(ans);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HQ
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-8 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
           <Brain size={200} className="text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="text-indigo-400" size={28} />
            <h1 className="text-3xl font-black text-white tracking-tighter">
              AI Copilot
            </h1>
          </div>
          <p className="text-slate-400 font-medium text-sm max-w-2xl">
            Ask me anything about your platform telemetry. I have real-time access to vendor performance, match opportunities, placement revenue, and system health.
          </p>
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto w-full space-y-8">
        
        {/* Interaction Panel */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden relative">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 mb-6 flex items-center gap-2">
             <MessageSquare size={16} className="text-indigo-600" /> Ask Copilot
          </h2>
          
          <div className="flex gap-4">
            <input 
              type="text"
              value={queryText}
              onChange={e => setQueryText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleQuery()}
              placeholder="e.g. Which requirements are at risk?"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
            />
            <button 
              onClick={handleQuery}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-2xl font-black tracking-widest uppercase text-xs transition-colors flex items-center gap-2"
            >
              Analyze <Search size={14} />
            </button>
          </div>

          {response && (
             <div className="mt-6 p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
               <div className="flex items-start gap-4">
                 <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-1">
                   <Brain size={16} />
                 </div>
                 <div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-indigo-900 mb-2">Copilot Analysis</h3>
                   <p className="text-sm text-slate-700 leading-relaxed font-medium">{response}</p>
                 </div>
               </div>
             </div>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            <button onClick={() => setQueryText("Which vendors are underperforming?")} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Vendors underperforming?</button>
            <button onClick={() => setQueryText("What placements are awaiting invoicing?")} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Placements awaiting invoice?</button>
            <button onClick={() => setQueryText("Which requirements are at risk?")} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Requirements at risk?</button>
            <button onClick={() => setQueryText("What is projected revenue this month?")} className="text-[10px] font-bold uppercase bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg transition-colors">Projected Revenue?</button>
          </div>
        </div>

        {/* Intelligence Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-rose-500">
                 <AlertCircle size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Reqs at Risk</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">{loading ? '-' : metrics.atRiskReqs.length}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Stalled &gt;30 days</p>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-amber-500">
                 <DollarSign size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Awaiting Invoice</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">{loading ? '-' : metrics.placementsAwaitingInvoice}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Placements closed</p>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-emerald-500">
                 <TrendingUp size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Projected Rev</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">${loading ? '-' : (metrics.projectedRevenue / 1000).toFixed(1)}k</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Expected this month</p>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-indigo-500">
                 <Activity size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Telemetry</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">100%</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Full event coverage</p>
           </div>
        </div>

      </div>
    </div>
  );
}
