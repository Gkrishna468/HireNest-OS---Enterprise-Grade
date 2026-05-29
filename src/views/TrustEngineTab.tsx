import React from "react";
import { ShieldCheck, Target, AlertTriangle, Scale, ArrowUpRight, TrendingUp } from "lucide-react";
import { cn } from "../lib/utils";

export default function TrustEngineTab({ userRole, orgId }: { userRole: string, orgId: string }) {
  const isAdmin = ['admin', 'super_admin', 'hq_admin', 'ops_admin'].includes(userRole);

  if (!isAdmin) {
    return (
       <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
         Restricted. HQ Clearance Required.
       </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <ShieldCheck className="text-indigo-500" size={32} /> Trust & SLA Engine
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            Vendor Scorecards • SLA Governance • Escalation Rules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Vendor Scorecards */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-8">
           <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-6">
              <TrendingUp size={16} className="text-emerald-500" /> Vendor Ranking & Trust Graph
           </h2>
           <div className="space-y-4">
              <VendorRankCard rank={1} name="TechStaff Inc (V-901)" score={94} metrics={{ response: "2.4h", quality: "91%", retention: "98%" }} 
                  signals={[ { val: 12, label: "Fast Responses" }, { val: 18, label: "Submission Quality" }, { val: 9, label: "Interview Conv" } ]}
              />
              <VendorRankCard rank={2} name="Global IT Talent (V-212)" score={88} metrics={{ response: "4.1h", quality: "85%", retention: "92%" }} 
                  signals={[ { val: 8, label: "Consistent Submissions" }, { val: 14, label: "Placement Retention" }, { val: -2, label: "Candidate Drops" } ]}
              />
              <VendorRankCard rank={3} name="CloudScale Recruiters (V-405)" score={76} metrics={{ response: "12h", quality: "71%", retention: "80%" }} isWarning 
                  signals={[ { val: 5, label: "Initial Matches" }, { val: -5, label: "SLA Violations" }, { val: -8, label: "Warranty Triggered" } ]}
              />
           </div>
        </div>

        {/* SLA Governance */}
        <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-8 flex flex-col">
           <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2 mb-6">
              <Target size={16} className="text-sky-500" /> Active SLA Tracking
           </h2>
           
           <div className="flex-1 space-y-4">
              <SLALine item="Job Created → Vendor Acknowledgment" limit="24h" current="Avg 8h" status="HEALTHY" />
              <SLALine item="Requirement → First Candidate Submission" limit="72h" current="Avg 48h" status="HEALTHY" />
              <SLALine item="Client Interview → Feedback Provided" limit="48h" current="Avg 56h" status="BREACHED" />
           </div>

           <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3">
                 <AlertTriangle size={20} className="text-rose-500 shrink-0" />
                 <div>
                    <h4 className="text-xs font-black text-rose-800 uppercase tracking-widest">Escalation Triggered</h4>
                    <p className="text-[11px] text-rose-600 mt-1 font-bold">3 requirements currently exceeding candidate submission SLA (72h). Vendors automatically penalized in Trust Score.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* Contract Layer Teaser */}
      <div className="mt-8 bg-slate-50 rounded-2xl border border-slate-200 p-8 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
               <Scale size={20} />
            </div>
            <div>
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Contract & Agreement Layer</h3>
               <p className="text-[12px] font-bold text-slate-500 max-w-md mt-1">MSA, NDA, and Revenue Terms infrastructure currently pending schema finalization.</p>
            </div>
         </div>
         <button className="px-6 py-2 bg-slate-200 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-lg cursor-not-allowed">
            View MSAs
         </button>
      </div>

    </div>
  );
}

function VendorRankCard({ rank, name, score, metrics, isWarning, signals }: any) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className={cn("p-4 rounded-xl border flex flex-col gap-4 transition-all hover:shadow-md cursor-pointer", isWarning ? "bg-amber-50 border-amber-100" : "bg-slate-50 border-slate-100")} onClick={() => setExpanded(!expanded)}>
       <div className="flex items-center gap-4">
           <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-sm shrink-0", isWarning ? "bg-amber-100 text-amber-700" : "bg-white text-slate-700")}>
              #{rank}
           </div>
           <div className="flex-1">
              <h4 className="text-sm font-black text-slate-800">{name}</h4>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Resp: {metrics.response}</span>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Qual: {metrics.quality}</span>
                 <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Ret: {metrics.retention}</span>
              </div>
           </div>
           <div className="text-right">
              <div className={cn("text-xl font-black flex items-center justify-end gap-1", isWarning ? "text-amber-600" : "text-emerald-600")}>
                {score} 
                <span className="text-slate-400 opacity-50 hover:opacity-100 transition-opacity">ⓘ</span>
              </div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">Trust Score</p>
           </div>
       </div>
       {expanded && (
          <div className="pt-3 border-t border-slate-200/50 flex flex-col gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Metric Lineage</span>
            <div className="text-xs bg-white p-3 rounded-lg border border-slate-200">
               <div className="flex justify-between border-b border-slate-100 pb-1 mb-1">
                  <span className="text-slate-500 font-medium font-mono text-[10px]">Submission Quality (30%)</span>
                  <span className="text-slate-800 font-bold font-mono text-[10px]">{score * 0.3} pts</span>
               </div>
               <div className="flex justify-between border-b border-slate-100 pb-1 mb-1">
                  <span className="text-slate-500 font-medium font-mono text-[10px]">Interview Conversion (25%)</span>
                  <span className="text-slate-800 font-bold font-mono text-[10px]">{score * 0.25} pts</span>
               </div>
               <div className="flex justify-between border-b border-slate-100 pb-1 mb-1">
                  <span className="text-slate-500 font-medium font-mono text-[10px]">Response Time (20%)</span>
                  <span className="text-slate-800 font-bold font-mono text-[10px]">{score * 0.2} pts</span>
               </div>
               <div className="flex justify-between">
                  <span className="text-slate-500 font-medium font-mono text-[10px]">Retention Rate (25%)</span>
                  <span className="text-slate-800 font-bold font-mono text-[10px]">{score * 0.25} pts</span>
               </div>
            </div>
          </div>
       )}
       {signals && !expanded && (
           <div className="pt-3 border-t border-slate-200/50 flex gap-2 flex-wrap">
              <span className="text-[8px] font-bold uppercase tracking-widest text-slate-400 w-full mb-1">Recent Behavior Adjustments</span>
              {signals.map((sig: any, idx: number) => (
                 <span key={idx} className={cn("text-[8px] font-bold px-2 py-1 flex items-center gap-1 uppercase tracking-widest", sig.val > 0 ? "text-emerald-600" : "text-rose-600")}>
                    {sig.val > 0 ? `+${sig.val}` : sig.val} {sig.label}
                 </span>
              ))}
           </div>
       )}
    </div>
  );
}

function SLALine({ item, limit, current, status }: any) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 pb-3">
       <div>
          <p className="text-[11px] font-bold text-slate-700">{item}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Limit: {limit}</p>
       </div>
       <div className="text-right flex items-center gap-3">
          <span className="text-xs font-black text-slate-800">{current}</span>
          <span className={cn(
             "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-sm",
             status === 'HEALTHY' ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
          )}>
             {status}
          </span>
       </div>
    </div>
  );
}
