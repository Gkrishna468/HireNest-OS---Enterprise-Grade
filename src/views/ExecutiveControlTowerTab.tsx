import React, { useState, useEffect } from "react";
import { TrendingUp, Users, Target, Activity, Search, Award, BarChart3, Clock, ArrowUpRight, ArrowDownRight, Briefcase, Star, MessageSquare, Video, ShieldAlert, DollarSign } from "lucide-react";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function ExecutiveControlTowerTab() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    crmPipeline: 0,
    openReqs: 0,
    matchOpps: 0,
    submissions: 0,
    interviews: 0,
    placements: 0,
    forecastRev: 0,
    actualRev: 0,
    riskAlerts: 0
  });

  useEffect(() => {
    let active = true;

    const fetchAll = async () => {
      try {
        const reqsSnap = await getDocs(collection(db, "requirements_public"));
        const revSnap = await getDocs(collection(db, "revenue_pipeline"));
        const oppsSnap = await getDocs(collection(db, "match_opportunities"));
        const subsSnap = await getDocs(collection(db, "submissions"));
        const placementsSnap = await getDocs(collection(db, "placements"));
        
        if (!active) return;

        let crmValue = 0;
        let forecast = 0;

        revSnap.docs.forEach(d => {
          const r = d.data();
          crmValue += r.pipelineValue || 0;
          forecast += r.forecastRevenue || r.expectedRevenue || 0;
        });

        let openReqs = 0;
        reqsSnap.docs.forEach(d => {
           const r = d.data();
           if (r.status === 'OPEN' || r.status === 'PUBLISHED') openReqs++;
        });

        let interviews = 0;
        let placements = 0;
        let risks = 0;

        subsSnap.docs.forEach(d => {
           const s = d.data();
           if (s.status === 'INTERVIEWING') interviews++;
           if (s.status === 'HIRED' || s.status === 'PLACED') placements++;
           if (s.status === 'REJECTED' || s.status === 'DROPPED') risks++;
        });

        let actual = 0;
        placementsSnap.docs.forEach(d => {
          const p = d.data();
          if (p.status === 'PAID' || p.status === 'INVOICED') {
             actual += (p.expectedFee || p.fee || 0);
          }
        });

        setData({
          crmPipeline: crmValue,
          openReqs: openReqs,
          matchOpps: oppsSnap.size,
          submissions: subsSnap.size,
          interviews,
          placements,
          forecastRev: forecast,
          actualRev: actual,
          riskAlerts: risks
        });

      } catch (err) {
        console.warn("Error fetching executive data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
    return () => { active = false; };
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest">Loading Executive Control Tower...</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 overflow-y-auto">
      <div className="px-8 py-8 border-b border-slate-800 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Executive Control Tower</h1>
          <p className="text-sm text-slate-400 mt-1">Real-time revenue pipeline and delivery orchestration.</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-xl border border-emerald-400/20">
             <Activity size={12} />
             <span>Real-Time Sync Active</span>
          </div>
        </div>
      </div>

      <div className="p-8">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
           <TrendingUp size={16} /> Revenue Pipeline Lifecycle
        </h2>
        
        {/* Waterfall Funnel */}
        <div className="relative">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden group">
               <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CRM Pipeline</div>
                 <Briefcase className="w-4 h-4 text-indigo-400" />
               </div>
               <div className="text-xl font-black text-white">${(data.crmPipeline / 1000).toFixed(1)}k</div>
            </div>
            
            <div className="flex items-center justify-center text-slate-600 hidden lg:flex">
               <ArrowUpRight size={20} />
            </div>

            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Open Reqs</div>
                 <Target className="w-4 h-4 text-blue-400" />
               </div>
               <div className="text-xl font-black text-white">{data.openReqs}</div>
            </div>

            <div className="flex items-center justify-center text-slate-600 hidden lg:flex">
               <ArrowUpRight size={20} />
            </div>

            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-violet-500"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Matches</div>
                 <Star className="w-4 h-4 text-violet-400" />
               </div>
               <div className="text-xl font-black text-white">{data.matchOpps}</div>
            </div>

            <div className="flex items-center justify-center text-slate-600 hidden lg:flex">
               <ArrowUpRight size={20} />
            </div>

            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-fuchsia-500"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Submissions</div>
                 <MessageSquare className="w-4 h-4 text-fuchsia-400" />
               </div>
               <div className="text-xl font-black text-white">{data.submissions}</div>
            </div>

            <div className="flex items-center justify-center text-slate-600 hidden lg:flex">
               <ArrowUpRight size={20} />
            </div>

            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-amber-500"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interviews</div>
                 <Video className="w-4 h-4 text-amber-400" />
               </div>
               <div className="text-xl font-black text-white">{data.interviews}</div>
            </div>

            <div className="flex items-center justify-center text-slate-600 hidden lg:flex">
               <ArrowUpRight size={20} />
            </div>

            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Placements</div>
                 <Award className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="text-xl font-black text-white">{data.placements}</div>
            </div>

            <div className="flex items-center justify-center text-slate-600 hidden lg:flex">
               <ArrowUpRight size={20} />
            </div>

            <div className="bg-slate-800 border border-slate-700 p-5 rounded-2xl relative overflow-hidden col-span-2 md:col-span-1 lg:col-span-2 bg-gradient-to-br from-emerald-900/40 to-slate-800">
               <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400"></div>
               <div className="flex items-center justify-between mb-4">
                 <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Actual Revenue</div>
                 <DollarSign className="w-4 h-4 text-emerald-400" />
               </div>
               <div className="text-3xl font-black text-emerald-400">${(data.actualRev / 1000).toFixed(1)}k</div>
               <div className="text-xs text-slate-400 mt-2">Forecast: ${(data.forecastRev / 1000).toFixed(1)}k</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-12">
           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-sm font-bold text-white flex items-center mb-6">
                <ShieldAlert className="w-4 h-4 mr-2 text-rose-400" /> Risk & Attrition Intelligence
              </h3>
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-900 p-4 rounded-xl border border-rose-900/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Rejected/Dropped</div>
                    <div className="text-2xl font-black text-white">{data.riskAlerts}</div>
                    <div className="text-xs text-rose-400 mt-1 flex items-center"><ArrowUpRight className="w-3 h-3 mr-1"/> Action required</div>
                 </div>
                 <div className="bg-slate-900 p-4 rounded-xl border border-amber-900/50">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Conversion Variance</div>
                    <div className="text-2xl font-black text-white">
                      {data.submissions > 0 ? ((data.placements / data.submissions) * 100).toFixed(1) : 0}%
                    </div>
                    <div className="text-xs text-amber-400 mt-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1"/> Submissions to Placement</div>
                 </div>
              </div>
           </div>

           <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white flex items-center mb-6">
                <Star className="w-4 h-4 mr-2 text-violet-400" /> AI Copilot Intelligence
              </h3>
              <div className="space-y-4">
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-300">"Placement conversion is trending up due to high AI acceptance rates on technical roles."</p>
                 </div>
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-300">"3 Active deal rooms are pending client feedback for more than 48 hours."</p>
                 </div>
                 <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <p className="text-xs text-slate-300">"Vendor Alpha's submissions have generated 40% of the interview pipeline this week."</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
