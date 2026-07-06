import React, { useState, useEffect } from "react";
import { Activity, Server, AlertTriangle, ShieldAlert, Key, Clock, ListFilter, Cpu, Bug } from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot, where } from "firebase/firestore";
import { db } from "../../lib/firebase";

export default function ObservabilityDashboard() {
  const [errorLogs, setErrorLogs] = useState<any[]>([]);
  const [aiMetrics, setAiMetrics] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  useEffect(() => {
    // 1. Error Monitoring Logs
    const q1 = query(collection(db, "error_monitoring_logs"), orderBy("timestamp", "desc"), limit(50));
    const u1 = onSnapshot(q1, (snap) => setErrorLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // 2. AI Metrics Ledger
    const q2 = query(collection(db, "ai_metrics_ledger"), orderBy("timestamp", "desc"), limit(50));
    const u2 = onSnapshot(q2, (snap) => setAiMetrics(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // 3. Audit Logs
    const q3 = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(50));
    const u3 = onSnapshot(q3, (snap) => setAuditLogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => {
      u1(); u2(); u3();
    };
  }, []);

  // ponytail: robust formatting of Firestore timestamps/dates/strings to ISO format to prevent e.timestamp?.startsWith crashes
  const formatTimestamp = (ts: any): string => {
    if (!ts) return new Date().toISOString();
    if (typeof ts === "string") return ts;
    if (typeof ts.seconds === "number") {
      return new Date(ts.seconds * 1000).toISOString();
    }
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toISOString();
    }
    if (ts instanceof Date) {
      return ts.toISOString();
    }
    if (typeof ts.toDate === "function") {
      try {
        return ts.toDate().toISOString();
      } catch (e) {}
    }
    try {
      return new Date(ts).toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const errorsToday = errorLogs.filter(e => formatTimestamp(e.timestamp).startsWith(todayStr)).length;
  const aiCallsToday = aiMetrics.filter(e => formatTimestamp(e.timestamp).startsWith(todayStr)).length;
  const auditEventsToday = auditLogs.filter(e => formatTimestamp(e.timestamp).startsWith(todayStr)).length;

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Bug className="w-3 h-3 mr-1" /> API & System Errors
          </div>
          <div className="text-3xl font-black text-rose-600">{errorsToday}</div>
        </div>
        
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <Cpu className="w-3 h-3 mr-1" /> AI Executions Today
          </div>
          <div className="text-3xl font-black text-indigo-600">{aiCallsToday}</div>
        </div>
        
        <div className="bg-white p-4 border border-slate-200 rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
            <ShieldAlert className="w-3 h-3 mr-1" /> Audit Events Today
          </div>
          <div className="text-3xl font-black text-purple-600">{auditEventsToday}</div>
        </div>
      </div>

      <div className="bg-white border rounded-sm flex-1 flex min-h-0">
        {/* Stream of events */}
        <div className="w-full flex flex-col">
          <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
              <ListFilter className="w-4 h-4 mr-2 text-slate-400" /> Production Telemetry Stream
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-0">
            <div className="divide-y divide-slate-100">
              {[...errorLogs.map(e => ({ ...e, _ts: formatTimestamp(e.timestamp), _tag: e.errorType || "Error", _icon: Bug, _color: "text-rose-500", _bg: "bg-rose-50" })),
                ...aiMetrics.map(e => ({ ...e, _ts: formatTimestamp(e.timestamp), _tag: "AI_CALL", _icon: Cpu, _color: "text-indigo-500", _bg: "bg-indigo-50" })),
                ...auditLogs.map(e => ({ ...e, _ts: formatTimestamp(e.timestamp), _tag: "AUDIT", _icon: ShieldAlert, _color: "text-purple-500", _bg: "bg-purple-50" }))
              ].sort((a, b) => new Date(b._ts).getTime() - new Date(a._ts).getTime())
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
                           {event.model && (
                             <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase bg-slate-100 text-slate-700">
                               {event.model}
                             </span>
                           )}
                           {event.confidence && (
                             <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase bg-indigo-100 text-indigo-700">
                               Conf: {event.confidence}%
                             </span>
                           )}
                         </div>
                         <div className="text-[10px] font-mono text-slate-400">
                           {new Date(event._ts).toLocaleString()}
                         </div>
                       </div>
                       <div className="text-sm text-slate-600 truncate">
                         {event._tag === "AI_CALL" && `Latency: ${event.latency}ms | Provider: ${event.provider} | Capability: ${event.capability || 'general'}`}
                         {event._tag === "AUDIT" && `${event.action}: ${event.details}`}
                         {event._tag !== "AI_CALL" && event._tag !== "AUDIT" && (event.errorMessage || event.message || "System Event")}
                       </div>
                       {(event.userId || event.workspaceId || event.context) && (
                         <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-2">
                           {event.userId && <span>USER: {event.userId}</span>}
                           {event.workspaceId && <span>WORKSPACE: {event.workspaceId}</span>}
                           {event.context && <span>CONTEXT: {event.context}</span>}
                           {event.requestId && <span>REQ: {event.requestId}</span>}
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
