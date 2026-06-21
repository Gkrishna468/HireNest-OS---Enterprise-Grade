import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Star, Building2, Users, Briefcase, Zap, TrendingUp, AlertTriangle } from 'lucide-react';
import { useSystemStore } from '../stores/SystemStore';

export default function MatchIntelligenceTab() {
  const { userData } = useSystemStore();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'requirements' | 'candidates'>('requirements');
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    const fetchMatches = async () => {
      if (!userData) return;
      setLoading(true);
      try {
        const isAdmin = userData?.role === 'admin' || userData?.role === 'hq';
        const isClient = userData?.role === 'client';
        const isVendor = userData?.role === 'vendor';
        const orgId = userData?.organizationId;

        let q;
        if (isAdmin || isClient) {
           q = query(
             collection(db, "candidate_matches"),
             limit(50)
           );
        } else if (isVendor && orgId) {
           q = query(
             collection(db, "candidate_matches"),
             where("vendorId", "==", orgId),
             limit(50)
           );
        } else {
           // Provide fallback query
           q = query(
             collection(db, "candidate_matches"),
             limit(1)
           );
        }

        const snapshot = await getDocs(q);
        if (active) {
          setMatches(snapshot.docs.map(d => ({ id: d.id, ...(d.data() as object) })));
        }
      } catch (err) {
        console.error("Match engine list error", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    
    fetchMatches();

    return () => { active = false; };
  }, [userData]);

  const isAdmin = userData?.role === 'admin' || userData?.role === 'hq';

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto flex justify-center items-center h-64">
        <div className="text-center text-slate-400">
          <Zap className="mx-auto mb-3 animate-pulse text-indigo-400" size={32} />
          <p className="font-bold tracking-widest uppercase text-[10px]">Evaluating match intel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Star className="text-amber-500" size={24} />
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Match Intelligence</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-xl text-sm">
            AI-driven opportunity discovery. This engine automatically matches bench candidates with active requirements, uncovering hidden revenue.
          </p>
        </div>
        
        <div className="flex p-1 bg-slate-100 rounded-lg">
          <button 
            onClick={() => setViewMode('requirements')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'requirements' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            By Requirement
          </button>
          <button 
            onClick={() => setViewMode('candidates')}
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${viewMode === 'candidates' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
          >
            By Candidate
          </button>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="bg-white border text-center py-24 rounded-2xl border-slate-200">
           <Zap className="mx-auto mb-4 text-slate-300" size={48} />
           <h2 className="text-xl font-black text-slate-800 mb-2">No Match Intelligence Available Yet</h2>
           <p className="text-sm font-medium text-slate-500 mb-6 max-w-md mx-auto">
             The Match Engine runs automatically when new candidates are added or new requirements are published. Check back soon for AI-generated opportunities.
           </p>
           {isAdmin && (
             <button className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors uppercase tracking-wider">
               Run Match Scan
             </button>
           )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
               <Zap className="absolute -right-4 -bottom-4 text-amber-500/10" size={80} />
               <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Total Matches</p>
               <p className="text-3xl font-black text-slate-900 mt-2">{matches.length}</p>
            </div>
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm relative overflow-hidden">
               <Briefcase className="absolute -right-4 -bottom-4 text-indigo-500/10" size={80} />
               <p className="text-[10px] font-black tracking-widest text-slate-500 uppercase">Avg Match Score</p>
               <p className="text-3xl font-black text-slate-900 mt-2">
                 {Math.round(matches.reduce((acc, m) => acc + (m.score || m.matchScore || 0), 0) / matches.length)}%
               </p>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
             <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Real-time Opportunities
                </h3>
             </div>
             <div className="divide-y divide-slate-100">
               {matches.map(match => (
                  <div key={match.id} className="p-4 flex items-center justify-between">
                     <div>
                       <p className="font-bold text-slate-900">Req: {match.requirementId}</p>
                       <p className="text-xs text-slate-500">Candidate: {match.candidateId || match.candidateName}</p>
                     </div>
                     <div className="text-right">
                       <span className="inline-flex items-center gap-1 font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full text-xs">
                         {match.score || match.matchScore}% Match
                       </span>
                     </div>
                  </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
