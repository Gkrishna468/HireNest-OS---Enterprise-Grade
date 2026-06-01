import React, { useState, useEffect } from "react";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  Activity, GitBranch, Target, Clock, AlertTriangle, 
  CheckCircle2, DollarSign, Users, Briefcase, ChevronRight, BarChart2,
  ShieldCheck, Network
} from "lucide-react";
import { cn } from "../lib/utils";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, Legend
} from "recharts";

export default function SLAIntelligenceTab() {
  const [loading, setLoading] = useState(true);
  
  // Mock intelligent telemetry until live metrics are fully populated
  const vendorPerformance = [
    { name: 'Vendor A-1', submissions: 145, conversion: 68, speed: 1.2, qualityScore: 94 },
    { name: 'Vendor B-9', submissions: 89, conversion: 42, speed: 2.8, qualityScore: 76 },
    { name: 'Vendor C-3', submissions: 210, conversion: 85, speed: 0.9, qualityScore: 98 },
    { name: 'Vendor D-4', submissions: 45, conversion: 12, speed: 4.5, qualityScore: 54 },
    { name: 'Vendor E-2', submissions: 110, conversion: 55, speed: 1.8, qualityScore: 88 },
  ];

  const slaEvents = [
    { month: 'Jan', breaches: 4, compliance: 96 },
    { month: 'Feb', breaches: 2, compliance: 98 },
    { month: 'Mar', breaches: 8, compliance: 92 },
    { month: 'Apr', breaches: 1, compliance: 99 },
    { month: 'May', breaches: 3, compliance: 97 },
    { month: 'Jun', breaches: 5, compliance: 95 },
  ];

  const pipelineHealth = [
    { stage: 'Sourced', count: 1200 },
    { stage: 'Screened', count: 850 },
    { stage: 'Interviewing', count: 420 },
    { stage: 'Offered', count: 180 },
    { stage: 'Hired', count: 145 },
  ];

  useEffect(() => {
    // In a real implementation this would query the `vendor_metrics`, `sla_events` collections
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Activity className="h-8 w-8 animate-bounce text-indigo-600" />
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">
            Synthesizing SLA Telemetry...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">SLA Intelligence</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Delivery Operations & Governance Layer</p>
        </div>
        <div className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span className="text-[10px] font-black uppercase tracking-widest">Global Network Healthy</span>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Global SLA Compliance", value: "96.4%", trend: "+2.1%", alert: false, icon: Target },
          { label: "Avg Placement Velocity", value: "14.2 Days", trend: "-1.5 Days", alert: false, icon: Clock },
          { label: "Critical Bottlenecks", value: "3", trend: "Finance Dept", alert: true, icon: AlertTriangle },
          { label: "Vendor Trust Index", value: "88/100", trend: "Stable", alert: false, icon: ShieldCheck },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                <kpi.icon size={48} />
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{kpi.label}</p>
            <p className={cn("text-3xl font-black tracking-tighter mb-2", kpi.alert ? "text-amber-500" : "text-slate-800")}>{kpi.value}</p>
            <p className="text-xs font-bold text-slate-500 inline-flex items-center gap-1">
              <Activity size={12} /> {kpi.trend}
            </p>
          </div>
        ))}
      </div>

      {/* SLA Bottleneck Dashboard */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
           <AlertTriangle size={16} className="text-amber-500" /> SLA & Bottleneck Monitor
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x divide-slate-100">
           <div className="px-4 first:pl-0">
             <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Submissions Pending &gt; 48 hrs</p>
             <p className="text-3xl font-black text-amber-500">14</p>
           </div>
           <div className="px-4">
             <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Interviews Pending &gt; 7 days</p>
             <p className="text-3xl font-black text-slate-800">5</p>
           </div>
           <div className="px-4">
             <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Offers Pending &gt; 14 days</p>
             <p className="text-3xl font-black text-slate-800">2</p>
           </div>
           <div className="px-4">
             <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Requirements Stale &gt; 30 days</p>
             <p className="text-3xl font-black text-rose-500">8</p>
           </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* SLA Compliance Variance */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
             <BarChart2 size={16} className="text-indigo-600"/> SLA Breach vs Compliance
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={slaEvents}>
                <defs>
                  <linearGradient id="colorCompliance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <RechartsTooltip />
                <Area type="monotone" dataKey="compliance" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorCompliance)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vendor Scoring Heatmap */}
        <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm">
           <div className="flex items-center justify-between mb-6">
               <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                 <Network size={16} className="text-indigo-600"/> Vendor Execution Matrix
               </h2>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Top 5 Partners</span>
           </div>
           
           <div className="space-y-4">
             {vendorPerformance.map((vendor, i) => (
                 <div key={i} className="flex flex-col gap-2 relative z-10">
                     <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                         <span>{vendor.name}</span>
                         <span className={cn(vendor.qualityScore < 70 ? "text-amber-500" : "text-emerald-600")}>
                             {vendor.qualityScore}/100 QS
                         </span>
                     </div>
                     <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                         <div 
                           className={cn("absolute top-0 left-0 h-full rounded-full",
                                vendor.qualityScore < 70 ? "bg-amber-400" : "bg-indigo-600"
                           )}
                           style={{ width: `${vendor.qualityScore}%` }}
                         />
                     </div>
                     <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                         <span>Velocity: {vendor.speed} days</span>
                         <span>Conversion: {vendor.conversion}%</span>
                     </div>
                 </div>
             ))}
           </div>
        </div>
      </div>

      {/* Pipeline & Delivery Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden group">
            <h2 className="text-xs font-black text-white uppercase tracking-widest mb-8 flex items-center gap-2 relative z-10">
                 <GitBranch size={16} className="text-emerald-400"/> Onboarding Funnel Telemetry
            </h2>
            <div className="h-[250px] relative z-10">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={pipelineHealth} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#1e293b" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#cbd5e1', fontWeight: 700 }} />
                    <RechartsTooltip cursor={{fill: '#1e293b'}} contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff'}} />
                    <Bar dataKey="count" fill="#34d399" radius={[0, 4, 4, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
            </div>
            
            {/* Background Deco */}
            <div className="absolute -right-20 -bottom-20 opacity-5 w-[400px] h-[400px] bg-emerald-500 rounded-full blur-[100px] pointer-events-none" />
        </div>

        <div className="bg-amber-50 rounded-[32px] p-8 border border-amber-100 flex flex-col relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-10">
                 <AlertTriangle size={64} className="text-amber-600" />
             </div>
             <h2 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-6 relative z-10 flex items-center gap-2">
                  Delivery Risk Engine
             </h2>
             <div className="flex-1 space-y-4 relative z-10">
                 {[
                     "High probability of SLA breach in next 48h for Req: FIN-992",
                     "Vendor response degradation detected (Vendor D-4)",
                     "Interview-to-offer ratio collapsing in Department: Engineering",
                     "Candidate pool exhausted for Rust Developers in Berlin"
                 ].map((alert, i) => (
                     <div key={i} className="flex gap-3 text-xs text-amber-800 bg-white/60 p-4 rounded-xl border border-amber-200 font-medium">
                         <div className="mt-0.5 shrink-0">
                             <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                         </div>
                         <p>{alert}</p>
                     </div>
                 ))}
             </div>
        </div>
      </div>
      
    </div>
  );
}
