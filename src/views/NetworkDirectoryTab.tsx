import React, { useState, useEffect } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Network, Users, Building2, Fingerprint, Activity } from "lucide-react";
import { cn } from "../lib/utils";

type FilterType = 'organizations' | 'people' | 'candidates' | 'requirements' | 'submissions';

export default function NetworkDirectoryTab() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('organizations');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Simulated fetching based on activeFilter
    setLoading(true);
    setTimeout(() => {
        setData([]);
        setLoading(false);
    }, 600);
  }, [activeFilter]);

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">Network Directory</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Global Operational Graph</p>
        </div>
      </div>

      {/* Unified Visibility Nav */}
      <div className="flex space-x-2 border-b border-slate-200 pb-px overflow-x-auto">
        {[
          { id: 'organizations', label: 'Organizations', icon: Building2 },
          { id: 'people', label: 'People & Recruiters', icon: Users },
          { id: 'candidates', label: 'Global Candidates', icon: Fingerprint },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id as FilterType)}
            className={cn(
              "px-4 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 whitespace-nowrap border-b-2 transition-colors",
              activeFilter === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
            )}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm p-8 min-h-[400px]">
        {loading ? (
             <div className="flex h-full items-center justify-center p-20">
             <div className="flex flex-col items-center gap-4">
               <Activity className="h-8 w-8 animate-bounce text-indigo-600" />
               <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                 Syncing Network Graph...
               </p>
             </div>
           </div>
        ) : (
            <div className="text-center py-20 text-slate-400">
                <Network className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest mb-1">Graph Synced</p>
                <p className="text-[10px]">Populating {activeFilter} data based on unified visibility RBAC.</p>
            </div>
        )}
      </div>
    </div>
  );
}
