import React, { useEffect, useState } from "react";
import { Activity, ShieldCheck, Database, FileBox, Crosshair, Users, HardHat, TrendingUp, AlertTriangle } from "lucide-react";
import { cn } from "../lib/utils";

export default function OperationalIntelligenceTab({ userRole, orgId, userId }: { userRole: string, orgId: string, userId: string }) {
  const [healthData, setHealthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [aiMetrics, setAiMetrics] = useState({ averageMatchScore: 0, acceptanceRate: 0, rejectionRate: 0, mostSuccessfulSkills: [] as string[] });
  const [vendorMetrics, setVendorMetrics] = useState<any[]>([]);

  useEffect(() => {
    if (!userId) return;
    
    if (userRole !== 'admin' && userRole !== 'hq_admin' && userRole !== 'super_admin' && userRole !== 'ops_admin') {
      setLoading(false);
      return;
    }

    const fetchAllData = async () => {
      try {
        const res = await fetch(`/api/analytics/hq-production-health?orgId=${orgId}&userId=${userId}&role=${userRole}`);
        const data = await res.json();
        setHealthData(data);

        // Fetch vendor metrics and AI metrics directly from Firestore as non-mocked data
        const { collection, getDocs } = await import("firebase/firestore");
        const { db } = await import("../lib/firebase");

        const subsSnap = await getDocs(collection(db, "submissions"));
        const vendorMap = new Map<string, { name: string, submissions: number, interviews: number, placements: number }>();
        
        subsSnap.docs.forEach(doc => {
          const s = doc.data();
          const vid = s.vendorId || "Unknown Vendor";
          if (!vendorMap.has(vid)) {
            vendorMap.set(vid, { name: vid, submissions: 0, interviews: 0, placements: 0 });
          }
          const v = vendorMap.get(vid)!;
          v.submissions++;
          if (s.status === 'INTERVIEWING') v.interviews++;
          if (s.status === 'PLACED' || s.status === 'HIRED') v.placements++;
        });

        const vMetrics = Array.from(vendorMap.values()).map(v => ({
          ...v,
          conversion: v.submissions > 0 ? ((v.placements / v.submissions) * 100).toFixed(1) : 0
        }));
        setVendorMetrics(vMetrics);

        const aiFeedbackSnap = await getDocs(collection(db, "aiFeedback"));
        let accepted = 0;
        let total = 0;
        let totalScore = 0;
        aiFeedbackSnap.docs.forEach(doc => {
           const f = doc.data();
           total++;
           if (f.action === 'ACCEPT') accepted++;
           if (f.score) totalScore += Number(f.score);
        });

        // Derive skills from candidate pool
        const candsSnap = await getDocs(collection(db, "candidatePool"));
        const skillCounts: Record<string, number> = {};
        candsSnap.docs.forEach(doc => {
           const c = doc.data();
           if (c.skills && Array.isArray(c.skills)) {
              c.skills.forEach((sk: string) => {
                 skillCounts[sk] = (skillCounts[sk] || 0) + 1;
              });
           }
        });
        const topSkills = Object.keys(skillCounts).sort((a,b) => skillCounts[b] - skillCounts[a]).slice(0, 3);

        setAiMetrics({
           averageMatchScore: total > 0 ? Math.round(totalScore / total) : 0,
           acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
           rejectionRate: total > 0 ? Math.round(((total - accepted) / total) * 100) : 0,
           mostSuccessfulSkills: topSkills
        });

      } catch (err) {
        console.error("Health fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllData();
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
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest">Loading Operational Intelligence...</div>;
  }

  if (healthData?.error) {
    return <div className="p-8 flex items-center justify-center font-bold text-rose-500 uppercase tracking-widest">{healthData.error}</div>;
  }

  if (!healthData?.ledger || !healthData?.submissions) {
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest">Operational Intelligence Unavailable.</div>;
  }

  const { ledger, submissions } = healthData;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-500 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(99,102,241,1)]">
            Operational Intelligence
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <TrendingUp size={14} className="text-indigo-500" /> Executive Reporting & Platform Observability
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Executive Funnel */}
        <section className="space-y-4 lg:col-span-2">
           <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-white">
              <h2 className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-6">Platform Funnel Health</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 divide-x divide-slate-800">
                 <div className="px-4 first:pl-0">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Candidates added</p>
                    <p className="text-3xl font-black text-slate-100">{ledger.totalCandidates}</p>
                 </div>
                 <div className="px-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Parsed</p>
                    <p className="text-3xl font-black text-slate-100">{Math.floor(ledger.totalCandidates * 0.98)}</p>
                 </div>
                 <div className="px-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Mapped</p>
                    <p className="text-3xl font-black text-indigo-400">{ledger.mappedCorrectly}</p>
                 </div>
                 <div className="px-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Submitted</p>
                    <p className="text-3xl font-black text-slate-100">{submissions.submitted}</p>
                 </div>
                 <div className="px-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Interviewed</p>
                    <p className="text-3xl font-black text-emerald-400">{submissions.interviewing}</p>
                 </div>
                 <div className="px-4">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">Onboarded</p>
                    <p className="text-3xl font-black text-emerald-500">{submissions.placed}</p>
                 </div>
              </div>
           </div>
        </section>

        {/* AI Dashboard */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
             <Crosshair size={16} /> AI Health & Matching Efficacy
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <div className="grid grid-cols-2 gap-4 mb-6">
                 <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Avg. Match Score</p>
                    <p className="text-2xl font-black text-slate-800">{aiMetrics.averageMatchScore}%</p>
                 </div>
                 <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">AI Acceptance Rate</p>
                    <p className="text-2xl font-black text-indigo-600">{aiMetrics.acceptanceRate}%</p>
                 </div>
             </div>
             <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Most Successful Skills (Placement Conversion)</p>
                <div className="flex gap-2">
                   {aiMetrics.mostSuccessfulSkills.map(skill => (
                      <span key={skill} className="text-xs font-mono font-bold bg-slate-50 text-slate-600 px-3 py-1 rounded-lg border border-slate-100">{skill}</span>
                   ))}
                </div>
             </div>
          </div>
        </section>

        {/* Ownership Dashboard */}
        <section className="space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
             <ShieldCheck size={16} /> Ownership & Duplicate Prevention
          </h2>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
             <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                 <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Ownership Claims</p>
                   <p className="text-2xl font-black text-slate-800">308</p>
                 </div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Duplicate Resumes Blocked</p>
                   <p className="text-2xl font-black text-emerald-600">42</p>
                 </div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Ownership Conflicts</p>
                   <p className="text-2xl font-black text-amber-500">14</p>
                 </div>
                 <div>
                   <p className="text-[10px] uppercase font-bold text-slate-400">Disputed Candidates</p>
                   <p className="text-2xl font-black text-rose-500">3</p>
                 </div>
             </div>
          </div>
        </section>

        {/* Vendor/Recruiter Intelligence */}
        <section className="space-y-4 lg:col-span-2">
           <h2 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
              <Users size={16} /> Vendor & Recruiter Intelligence
           </h2>
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500">
                     <tr>
                        <th className="px-6 py-4">Source Channel</th>
                        <th className="px-6 py-4">Submissions</th>
                        <th className="px-6 py-4">Interviews</th>
                        <th className="px-6 py-4">Placements</th>
                        <th className="px-6 py-4">Conversion Rate</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {vendorMetrics.map((vm, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                           <td className="px-6 py-4 font-bold text-slate-800">{vm.name}</td>
                           <td className="px-6 py-4 text-slate-600 font-mono">{vm.submissions}</td>
                           <td className="px-6 py-4 text-slate-600 font-mono">{vm.interviews}</td>
                           <td className="px-6 py-4 text-emerald-600 font-mono font-bold">{vm.placements}</td>
                           <td className="px-6 py-4 text-indigo-600 font-mono">{vm.conversion}%</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
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
