import React, { useState, useEffect } from "react";
import { Network, Brain, Cpu, FileText, Share2, Target, GitMerge, Award, Database, AlertTriangle, CheckCircle2 } from "lucide-react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function KnowledgeIntelligenceTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin", "ceo"].includes(userRole);
  const [loading, setLoading] = useState(true);
  
  const [auditResults, setAuditResults] = useState<any[]>([]);

  const collectionsToAudit = [
    { id: "vendor_performance", name: "Vendor Performance", eventSource: "Submission/Placement Events" },
    { id: "recruiter_performance", name: "Recruiter Performance", eventSource: "Submission/Placement Events" },
    { id: "revenue_pipeline", name: "Revenue Pipeline", eventSource: "Deal Room/Placement Events" },
    { id: "candidate_matches", name: "Candidate Matches", eventSource: "Match Engine / AI Copilot" },
    { id: "match_opportunities", name: "Match Opportunities", eventSource: "Requirement/Candidate PubSub" },
    { id: "placements", name: "Placements", eventSource: "Deal Room Closure" },
    { id: "invoices", name: "Invoices", eventSource: "Placement Ledger" },
    { id: "vendor_payouts", name: "Vendor Payouts", eventSource: "Invoice Payment" }
  ];

  useEffect(() => {
    async function runAudit() {
      setLoading(true);
      const results = [];
      
      for (const coll of collectionsToAudit) {
        try {
          const q = query(collection(db, coll.id), limit(1));
          const snap = await getDocs(q);
          results.push({
            ...coll,
            hasRecords: !snap.empty,
            status: !snap.empty ? 'VERIFIED' : 'EMPTY',
            error: null
          });
        } catch (err: any) {
          results.push({
            ...coll,
            hasRecords: false,
            status: 'ERROR',
            error: err.message
          });
        }
      }
      
      setAuditResults(results);
      setLoading(false);
    }
    
    if (isAdmin) {
      runAudit();
    }
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HQ
      </div>
    );
  }

  const allVerified = auditResults.length > 0 && auditResults.every(r => r.hasRecords);

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-8 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
           <Database size={200} className="text-emerald-400" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <Database className="text-emerald-400" size={28} />
            <h1 className="text-3xl font-black text-white tracking-tighter">
              Production Data Audit
            </h1>
          </div>
          <p className="text-slate-400 font-medium text-sm max-w-2xl mt-2">
            Before moving to the Knowledge Graph and Predictive Intelligence, we must verify that all foundational SSOT collections contain real production records created from events. No manual seeding. No mock data.
          </p>
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto w-full space-y-8">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-600">
                 <Database size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Collections Audited</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">{collectionsToAudit.length}</div>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                 <CheckCircle2 size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Verified (Real Data)</h3>
              </div>
              <div className="text-3xl font-black text-emerald-600">
                {loading ? '-' : auditResults.filter(r => r.hasRecords).length}
              </div>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-amber-600">
                 <AlertTriangle size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Empty / Pending</h3>
              </div>
              <div className="text-3xl font-black text-amber-600">
                {loading ? '-' : auditResults.filter(r => !r.hasRecords).length}
              </div>
           </div>
        </div>

        {/* Intelligence Ledger */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
             <div>
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">SSOT Collection Status</h3>
               <p className="text-xs text-slate-500 mt-1">Verifying event-driven data flow: Event Source &rarr; Collection &rarr; Dashboard</p>
             </div>
             <div className="flex items-center gap-3">
               {!loading && allVerified && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">
                    <CheckCircle2 size={14} /> Ready for Knowledge Graph
                  </div>
               )}
               {!loading && !allVerified && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">
                    <AlertTriangle size={14} /> Audit Required
                  </div>
               )}
             </div>
           </div>

           <div className="p-0">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-100">
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Collection</th>
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Source</th>
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action Required</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {loading ? (
                   <tr>
                     <td colSpan={4} className="py-12 text-center text-slate-500 text-sm font-medium">
                       Running Production Audit...
                     </td>
                   </tr>
                 ) : (
                   auditResults.map((result) => (
                     <tr key={result.id} className="hover:bg-slate-50 group">
                       <td className="py-4 px-6 font-mono text-sm font-medium text-slate-700">{result.id}</td>
                       <td className="py-4 px-6 text-sm text-slate-600">{result.eventSource}</td>
                       <td className="py-4 px-6">
                         {result.hasRecords ? (
                           <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md w-fit">
                             <CheckCircle2 size={14} /> VERIFIED (Records &gt; 0)
                           </span>
                         ) : result.status === 'ERROR' ? (
                           <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-md w-fit">
                             <AlertTriangle size={14} /> PERMISSION / ERROR
                           </span>
                         ) : (
                           <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md w-fit">
                             <AlertTriangle size={14} /> EMPTY
                           </span>
                         )}
                       </td>
                       <td className="py-4 px-6">
                         {result.hasRecords ? (
                           <span className="text-xs text-slate-400">None. SSOT confirmed.</span>
                         ) : (
                           <div className="text-xs text-rose-600 font-medium">
                             Audit <span className="font-mono bg-rose-50 px-1 rounded">{result.eventSource}</span> &rarr; {result.id} &rarr; Dashboard
                           </div>
                         )}
                         {result.error && <div className="text-[10px] text-rose-400 mt-1">{result.error}</div>}
                       </td>
                     </tr>
                   ))
                 )}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}

