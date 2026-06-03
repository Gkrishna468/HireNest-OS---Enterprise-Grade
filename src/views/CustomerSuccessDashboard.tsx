import React, { useState, useEffect } from "react";
import { Users, TrendingUp, BarChart, MousePointerClick, HeartHandshake, Briefcase, UserCheck } from "lucide-react";
import { cn } from "../lib/utils";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";

export default function CustomerSuccessDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    clients: 0,
    vendors: 0,
    recruiters: 0,
    placements: 0,
    loginEvents: 0,
    totalEvents: 0
  });

  useEffect(() => {
    const fetchAdoption = async () => {
      try {
        const orgsSnap = await getDocs(collection(db, "organizations"));
        let clients = 0;
        let vendors = 0;
        orgsSnap.docs.forEach(d => {
          if (d.data().type === 'client') clients++;
          if (d.data().type === 'vendor') vendors++;
        });

        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "recruiter")));
        let recruiters = usersSnap.size;

        const subsSnap = await getDocs(query(collection(db, "submissions"), where("status", "in", ["PLACED", "HIRED"])));
        let placements = subsSnap.size;

        const eventsSnap = await getDocs(collection(db, "eventLedger"));
        let totalEvents = eventsSnap.size;
        let loginEvents = eventsSnap.docs.filter(e => e.data().type === 'UserLoggedIn').length;

        setMetrics({
          clients,
          vendors,
          recruiters,
          placements,
          loginEvents,
          totalEvents
        });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdoption();
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
            <p className="text-3xl font-black text-slate-900">{metrics.clients}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Clients</p>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl inline-block mb-4">
               <Users size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">{metrics.vendors}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Active Vendors</p>
         </div>

         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl inline-block mb-4">
               <UserCheck size={24} />
            </div>
            <p className="text-3xl font-black text-slate-900">{metrics.recruiters}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Total Recruiters</p>
         </div>

         <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 col-span-1 text-white">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl inline-block mb-4">
               <BarChart size={24} />
            </div>
            <p className="text-3xl font-black text-white">{metrics.placements}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Placements YTD</p>
         </div>

         {/* Event Ledger Stats */}
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-4">
            <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2">Platform Activity Matrix</h3>
            <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-bold text-slate-600 w-48 truncate">Total System Events Authenticated</span>
                     <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500" style={{ width: '100%'}}/>
                     </div>
                     <span className="text-[10px] font-mono font-black text-slate-400 w-16 text-right">{metrics.totalEvents}</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <span className="text-xs font-bold text-slate-600 w-48 truncate">Recorded Logins & Sessions</span>
                     <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500" style={{ width: `${metrics.totalEvents ? Math.min((metrics.loginEvents / metrics.totalEvents) * 100, 100) : 0}%`}}/>
                     </div>
                     <span className="text-[10px] font-mono font-black text-slate-400 w-16 text-right">{metrics.loginEvents}</span>
                  </div>
            </div>
         </div>
      </div>
    </div>
  );
}
