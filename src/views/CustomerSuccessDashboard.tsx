import React, { useState, useEffect } from "react";
import { Users, TrendingUp, BarChart, MousePointerClick, HeartHandshake, Briefcase, UserCheck } from "lucide-react";
import { cn } from "../lib/utils";

export default function CustomerSuccessDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching CS metrics
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Growth Metrics...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-emerald-500 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(16,185,129,1)]">
            Customer Success & Growth
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <HeartHandshake size={14} className="text-emerald-500" /> Adoption, Usage & Engagement Monitor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {/* Adoption Funnel Cards */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl inline-block mb-4">
               <Briefcase size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">42</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Clients</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs font-medium">
               <span className="text-slate-500">MoM Growth</span>
               <span className="text-emerald-500 flex items-center"><TrendingUp size={12} className="mr-1"/> +12%</span>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl inline-block mb-4">
               <Users size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">156</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Vendors</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs font-medium">
               <span className="text-slate-500">MoM Growth</span>
               <span className="text-emerald-500 flex items-center"><TrendingUp size={12} className="mr-1"/> +8%</span>
            </div>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl inline-block mb-4">
               <UserCheck size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">312</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Recruiters (DAU)</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-xs font-medium">
               <span className="text-slate-500">Engagement</span>
               <span className="text-indigo-500">84% MAU/DAU</span>
            </div>
         </div>

         <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 col-span-1 text-white">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl inline-block mb-4">
               <BarChart size={24} />
            </div>
            <p className="text-3xl font-black text-white">1,402</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Placements YTD</p>
            <div className="mt-4 pt-4 border-t border-slate-800 flex justify-between text-xs font-medium">
               <span className="text-slate-500">Platform ROI</span>
               <span className="text-emerald-400 flex items-center"><TrendingUp size={12} className="mr-1"/> High</span>
            </div>
         </div>

         {/* Feature Usage Heatmap */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2">Core Feature Usage Grid</h3>
            <div className="space-y-4">
               {[
                  { name: "Candidate 360 View", pct: 98 },
                  { name: "AI Match Score Review", pct: 92 },
                  { name: "Requirement Deal Rooms", pct: 85 },
                  { name: "Ownership Vault Claims", pct: 14 }
               ].map((feat, i) => (
                  <div key={i} className="flex items-center gap-4">
                     <span className="text-xs font-bold text-slate-600 w-48 truncate">{feat.name}</span>
                     <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                           className={cn("h-full", feat.pct > 80 ? "bg-indigo-500" : feat.pct > 40 ? "bg-amber-500" : "bg-slate-300")}
                           style={{ width: `${feat.pct}%`}}
                        />
                     </div>
                     <span className="text-[10px] font-mono font-black text-slate-400 w-8 text-right">{feat.pct}%</span>
                  </div>
               ))}
            </div>
         </div>

         {/* Adoption Health Warnings */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2">Adoption Friction Points</h3>
            <div className="space-y-3">
               <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex gap-3">
                  <div className="mt-0.5"><MousePointerClick size={16} className="text-rose-500" /></div>
                  <div>
                     <p className="text-sm font-bold text-slate-800">Client Portal Drop-off</p>
                     <p className="text-xs text-slate-600 mt-1">22% of Hiring Managers require &gt;3 clicks to locate candidate feedback forms.</p>
                  </div>
               </div>
               <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
                  <div className="mt-0.5"><Users size={16} className="text-amber-500" /></div>
                  <div>
                     <p className="text-sm font-bold text-slate-800">Vendor Onboarding Delay</p>
                     <p className="text-xs text-slate-600 mt-1">Average time to first submission for new vendors is currently 4 days.</p>
                  </div>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
