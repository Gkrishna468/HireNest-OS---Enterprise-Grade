import React, { useState, useEffect } from "react";
import { Activity, Server, AlertTriangle, ShieldAlert, Key, Clock, ListFilter } from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function ObservabilityDashboard() {
  const [runtimeErrors, setRuntimeErrors] = useState<any[]>([]);
  const [workflowFailures, setWorkflowFailures] = useState<any[]>([]);
  const [oauthEvents, setOauthEvents] = useState<any[]>([]);
  const [securityEvents, setSecurityEvents] = useState<any[]>([]);

  useEffect(() => {
    // 1. Runtime Errors
    const q1 = query(collection(db, "runtime_errors"), orderBy("timestamp", "desc"), limit(50));
    const u1 = onSnapshot(q1, (snap) => setRuntimeErrors(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // 2. Workflow Failures
    const q2 = query(collection(db, "workflow_failures"), orderBy("timestamp", "desc"), limit(50));
    const u2 = onSnapshot(q2, (snap) => setWorkflowFailures(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // 3. OAuth Events (Failures only for metric)
    const q3 = query(collection(db, "oauth_events"), orderBy("timestamp", "desc"), limit(50));
    const u3 = onSnapshot(q3, (snap) => setOauthEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // 4. Security Events
    const q4 = query(collection(db, "security_events"), orderBy("timestamp", "desc"), limit(50));
    const u4 = onSnapshot(q4, (snap) => setSecurityEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => {
      u1(); u2(); u3(); u4();
    };
  }, []);

  const todayStr = new Date().toISOString().split("T")[0];

  const errorsToday = runtimeErrors.filter(e => e.timestamp?.startsWith(todayStr)).length;
  const wfFailuresToday = workflowFailures.filter(e => e.timestamp?.startsWith(todayStr)).length;
  const oauthFailuresToday = oauthEvents.filter(e => e.status === "failure" && e.timestamp?.startsWith(todayStr)).length;
  const securityToday = securityEvents.filter(e => e.timestamp?.startsWith(todayStr)).length;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Server className="w-3 h-3 mr-1" /> Runtime Errors Today
          </div>
          <div className="text-3xl font-black text-rose-600">{errorsToday}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Activity className="w-3 h-3 mr-1" /> Workflow Failures Today
          </div>
          <div className="text-3xl font-black text-amber-600">{wfFailuresToday}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Key className="w-3 h-3 mr-1" /> OAuth Failures Today
          </div>
          <div className="text-3xl font-black text-purple-600">{oauthFailuresToday}</div>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <ShieldAlert className="w-3 h-3 mr-1" /> Security Events Today
          </div>
          <div className="text-3xl font-black text-indigo-600">{securityToday}</div>
        </div>
      </div>

      <div className="bg-white border rounded-sm flex-1 flex min-h-0">
        {/* Stream of events */}
        <div className="w-full flex flex-col">
          <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
              <ListFilter className="w-4 h-4 mr-2 text-slate-400" /> Recent Telemetry
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-slate-100">
              {[...runtimeErrors.map(e => ({ ...e, _tag: "Runtime", _icon: Server, _color: "text-rose-500", _bg: "bg-rose-50" })),
                ...workflowFailures.map(e => ({ ...e, _tag: "Workflow", _icon: Activity, _color: "text-amber-500", _bg: "bg-amber-50" })),
                ...oauthEvents.map(e => ({ ...e, _tag: "OAuth", _icon: Key, _color: "text-purple-500", _bg: "bg-purple-50" })),
                ...securityEvents.map(e => ({ ...e, _tag: "Security", _icon: ShieldAlert, _color: "text-indigo-500", _bg: "bg-indigo-50" }))
              ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
               .slice(0, 100)
               .map((event, idx) => {
                 const Icon = event._icon;
                 return (
                   <div key={`${event.id}-${idx}`} className="p-3 px-4 hover:bg-slate-50 flex items-start gap-4 transition-colors">
                     <div className={`mt-0.5 p-1.5 rounded-sm ${event._bg}`}>
                       <Icon className={`w-4 h-4 ${event._color}`} />
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="flex items-center justify-between mb-1">
                         <div className="flex items-center gap-2">
                           <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{event._tag}</span>
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase ${
                             event.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' : 
                             event.severity === 'ERROR' ? 'bg-rose-100 text-rose-700' :
                             event.severity === 'WARN' ? 'bg-amber-100 text-amber-700' :
                             'bg-slate-100 text-slate-700'
                           }`}>
                             {event.severity || 'INFO'}
                           </span>
                         </div>
                         <div className="text-[10px] font-mono text-slate-400">
                           {new Date(event.timestamp).toLocaleString()}
                         </div>
                       </div>
                       <div className="text-sm text-slate-600 truncate">
                         {event._tag === "Runtime" && (event.message || "Unknown error")}
                         {event._tag === "Workflow" && `${event.workflowType}: ${event.failureReason || "Failed"}`}
                         {event._tag === "OAuth" && `${event.provider} - ${event.status}`}
                         {event._tag === "Security" && `${event.action} on ${event.resource}`}
                       </div>
                       {(event.tenantId || event.orgId) && (
                         <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                           {event.tenantId && <span>TENANT: {event.tenantId}</span>}
                           {event.orgId && <span>ORG: {event.orgId}</span>}
                           {event.traceId && <span>TRACE: {event.traceId}</span>}
                         </div>
                       )}
                     </div>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
