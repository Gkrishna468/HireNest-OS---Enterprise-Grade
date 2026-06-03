import React, { useState, useEffect } from "react";
import { Activity, Clock, Cpu, CheckCircle2, ShieldCheck, Zap, Database, Globe } from "lucide-react";
import { cn } from "../lib/utils";

export default function BenchmarkDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching benchmark metrics
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest animate-pulse">Loading Benchmarks...</div>;
  }

  // Mock data for MVP
  const queryTimes = [
    { op: "Candidate Search Index", ms: 42, threshold: 100 },
    { op: "AI Matching Matrix", ms: 890, threshold: 1000 },
    { op: "Pipeline Status Sync", ms: 12, threshold: 50 },
    { op: "Ownership Verification", ms: 18, threshold: 50 },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-rose-500 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(244,63,94,1)]">
            Benchmark Dashboards
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Activity size={14} className="text-rose-500" /> Platform Scale & Throughput Validator
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* System Health */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
             <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Globe size={20} />
             </div>
             <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">System Health</h3>
                <p className="text-[10px] text-slate-400">Uptime & Stability</p>
             </div>
          </div>
          <div className="space-y-4">
             <div>
                <p className="text-3xl font-black text-slate-900">99.99<span className="text-sm text-slate-500 ml-1">%</span></p>
                <p className="text-xs font-bold text-emerald-500 mt-1 uppercase tracking-widest">Global Uptime</p>
             </div>
             <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase">Errors / Min</p>
                   <p className="text-lg font-black text-slate-700">0.02</p>
                </div>
                <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase">Active Nodes</p>
                   <p className="text-lg font-black text-slate-700">12</p>
                </div>
             </div>
          </div>
        </div>

        {/* Query Times */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 col-span-1 lg:col-span-2">
          <div className="flexItems-center gap-3 mb-6 border-b border-slate-100 pb-4 flex">
             <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Zap size={20} />
             </div>
             <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Average Query Times (p95)</h3>
                <p className="text-[10px] text-slate-400">Latency Validator</p>
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             {queryTimes.map((qt, i) => (
               <div key={i} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-xl">
                 <span className="text-xs font-bold text-slate-600">{qt.op}</span>
                 <div className="flex items-center gap-2">
                    <span className={cn("font-mono text-sm font-black", qt.ms > qt.threshold ? "text-rose-500" : "text-emerald-600")}>{qt.ms}ms</span>
                    {qt.ms <= qt.threshold && <CheckCircle2 size={14} className="text-emerald-500" />}
                 </div>
               </div>
             ))}
          </div>
        </div>

        {/* Pipeline Success Rates */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
             <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                <CheckCircle2 size={20} />
             </div>
             <div>
                <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Pipeline Success</h3>
                <p className="text-[10px] text-slate-400">Conversion Validator</p>
             </div>
          </div>
          <div className="space-y-4">
             <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500">Resume Parsing</span>
                <span className="text-sm font-black text-emerald-600 font-mono">98.4%</span>
             </div>
             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-[98.4%]"></div>
             </div>

             <div className="flex justify-between items-center mt-4">
                <span className="text-xs font-bold text-slate-500">Submission to Interview</span>
                <span className="text-sm font-black text-amber-600 font-mono">24.2%</span>
             </div>
             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full w-[24.2%]"></div>
             </div>

             <div className="flex justify-between items-center mt-4">
                <span className="text-xs font-bold text-slate-500">Interview to Offer</span>
                <span className="text-sm font-black text-indigo-600 font-mono">14.8%</span>
             </div>
             <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full w-[14.8%]"></div>
             </div>
          </div>
        </div>

        {/* AI & Ownership Integrity */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             <div>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                   <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                      <Cpu size={20} />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">AI Efficacy</h3>
                      <p className="text-[10px] text-slate-400">Model Output Accuracy</p>
                   </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400">Accuracy (Human Val)</p>
                      <p className="text-2xl font-black text-slate-800 mt-1">94%</p>
                   </div>
                   <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[10px] font-black uppercase text-slate-400">Hallucination Rate</p>
                      <p className="text-2xl font-black text-emerald-500 mt-1">&lt;0.1%</p>
                   </div>
                </div>
             </div>
             
             <div>
                <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                   <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                      <ShieldCheck size={20} />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs">Ownership Integrity</h3>
                      <p className="text-[10px] text-slate-400">Conflict Prevention</p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                   <div className="flex-1">
                      <p className="text-3xl font-black text-slate-800">142</p>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Conflicts Prevented</p>
                   </div>
                   <div className="flex-1">
                      <p className="text-3xl font-black text-rose-500">0</p>
                      <p className="text-xs font-bold text-rose-500/70 uppercase tracking-widest">Active Disputes</p>
                   </div>
                </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
