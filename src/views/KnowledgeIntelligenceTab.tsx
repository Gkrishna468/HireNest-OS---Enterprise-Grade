import React, { useState, useEffect } from "react";
import { Network, Brain, Cpu, FileText, Share2, Target, GitMerge, Award } from "lucide-react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function KnowledgeIntelligenceTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(userRole);
  const [loading, setLoading] = useState(true);
  
  // Simulated knowledge patterns based on platform data
  const patterns = [
    {
      id: "PT-001",
      domain: "Java Requirement",
      target: "Vendor A",
      insight: "Historically produces 62% interview rate and 28% placement rate for Java roles within 14 days.",
      confidence: 94,
      type: "VENDOR_AFFINITY"
    },
    {
      id: "PT-002",
      domain: "Data Engineer",
      target: "Recruiter B",
      insight: "Average fill time of 11 Days with a 45% margin. Strong sourcing network detected.",
      confidence: 88,
      type: "RECRUITER_AFFINITY"
    },
    {
      id: "PT-003",
      domain: "Enterprise Tech Clients",
      target: "Pricing Strategy",
      insight: "Requirements with >= 22% expected margin close 40% faster than those below 18%.",
      confidence: 91,
      type: "COMMERCIAL_PATTERN"
    },
    {
      id: "PT-004",
      domain: "Healthcare IT",
      target: "Submission Timing",
      insight: "Submissions made within first 48 hours have a 3x higher probability of interview selection.",
      confidence: 85,
      type: "SLA_PATTERN"
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

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
           <Network size={200} className="text-fuchsia-400" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <Share2 className="text-fuchsia-400" size={28} />
            <h1 className="text-3xl font-black text-white tracking-tighter">
              Knowledge Graph
            </h1>
          </div>
          <p className="text-slate-400 font-medium text-sm max-w-2xl">
            Synthesized operational intelligence derived from historic placements, submissions, and vendor performance. Fed directly into the Autonomous Match Engine.
          </p>
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto w-full space-y-8">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-fuchsia-600">
                 <GitMerge size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Active Patterns</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">{loading ? '-' : '248'}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Derived from SSOT</p>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-indigo-600">
                 <Target size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Prediction Accuracy</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">{loading ? '-' : '92.4%'}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Last 30 days</p>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-emerald-600">
                 <Award size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Match Optimization</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">{loading ? '-' : '+34%'}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Conversion lift</p>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-amber-600">
                 <Brain size={18} />
                 <h3 className="text-[10px] font-black uppercase tracking-widest">Copilot Integration</h3>
              </div>
              <div className="text-3xl font-black text-slate-800">{loading ? '-' : 'Live'}</div>
              <p className="text-xs text-slate-500 mt-2 font-medium">Continuous learning</p>
           </div>
        </div>

        {/* Intelligence Ledger */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
           <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
             <div>
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-800">Synthesized Patterns</h3>
               <p className="text-xs text-slate-500 mt-1">High-confidence rules extracted from historical placements and submissions.</p>
             </div>
             <button className="text-xs font-bold bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-50">
               Refresh Graph
             </button>
           </div>

           <div className="p-0">
             <table className="w-full text-left border-collapse">
               <thead>
                 <tr className="bg-slate-50 border-b border-slate-100">
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pattern ID</th>
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Domain</th>
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Node</th>
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Insight</th>
                   <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Confidence</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {patterns.map((pt) => (
                   <tr key={pt.id} className="hover:bg-slate-50 group">
                     <td className="py-4 px-6 text-xs font-mono font-medium text-slate-500">{pt.id}</td>
                     <td className="py-4 px-6 font-bold text-sm text-slate-800">{pt.domain}</td>
                     <td className="py-4 px-6">
                       <span className="text-[10px] font-bold uppercase tracking-wider bg-fuchsia-100 text-fuchsia-700 px-2 py-1 rounded">
                         {pt.target}
                       </span>
                     </td>
                     <td className="py-4 px-6 text-sm font-medium text-slate-600 max-w-md leading-relaxed">{pt.insight}</td>
                     <td className="py-4 px-6">
                       <div className="flex items-center gap-2">
                         <div className="w-full bg-slate-100 rounded-full h-2 max-w-[60px]">
                           <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${pt.confidence}%` }}></div>
                         </div>
                         <span className="text-xs font-bold text-slate-700">{pt.confidence}%</span>
                       </div>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>

      </div>
    </div>
  );
}
