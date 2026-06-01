import React, { useEffect, useState } from "react";
import { Activity, ShieldCheck, Database, FileBox, Crosshair, Users, HardHat, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

export default function OperationalHealthTab({ userRole, orgId, userId }: { userRole: string, orgId: string, userId: string }) {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    
    if (userRole !== 'admin' && userRole !== 'hq_admin' && userRole !== 'super_admin' && userRole !== 'ops_admin') {
      setLoading(false);
      return;
    }

    fetch(`/api/analytics/hq-production-health?orgId=${orgId}&userId=${userId}&role=${userRole}`)
      .then(r => r.json())
      .then(data => {
        setHealthData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Health fetch error:", err);
        setLoading(false);
      });
  }, [userRole, orgId, userId]);

  const isAdmin = ['admin', 'super_admin', 'hq_admin', 'ops_admin'].includes(userRole);

  if (!isAdmin) {
    return (
       <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
         Restricted. HQ Clearance Required.
       </div>
    );
  }

  if (loading || !healthData) {
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest">Loading Production Health...</div>;
  }

  const { integrity, ledger, submissions } = healthData;

  const parityStatus = integrity.parityFailure === 0 ? 'HEALTHY' : 'PARITY FAILURE';
  const parityTrend = integrity.parityFailure === 0 ? 'optimal' : 'critical';

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-500 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(99,102,241,1)]">
            Production Health Center
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Activity size={14} className="text-indigo-500" /> System Integrity & State Parity Monitor
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Requirement Integrity */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
             <ShieldCheck size={16} /> Requirement Integrity
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <HealthMetric label="Healthy Requirements" count={integrity.healthyReqs} total={integrity.healthyReqs + integrity.reqsNoMatches + integrity.reqsStale} />
            <div className="my-4 border-t border-slate-100" />
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Parity Healthy</p>
                  <p className="font-mono text-xl font-medium text-emerald-600">{integrity.parityHealthy}</p>
               </div>
               <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Parity Anomalies</p>
                  <p className={cn("font-mono text-xl font-medium", integrity.parityFailure > 0 ? "text-rose-600" : "text-emerald-600")}>{integrity.parityFailure}</p>
               </div>
            </div>
            <div className={cn("mt-4 text-xs font-bold px-3 py-2 rounded uppercase tracking-widest text-center", parityTrend === 'optimal' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600")}>
               Status: {parityStatus}
            </div>
          </div>
        </section>

        {/* Candidate Ledger Health */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
             <Database size={16} /> Candidate Ledger Health
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <p className="text-lg font-black text-slate-800 mb-4">Total: {ledger.totalCandidates}</p>
             <div className="space-y-3">
                <ProgressRow label="Mapped Correctly" value={ledger.mappedCorrectly} total={ledger.totalCandidates} color="bg-emerald-500" />
                <ProgressRow label="Orphaned" value={ledger.orphaned} total={ledger.totalCandidates} color="bg-amber-400" alertValue={ledger.orphaned > 0} />
                <ProgressRow label="Duplicate (Est)" value={ledger.duplicate} total={ledger.totalCandidates} color="bg-rose-400" alertValue={ledger.duplicate > 0} />
                <ProgressRow label="Missing Vendor" value={ledger.missingVendor} total={ledger.totalCandidates} color="bg-slate-400" alertValue={ledger.missingVendor > 0} />
             </div>
          </div>
        </section>

        {/* Requirement Health Summary */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
             <Crosshair size={16} /> Requirement Health Summary
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-2 gap-y-6">
             <div>
               <p className="text-[10px] uppercase font-bold text-slate-400">Healthy (Active, Matches)</p>
               <p className="text-2xl font-black text-emerald-600">{integrity.healthyReqs}</p>
             </div>
             <div>
               <p className="text-[10px] uppercase font-bold text-slate-400">No AI Matches</p>
               <p className="text-2xl font-black text-amber-500">{integrity.reqsNoMatches}</p>
             </div>
             <div>
               <p className="text-[10px] uppercase font-bold text-slate-400">Stale &gt; 7 Days</p>
               <p className="text-2xl font-black text-rose-500">{integrity.reqsStale}</p>
             </div>
          </div>
        </section>

        {/* Submission Health */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
             <FileBox size={16} /> Submission Pipeline Health
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <div className="grid grid-cols-4 gap-2 mb-6">
                <StatBox label="Submitted" val={submissions.submitted} />
                <StatBox label="Interview" val={submissions.interviewing} />
                <StatBox label="Offers" val={submissions.offers} />
                <StatBox label="Placed" val={submissions.placed} />
             </div>
             <div className="border-t border-slate-100 pt-4 space-y-3">
                 <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Age Anomalies</p>
                 <div className="flex justify-between items-center bg-amber-50 px-4 py-3 rounded-lg border border-amber-100/50">
                    <span className="text-sm font-medium text-amber-800">Waiting &gt; 48 Hours</span>
                    <span className="font-mono font-black text-amber-600">{submissions.waiting48}</span>
                 </div>
                 <div className="flex justify-between items-center bg-rose-50 px-4 py-3 rounded-lg border border-rose-100/50">
                    <span className="text-sm font-medium text-rose-800">Waiting &gt; 7 Days</span>
                    <span className="font-mono font-black text-rose-600">{submissions.waiting7d}</span>
                 </div>
             </div>
          </div>
        </section>

      </div>
    </div>
  );
}

function StatBox({ label, val }: { label: string, val: number }) {
  return (
    <div className="bg-slate-50 p-3 rounded-lg text-center border border-slate-100">
      <p className="text-2xl font-black text-slate-800">{val}</p>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

function HealthMetric({ label, count, total }: { label: string, count: number, total: number }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-1">
         <span className="text-sm font-medium text-slate-700">{label}</span>
         <span className="text-lg font-black text-slate-900">{count} <span className="text-xs text-slate-400 font-normal">/ {total}</span></span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
         <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${total ? (count/total)*100 : 0}%`}} />
      </div>
    </div>
  );
}

function ProgressRow({ label, value, total, color, alertValue = false }: { label: string, value: number, total: number, color: string, alertValue?: boolean }) {
  const isAlert = alertValue && value > 0;
  return (
    <div>
      <div className="flex justify-between text-xs font-medium mb-1">
        <span className={isAlert ? "text-rose-600 font-bold" : "text-slate-600"}>{label}</span>
        <span className={isAlert ? "text-rose-600 font-bold" : "text-slate-800"}>{value}</span>
      </div>
      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
         <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${total ? (value/total)*100 : 0}%`}} />
      </div>
    </div>
  );
}
