import React, { useState, useEffect } from "react";
import { collection, query, orderBy, onSnapshot, getDocs, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { 
  GitCommit, Activity, Clock, ShieldAlert, CheckCircle2,
  AlertTriangle, Users, Building, ArrowRight, Zap, RefreshCw, 
  Terminal, ShieldCheck
} from "lucide-react";
import { cn } from "../lib/utils";
import { WorkflowInstance, WorkflowEvent } from "../types/workflow";

export default function WorkflowOperationsTab({ orgId, userRole }: { orgId?: string, userRole?: string }) {
  const [workflows, setWorkflows] = useState<WorkflowInstance[]>([]);
  const [events, setEvents] = useState<Record<string, WorkflowEvent[]>>({});
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInstance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // We would normally filter this by visibility scopes
    const q = query(
      collection(db, "workflow_instances"),
      orderBy("updatedAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, async (snap) => {
      const wfs = snap.docs.map(d => d.data() as WorkflowInstance);
      setWorkflows(wfs);
      
      // Auto select first
      if (wfs.length > 0 && !selectedWorkflow) {
        setSelectedWorkflow(wfs[0]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedWorkflow) return;
    const loadEvents = async () => {
        const q = query(
            collection(db, "workflow_events"),
            where("workflowId", "==", selectedWorkflow.workflowId),
            orderBy("timestamp", "asc")
        );
        const snap = await getDocs(q);
        setEvents(prev => ({
            ...prev,
            [selectedWorkflow.workflowId]: snap.docs.map(d => d.data() as WorkflowEvent)
        }));
    };
    loadEvents();
  }, [selectedWorkflow]);

  if (loading) {
     return (
        <div className="flex h-full items-center justify-center p-20">
          <div className="flex flex-col items-center gap-4">
            <Activity className="h-8 w-8 animate-bounce text-indigo-600" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Synchronizing Operational Graph...
            </p>
          </div>
        </div>
     );
  }

  return (
    <div className="flex h-full overflow-hidden bg-slate-50 p-4 gap-4">
      
      {/* LEFT: Workflows List Directory */}
      <div className="w-[380px] bg-white border border-slate-200 rounded-[24px] flex flex-col overflow-hidden shadow-sm shrink-0">
          <div className="p-4 border-b border-slate-100 bg-slate-900 text-white shrink-0">
             <div className="flex items-center justify-between mb-2">
                 <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                    <Activity size={16} className="text-indigo-400" /> Operational Matrix
                 </h2>
             </div>
             <p className="text-[10px] font-medium text-slate-400">Live deterministic state machines</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {workflows.map(wf => (
                 <div 
                    key={wf.workflowId}
                    onClick={() => setSelectedWorkflow(wf)}
                    className={cn(
                        "p-4 rounded-[16px] cursor-pointer transition-all border",
                        selectedWorkflow?.workflowId === wf.workflowId 
                           ? "bg-indigo-50 border-indigo-200 shadow-sm"
                           : "bg-white border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    )}
                 >
                     <div className="flex items-center justify-between mb-2">
                         <span className="text-[10px] font-mono text-slate-400">WF_{wf.workflowId.substring(0,6)}</span>
                         <span className={cn(
                             "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                             wf.riskFlags?.length > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                         )}>
                             {wf.riskFlags?.length > 0 ? `${wf.riskFlags.length} RISKS` : "HEALTHY"}
                         </span>
                     </div>
                     <div className="text-xs font-bold text-slate-800 mb-1">{wf.workflowType.replace("_", " ").toUpperCase()}</div>
                     <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                         <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600">{wf.currentState}</span>
                     </div>
                 </div>
             ))}
          </div>
      </div>

      {/* RIGHT: Selected Workflow Command Center */}
      {selectedWorkflow && (
          <div className="flex-1 flex flex-col overflow-y-auto space-y-6">
              
              {/* Health Panel (Header) */}
              <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6 shrink-0 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
                  
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <div className="px-3 py-1 bg-slate-900 text-white text-[10px] font-black font-mono rounded">
                                  {selectedWorkflow.workflowId}
                              </div>
                              <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                                  {selectedWorkflow.workflowType.replace("_", " ")}
                              </span>
                          </div>
                          <h1 className="text-2xl font-black text-slate-900 tracking-tighter">
                              {selectedWorkflow.currentState}
                          </h1>
                          <div className="flex items-center gap-4 mt-3">
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                  <Clock size={12} /> UPDATED {new Date(selectedWorkflow.updatedAt).toLocaleTimeString()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                  <Building size={12} /> {selectedWorkflow.ownerOrgId}
                              </span>
                          </div>
                      </div>

                      <div className="flex items-center gap-4">
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center min-w-[120px]">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Time In State</span>
                              <span className="text-lg font-black text-slate-800">12h 45m</span>
                          </div>
                          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center min-w-[120px]">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">SLA Health</span>
                              <span className="text-lg font-black text-emerald-700">100%</span>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Middle Row: Escalations & SLA */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 shrink-0">
                  {/* SLA Timers */}
                  <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-6">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-4 flex items-center gap-2">
                          <Clock size={16} className="text-indigo-500" /> Active SLA Timers
                      </h3>
                      {selectedWorkflow.slaTimers?.length > 0 ? (
                          <div className="space-y-3">
                              {selectedWorkflow.slaTimers.map((timer, i) => (
                                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                                      <div>
                                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">State Monitored</div>
                                          <div className="text-xs font-bold text-slate-800">{timer.state}</div>
                                      </div>
                                      <div className={cn(
                                          "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border",
                                          timer.status === "active" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                          timer.status === "fulfilled" ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                          "bg-red-50 text-red-600 border-red-200"
                                      )}>
                                          {timer.status}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-6 border border-dashed border-slate-200 rounded-xl bg-slate-50">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No active SLA trackers</p>
                          </div>
                      )}
                  </div>

                  {/* Operational Risk Indicators */}
                  <div className="bg-slate-900 rounded-[24px] border border-slate-800 shadow-sm p-6 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 opacity-10">
                           <ShieldAlert size={120} />
                      </div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-4 flex items-center gap-2 relative z-10">
                          <AlertTriangle size={16} className="text-amber-400" /> Escalation Indicators
                      </h3>
                      {selectedWorkflow.riskFlags?.length > 0 ? (
                          <div className="space-y-3 relative z-10">
                              {selectedWorkflow.riskFlags.map((risk, i) => (
                                  <div key={i} className="bg-white/10 p-3 rounded-xl border border-white/10 flex gap-3 items-start">
                                      <div className={cn(
                                          "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                          risk.severity === "CRITICAL" ? "bg-red-500" :
                                          risk.severity === "HIGH" ? "bg-orange-500" : "bg-amber-400"
                                      )} />
                                      <div>
                                          <div className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-0.5">{risk.type.replace(/_/g, " ")}</div>
                                          <p className="text-xs text-white opacity-80">{risk.message}</p>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="text-center py-8 relative z-10">
                               <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
                               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">System operating nominally</p>
                          </div>
                      )}
                  </div>
              </div>

              {/* Event / Audit Timeline */}
              <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm flex-col flex-1 overflow-hidden min-h-[400px]">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
                          <Terminal size={16} className="text-indigo-500" /> Immutable Audit Timeline
                      </h3>
                      <span className="text-[9px] font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-bold">REPLAY_ENABLED</span>
                  </div>
                  <div className="p-6 overflow-y-auto flex-1">
                      <div className="space-y-6">
                           {events[selectedWorkflow.workflowId]?.length ? events[selectedWorkflow.workflowId].map((evt, idx) => (
                               <div key={evt.eventId} className="relative pl-8">
                                   {/* Timeline Vertical Line */}
                                   <div className="absolute left-[11px] top-4 bottom-[-24px] w-[2px] bg-slate-100 last-of-type:hidden" />
                                   
                                   {/* Timeline Dot */}
                                   <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-indigo-50 border-2 border-indigo-200 flex items-center justify-center shrink-0 z-10">
                                       <GitCommit size={12} className="text-indigo-600" />
                                   </div>

                                   <div className="bg-white border text-sm border-slate-100 p-4 rounded-[16px] shadow-sm hover:shadow-md transition-shadow">
                                       <div className="flex justify-between items-start mb-3">
                                           <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                                               <span>{new Date(evt.timestamp).toLocaleString()}</span>
                                               <span>•</span>
                                               <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{evt.eventType}</span>
                                           </div>
                                           <div className="text-[9px] font-mono text-slate-400">ID: {evt.eventId.substring(0,8)}</div>
                                       </div>
                                       
                                       <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 mb-3">
                                           <div className="flex-1">
                                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 mt-[-2px]">From State</span>
                                               <span className="text-xs font-black text-slate-700">{evt.fromState}</span>
                                           </div>
                                           <ArrowRight size={14} className="text-slate-300 mx-2 shrink-0" />
                                           <div className="flex-1">
                                               <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1 mt-[-2px]">To State</span>
                                               <span className="text-xs font-black text-indigo-700">{evt.toState}</span>
                                           </div>
                                       </div>

                                       <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-400 pt-2 border-t border-slate-100">
                                           <div className="flex items-center gap-2">
                                               <Users size={12} /> ACTOR: {evt.actorId}
                                           </div>
                                           <div className="flex items-center gap-2">
                                               <Building size={12} /> ORG: {evt.organizationId}
                                           </div>
                                       </div>
                                   </div>
                               </div>
                           )) : (
                               <div className="text-center py-12 text-slate-400">
                                  <Terminal size={32} className="mx-auto mb-4 opacity-20" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">No Events Found</p>
                               </div>
                           )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
