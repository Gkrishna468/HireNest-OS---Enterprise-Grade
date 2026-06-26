import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Users, 
  Briefcase, 
  UserSquare2, 
  TrendingUp, 
  Target, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Globe2, 
  HeartHandshake,
  DollarSign,
  Cloud,
  AlertTriangle,
  FileText,
  Mail,
  CheckCircle2,
  Bot
} from "lucide-react";
import { collection, getDocs, query, where, documentId } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function FounderControlTower() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    // Financial Signals
    revenue: "$0",
    aiCost: "$0",
    
    // Agent Runtime Infrastructure
    runningAgents: 0,
    queuedJobs: 0,
    failedJobs: 0,
    retryJobs: 0,
    avgRuntime: "0ms",

    // Pipeline
    requirementsReceived: 0,
    candidatesProcessed: 0,
    submissionsSent: 0,
    interviewsScheduled: 0,
    offersReleased: 0,
    emailsProcessed: 0,
  });

  useEffect(() => {
    const fetchTowerData = async () => {
       try {
         // Pipeline Metrics
         const reqSnap = await getDocs(collection(db, "requirements"));
         const requirementsReceived = reqSnap.size;

         const candsSnap = await getDocs(collection(db, "candidatePool"));
         const candidatesProcessed = candsSnap.size;

         const subsSnap = await getDocs(collection(db, "submissions"));
         let interviewsScheduled = 0;
         let offersReleased = 0;
         const submissionsSent = subsSnap.size;
         subsSnap.docs.forEach(doc => {
            const s = doc.data();
            if (s.status === 'INTERVIEW_SCHEDULED' || s.status === 'INTERVIEW') interviewsScheduled++;
            if (s.status === 'OFFER_EXTENDED' || s.status === 'OFFER' || s.status === 'OFFERED') offersReleased++;
         });
         
         const invoicesSnap = await getDocs(collection(db, "invoices"));
         let revenueAmount = 0;
         invoicesSnap.docs.forEach(doc => {
             const data = doc.data();
             if (data.status === 'PAID') {
                 revenueAmount += (data.amount || 0);
             }
         });

         // Agent Runtime Metrics
         const agentsSnap = await getDocs(collection(db, "ai_agents"));
         let runningAgents = 0;
         agentsSnap.docs.forEach(doc => {
             if (doc.data().status === 'Running' || doc.data().status === 'Busy') runningAgents++;
         });

         const queueSnap = await getDocs(collection(db, "agent_queue"));
         let queuedJobs = 0;
         let failedJobs = 0;
         let retryJobs = 0;
         queueSnap.docs.forEach(doc => {
             const data = doc.data();
             if (data.status === 'queued') queuedJobs++;
             if (data.status === 'failed') failedJobs++;
             if (data.status === 'retrying' || data.attempts > 1) retryJobs++;
         });

         const execsSnap = await getDocs(collection(db, "agent_executions"));
         let aiCostAmount = 0;
         let totalRuntime = 0;
         let runCount = 0;
         execsSnap.docs.forEach(doc => {
             const data = doc.data();
             if (data.cost) aiCostAmount += data.cost;
             if (data.duration) {
                 totalRuntime += data.duration;
                 runCount++;
             }
         });
         const avgRuntime = runCount > 0 ? Math.round(totalRuntime / runCount) + "ms" : "0ms";

         // Emails processed (from MailOS)
         const mailosSnap = await getDocs(collection(db, "mailos_executions"));
         let emailsProcessed = 0;
         mailosSnap.docs.forEach(doc => {
             emailsProcessed += (doc.data().processedCount || 0);
         });

         setMetrics({
            revenue: `$${revenueAmount.toLocaleString()}`,
            aiCost: `$${aiCostAmount.toFixed(2)}`,
            runningAgents,
            queuedJobs,
            failedJobs,
            retryJobs,
            avgRuntime,
            requirementsReceived,
            candidatesProcessed,
            submissionsSent,
            interviewsScheduled,
            offersReleased,
            emailsProcessed
         });

       } catch (err) {
         console.error(err);
       } finally {
         setLoading(false);
       }
    };
    fetchTowerData();
  }, []);

  if (loading) {
    return <div className="p-8 flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing Founder Mission Control...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-900 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(30,58,138,1)]">
            Founder Daily Brief
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Globe2 size={14} className="text-indigo-900" /> Auto-Generated Executive Summary
          </p>
        </div>
        <button className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-800 transition-colors flex items-center gap-2">
           <FileText size={16} /> Download EOD Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Financial Health */}
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 text-white lg:col-span-1">
           <h3 className="font-bold text-slate-100 uppercase tracking-widest text-xs mb-6 border-b border-slate-800 pb-2 flex justify-between">
              Financial Health
              <DollarSign size={16} className="text-emerald-400" />
           </h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">New Revenue</span>
                 <span className="text-2xl font-black text-emerald-400">{metrics.revenue}</span>
                 <span className="text-xs text-slate-500 mt-2 flex items-center gap-1"><TrendingUp size={12} className="text-emerald-500"/> +12% today</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">AI Agent Cost</span>
                 <span className="text-2xl font-black text-slate-200">{metrics.aiCost}</span>
                 <span className="text-xs text-slate-500 mt-2 flex items-center gap-1">14,200 tokens</span>
              </div>
           </div>
        </div>

        {/* Agent Runtime Infrastructure */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-3">
           <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex justify-between">
              Agent Runtime Infrastructure
              <Bot size={16} className="text-indigo-600" />
           </h3>
           <div className="grid grid-cols-5 gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col items-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Running</p>
                 <p className="text-xl font-black text-emerald-700 mt-1">{metrics.runningAgents}</p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex flex-col items-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Queued</p>
                 <p className="text-xl font-black text-indigo-700 mt-1">{metrics.queuedJobs}</p>
              </div>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 flex flex-col items-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Failed</p>
                 <p className="text-xl font-black text-rose-700 mt-1">{metrics.failedJobs}</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 flex flex-col items-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Retries</p>
                 <p className="text-xl font-black text-amber-700 mt-1">{metrics.retryJobs}</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">Avg Latency</p>
                 <p className="text-xl font-black text-slate-700 mt-1">{metrics.avgRuntime}</p>
              </div>
           </div>
        </div>

        {/* Daily Pipeline (Full Width) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-4">
           <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex justify-between">
              Daily Operating Pipeline
              <Activity size={16} className="text-slate-600" />
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl items-center text-center">
                 <Briefcase size={20} className="text-slate-400 mb-2" />
                 <span className="text-2xl font-black text-slate-800">{metrics.requirementsReceived}</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Reqs Received</span>
              </div>
              <div className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl items-center text-center">
                 <UserSquare2 size={20} className="text-slate-400 mb-2" />
                 <span className="text-2xl font-black text-slate-800">{metrics.candidatesProcessed}</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Candidates Processed</span>
              </div>
              <div className="flex flex-col p-4 bg-indigo-50 border border-indigo-100 rounded-xl items-center text-center">
                 <Cpu size={20} className="text-indigo-400 mb-2" />
                 <span className="text-2xl font-black text-indigo-700">{metrics.submissionsSent}</span>
                 <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-1">Submissions Sent</span>
              </div>
              <div className="flex flex-col p-4 bg-amber-50 border border-amber-100 rounded-xl items-center text-center">
                 <Users size={20} className="text-amber-500 mb-2" />
                 <span className="text-2xl font-black text-amber-700">{metrics.interviewsScheduled}</span>
                 <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">Interviews Scheduled</span>
              </div>
              <div className="flex flex-col p-4 bg-emerald-50 border border-emerald-100 rounded-xl items-center text-center">
                 <CheckCircle2 size={20} className="text-emerald-500 mb-2" />
                 <span className="text-2xl font-black text-emerald-700">{metrics.offersReleased}</span>
                 <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Offers Released</span>
              </div>
              <div className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl items-center text-center">
                 <Mail size={20} className="text-slate-400 mb-2" />
                 <span className="text-2xl font-black text-slate-800">{metrics.emailsProcessed}</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Emails Processed</span>
              </div>
           </div>
        </div>
      </div>
      
      {/* Executive Recommendations */}
      <div className="bg-slate-50 p-6 rounded-2xl shadow-sm border border-slate-200">
         <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-4 flex justify-between">
            Executive Actions & Recommendations
         </h3>
         <div className="space-y-3">
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><TrendingUp size={16} /></div>
                     <div>
                         <p className="text-sm font-bold text-slate-800">Margin Optimization Opportunity</p>
                         <p className="text-xs text-slate-500">2 Vendor submissions for "Senior Java Developer" have lower bill rates than our target margin. Consider prioritizing these.</p>
                     </div>
                 </div>
                 <button className="text-xs font-bold bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors">Review Candidates</button>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                     <div className="bg-rose-100 p-2 rounded-lg text-rose-600"><AlertTriangle size={16} /></div>
                     <div>
                         <p className="text-sm font-bold text-slate-800">Client Feedback Pending</p>
                         <p className="text-xs text-slate-500">"Acme Corp" has not responded to 4 candidate submissions in over 48 hours. Follow-up agent is awaiting approval.</p>
                     </div>
                 </div>
                 <button className="text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-lg transition-colors">Approve Follow-up</button>
             </div>
         </div>
      </div>
    </div>
  );
}
