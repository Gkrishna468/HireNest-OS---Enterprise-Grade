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
  CheckCircle2
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
    cloudCost: "$0",
    
    // Pipeline
    newJobs: 0,
    resumesParsed: 0,
    matchesGenerated: 0,
    vendorResponses: 0,
    interviews: 0,
    offers: 0,
    joinings: 0,
    
    // System Signals
    incidents: 0,
    securityAlerts: 0,
    recommendations: "3 pending actions"
  });

  useEffect(() => {
    const fetchTowerData = async () => {
       try {
         // Mocking some of the financial and operational data that would be driven by the event bus
         // In a fully integrated system, these would read directly from the `agent_executions` and `invoices` collections.
         
         // 1. Open Requirements / New Jobs
         const reqSnap = await getDocs(query(collection(db, "requirements"), where("status", "in", ["OPEN", "SOURCING"])));
         let openRequirements = reqSnap.size;

         // 2. Marketplace (Candidates, Submissions)
         const candsSnap = await getDocs(collection(db, "candidatePool"));
         let candidatesAdded = candsSnap.size;

         const subsSnap = await getDocs(collection(db, "submissions"));
         let candidatesPlaced = 0;
         subsSnap.docs.forEach(doc => {
            const s = doc.data();
            if (s.status === 'HIRED' || s.status === 'PLACED') candidatesPlaced++;
         });

         setMetrics({
            revenue: "$14,500", // Example data
            aiCost: "$42.50",
            cloudCost: "$18.20",
            newJobs: openRequirements || 12,
            resumesParsed: candidatesAdded || 142,
            matchesGenerated: 340,
            vendorResponses: 28,
            interviews: 4,
            offers: 2,
            joinings: candidatesPlaced || 0,
            incidents: 2,
            securityAlerts: 0,
            recommendations: "2 pending actions"
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
        <div className="bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-800 text-white lg:col-span-2">
           <h3 className="font-bold text-slate-100 uppercase tracking-widest text-xs mb-6 border-b border-slate-800 pb-2 flex justify-between">
              Financial Health
              <DollarSign size={16} className="text-emerald-400" />
           </h3>
           <div className="grid grid-cols-3 gap-4">
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
              <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Cloud Compute</span>
                 <span className="text-2xl font-black text-slate-200">{metrics.cloudCost}</span>
                 <span className="text-xs text-slate-500 mt-2 flex items-center gap-1">Vercel & GCP</span>
              </div>
           </div>
        </div>

        {/* Security & System */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-2">
           <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex justify-between">
              System Operations
              <ShieldCheck size={16} className="text-indigo-600" />
           </h3>
           <div className="grid grid-cols-3 gap-4">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><AlertTriangle size={12} className="text-rose-500"/> Incidents</p>
                 <p className="text-xl font-black text-rose-700 mt-1">{metrics.incidents}</p>
              </div>
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><ShieldCheck size={12} className="text-emerald-500"/> Security</p>
                 <p className="text-xl font-black text-emerald-800 mt-1">{metrics.securityAlerts} <span className="text-xs font-normal text-emerald-600">Alerts</span></p>
              </div>
              <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                 <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1"><Activity size={12} className="text-indigo-500"/> AI OS</p>
                 <p className="text-sm font-black text-indigo-800 mt-2 leading-tight">{metrics.recommendations}</p>
              </div>
           </div>
        </div>

        {/* Daily Pipeline (Full Width) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 lg:col-span-4">
           <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex justify-between">
              Daily Operating Pipeline
              <Activity size={16} className="text-slate-600" />
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl items-center text-center">
                 <Briefcase size={20} className="text-slate-400 mb-2" />
                 <span className="text-2xl font-black text-slate-800">{metrics.newJobs}</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">New Jobs</span>
              </div>
              <div className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl items-center text-center">
                 <FileText size={20} className="text-slate-400 mb-2" />
                 <span className="text-2xl font-black text-slate-800">{metrics.resumesParsed}</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Resumes Parsed</span>
              </div>
              <div className="flex flex-col p-4 bg-indigo-50 border border-indigo-100 rounded-xl items-center text-center">
                 <Cpu size={20} className="text-indigo-400 mb-2" />
                 <span className="text-2xl font-black text-indigo-700">{metrics.matchesGenerated}</span>
                 <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-1">Matches</span>
              </div>
              <div className="flex flex-col p-4 bg-slate-50 border border-slate-100 rounded-xl items-center text-center">
                 <HeartHandshake size={20} className="text-slate-400 mb-2" />
                 <span className="text-2xl font-black text-slate-800">{metrics.vendorResponses}</span>
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Vendor Replies</span>
              </div>
              <div className="flex flex-col p-4 bg-amber-50 border border-amber-100 rounded-xl items-center text-center">
                 <Users size={20} className="text-amber-500 mb-2" />
                 <span className="text-2xl font-black text-amber-700">{metrics.interviews}</span>
                 <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mt-1">Interviews</span>
              </div>
              <div className="flex flex-col p-4 bg-emerald-50 border border-emerald-100 rounded-xl items-center text-center">
                 <CheckCircle2 size={20} className="text-emerald-500 mb-2" />
                 <span className="text-2xl font-black text-emerald-700">{metrics.offers}</span>
                 <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">Offers</span>
              </div>
              <div className="flex flex-col p-4 bg-emerald-100 border border-emerald-200 rounded-xl items-center text-center">
                 <Target size={20} className="text-emerald-600 mb-2" />
                 <span className="text-2xl font-black text-emerald-800">{metrics.joinings}</span>
                 <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-1">Joinings</span>
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
