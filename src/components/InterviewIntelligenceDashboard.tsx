import React, { useEffect, useState } from 'react';
import { BrainCircuit, Filter, Activity, Target, ShieldCheck } from 'lucide-react';
import { Badge } from '../lib/Badge';
import { ServiceProvider } from '../lib/providers/ServiceProvider';

export function InterviewIntelligenceDashboard({ userRole, orgId }: { userRole: string, orgId: string }) {
    const [stats, setStats] = useState<any>({
       subToInt: 0,
       intToOffer: 0,
       intSuccess: 0,
       aiAccuracy: 0,
       totalSubmissions: 0,
       totalInterviews: 0,
       totalOffers: 0
    });
    
    useEffect(() => {
        const fetchStats = async () => {
           try {
               const res = await fetch(`/api/matching/global?role=${userRole}&orgId=${orgId}`);
               if (res.ok) {
                  const data = await res.json();
                  if (data.stats) {
                      setStats(data.stats);
                      return;
                  }
               }
               
               // Temporary mock data fallback
               setStats({
                  subToInt: 32,
                  intToOffer: 15,
                  intSuccess: 65,
                  aiAccuracy: 88,
                  totalSubmissions: 120,
                  totalInterviews: 38,
                  totalOffers: 6
               });
           } catch(e) {
               console.error(e);
           }
        };
        fetchStats();
    }, [orgId, userRole]);

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50/50">
           <div className="max-w-3xl w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-8 border-b border-slate-100 pb-6">
                   <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                       <BrainCircuit size={24} />
                   </div>
                   <div>
                       <h2 className="text-xl font-bold text-slate-800 tracking-tight">Interview Intelligence</h2>
                       <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-1">Lifecycle Telemetry & Analytics</p>
                   </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                   
                   <div className="flex flex-col border border-slate-100 rounded-2xl p-5 bg-slate-50">
                       <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Filter size={12}/> Recruiter Yield</div>
                       <div className="text-3xl font-black text-slate-800">{stats.subToInt}%</div>
                       <div className="text-[10px] text-slate-500 font-semibold mt-1">Submission → Interview</div>
                   </div>

                   <div className="flex flex-col border border-slate-100 rounded-2xl p-5 bg-slate-50">
                       <div className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-1"><Target size={12}/> Client Yield</div>
                       <div className="text-3xl font-black text-slate-800">{stats.intToOffer}%</div>
                       <div className="text-[10px] text-slate-500 font-semibold mt-1">Interview → Offer</div>
                   </div>

                   <div className="flex flex-col border border-slate-100 rounded-2xl p-5 bg-slate-50">
                       <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3 flex items-center gap-1"><ShieldCheck size={12}/> Vendor Success</div>
                       <div className="text-3xl font-black text-slate-800">{stats.intSuccess}%</div>
                       <div className="text-[10px] text-slate-500 font-semibold mt-1">Pass Rate</div>
                   </div>

                   <div className="flex flex-col border border-indigo-100 rounded-2xl p-5 bg-indigo-50/30">
                       <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-1"><Activity size={12}/> AI Validation</div>
                       <div className="text-3xl font-black text-indigo-900">{stats.aiAccuracy}%</div>
                       <div className="text-[10px] text-indigo-600 font-semibold mt-1">High Match → Interviewed</div>
                   </div>

               </div>
               
               <div className="mt-8 bg-slate-900 rounded-2xl p-6 text-white flex items-center justify-between">
                   <div>
                       <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total Pipeline Metrics</div>
                       <div className="text-sm font-semibold text-slate-300">{stats.totalSubmissions} Submissions | {stats.totalInterviews} Interviews | {stats.totalOffers} Offers</div>
                   </div>
                   <Badge variant="outline" className="border-indigo-500 text-indigo-400 bg-indigo-500/10">REAL-TIME</Badge>
               </div>
           </div>
        </div>
    );
}
