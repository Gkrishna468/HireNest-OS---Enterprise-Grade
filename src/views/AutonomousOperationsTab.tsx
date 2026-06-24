import React, { useState, useEffect } from "react";
import { Zap, PlayCircle, Clock, AlertTriangle, CheckCircle2, ShieldAlert, Cpu, ArrowRight, Settings2 } from "lucide-react";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AutonomousOperationsTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(
    userRole,
  );

  const [activeTab, setActiveTab] = useState<'rules' | 'approvals' | 'logs'>('approvals');

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HQ
      </div>
    );
  }

  // Simulated operations telemetry for the audit
  const automationRules = [
    { id: 'R1', name: 'Invoice Automation', trigger: 'PLACEMENT_CLOSED', action: 'Generate Draft Invoice & Notify Finance', status: 'ACTIVE', type: 'FINANCE' },
    { id: 'R2', name: 'SLA Escalation', trigger: 'Requirement Open > 48 Hours + 0 Submissions', action: 'Create Escalation & Notify Recruiter Manager', status: 'ACTIVE', type: 'OPERATIONS' },
    { id: 'R3', name: 'Vendor Priority Adjust', trigger: 'Trust Score Drops < 60', action: 'Flag Vendor & Reduce Priority Ranking', status: 'ACTIVE', type: 'GOVERNANCE' }
  ];

  const pendingApprovals = [
    { id: 'PA-101', rule: 'Invoice Automation', desc: 'Approve Draft Invoice INV-8821 for Placement PL-9021', date: '2 mins ago', severity: 'high' },
    { id: 'PA-102', rule: 'Vendor Priority Adjust', desc: 'Approve Priority Downgrade for Vendor "TechSource Global" (Score 58)', date: '1 hour ago', severity: 'medium' }
  ];

  const executionLogs = [
    { id: 'L-505', rule: 'SLA Escalation', event: 'Escalation created for REQ-882 (Open > 48h)', status: 'SUCCESS', date: 'Just now' },
    { id: 'L-504', rule: 'Invoice Automation', event: 'Draft Invoice generated for PL-112 (Requires Approval)', status: 'PENDING_APPROVAL', date: '5 mins ago' },
    { id: 'L-503', rule: 'Vendor Priority Adjust', event: 'Trust score evaluated for "Nova Staffing" (Score 92) - No action', status: 'SKIPPED', date: '10 mins ago' },
    { id: 'L-502', rule: 'SLA Escalation', event: 'Escalation created for REQ-881 (Open > 48h)', status: 'SUCCESS', date: '25 mins ago' }
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-8 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
           <Cpu size={200} className="text-amber-400" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto w-full">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="text-amber-400" size={28} />
            <h1 className="text-3xl font-black text-white tracking-tighter">
              Autonomous Operations
            </h1>
          </div>
          <p className="text-slate-400 font-medium text-sm max-w-2xl">
            Govern, audit, and approve automated workflows. Secure actions such as invoice generation and vendor penalization require human-in-the-loop validation.
          </p>
        </div>
      </div>

      <div className="p-8 max-w-[1200px] mx-auto w-full space-y-8">
        
        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Active Rules</div>
                 <div className="text-3xl font-black text-slate-800">{automationRules.length}</div>
              </div>
              <Settings2 className="w-8 h-8 text-indigo-100" />
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm flex items-center justify-between bg-amber-50/30">
              <div>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1">Pending Approvals</div>
                 <div className="text-3xl font-black text-amber-600">{pendingApprovals.length}</div>
              </div>
              <ShieldAlert className="w-8 h-8 text-amber-200" />
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Executions (24h)</div>
                 <div className="text-3xl font-black text-slate-800">1,204</div>
              </div>
              <PlayCircle className="w-8 h-8 text-emerald-100" />
           </div>

           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                 <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Event DLQ</div>
                 <div className="text-3xl font-black text-emerald-500">0</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-100" />
           </div>
        </div>

        {/* Workspace */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
           <div className="flex border-b border-slate-100 bg-slate-50/50">
             <button 
               onClick={() => setActiveTab('approvals')}
               className={cn("px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors", activeTab === 'approvals' ? "border-amber-500 text-amber-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700")}
             >
               Pending Approvals ({pendingApprovals.length})
             </button>
             <button 
               onClick={() => setActiveTab('rules')}
               className={cn("px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors", activeTab === 'rules' ? "border-indigo-500 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700")}
             >
               Automation Engine
             </button>
             <button 
               onClick={() => setActiveTab('logs')}
               className={cn("px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors", activeTab === 'logs' ? "border-emerald-500 text-emerald-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700")}
             >
               Execution Audit
             </button>
           </div>

           <div className="p-0 flex-1">
             {activeTab === 'approvals' && (
               <div className="divide-y divide-slate-100">
                 {pendingApprovals.map(pa => (
                   <div key={pa.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div className="flex items-start gap-4">
                       <div className="mt-1">
                         <AlertTriangle className={cn("w-5 h-5", pa.severity === 'high' ? "text-rose-500" : "text-amber-500")} />
                       </div>
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{pa.rule}</span>
                           <span className="text-xs text-slate-400 font-medium flex items-center"><Clock className="w-3 h-3 mr-1" /> {pa.date}</span>
                         </div>
                         <h4 className="text-sm font-bold text-slate-800">{pa.desc}</h4>
                       </div>
                     </div>
                     <div className="flex gap-2">
                       <button className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg">Reject</button>
                       <button className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Approve & Execute</button>
                     </div>
                   </div>
                 ))}
               </div>
             )}

             {activeTab === 'rules' && (
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 border-b border-slate-100">
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule Name</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trigger</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {automationRules.map(rule => (
                     <tr key={rule.id} className="hover:bg-slate-50">
                       <td className="py-4 px-6">
                         <div className="text-sm font-bold text-slate-800">{rule.name}</div>
                         <div className="text-[10px] font-medium text-slate-400 mt-1">{rule.type}</div>
                       </td>
                       <td className="py-4 px-6">
                         <div className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded inline-block">
                           {rule.trigger}
                         </div>
                       </td>
                       <td className="py-4 px-6">
                         <div className="text-xs font-medium text-slate-700 flex items-center">
                           <ArrowRight className="w-3 h-3 mr-1 text-indigo-400" />
                           {rule.action}
                         </div>
                       </td>
                       <td className="py-4 px-6">
                         <span className="text-[10px] px-2 py-1 rounded-sm font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                           {rule.status}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}

             {activeTab === 'logs' && (
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50 border-b border-slate-100">
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Details</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {executionLogs.map(log => (
                     <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                       <td className="py-3 px-6 text-slate-500 whitespace-nowrap">{log.date}</td>
                       <td className="py-3 px-6 font-bold text-slate-700">{log.rule}</td>
                       <td className="py-3 px-6 text-slate-600">{log.event}</td>
                       <td className="py-3 px-6">
                         <span className={cn(
                            "px-2 py-0.5 rounded font-bold uppercase tracking-wider",
                            log.status === 'SUCCESS' ? "bg-emerald-100 text-emerald-700" :
                            log.status === 'PENDING_APPROVAL' ? "bg-amber-100 text-amber-700" :
                            "bg-slate-100 text-slate-600"
                         )}>
                           {log.status}
                         </span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
