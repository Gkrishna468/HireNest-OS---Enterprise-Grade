import React, { useState, useEffect } from "react";
import { Activity, Server, Clock, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export default function WorkflowDashboard() {
  const [workflows, setWorkflows] = useState<any[]>([
    { id: "wf-1", eventType: "INTERVIEW_COMPLETED", status: "COMPLETED", retryCount: 0, createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: "wf-2", eventType: "JOB_PUBLISHED", status: "LEASED", retryCount: 1, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: "wf-3", eventType: "SUBMISSION_CREATED", status: "QUEUED", retryCount: 0, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  ]);

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 border rounded-sm">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Backlog (Queued)</div>
          <div className="text-3xl font-black text-slate-800">12</div>
        </div>
        <div className="bg-white p-4 border rounded-sm">
          <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-2">Workers (Leased)</div>
          <div className="text-3xl font-black text-blue-600">4</div>
        </div>
        <div className="bg-white p-4 border rounded-sm border-rose-200 bg-rose-50/30">
          <div className="text-[10px] font-bold text-rose-500 uppercase tracking-wider mb-2">System Load</div>
          <div className="text-3xl font-black text-rose-600">82%</div>
        </div>
        <div className="bg-white p-4 border rounded-sm">
          <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-2">Temporal Health</div>
          <div className="text-sm font-bold text-emerald-600 flex items-center mt-2">
            <ShieldCheck className="w-4 h-4 mr-1" /> ONLINE
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-sm flex-1 flex flex-col min-h-0">
        <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
            <Server className="w-4 h-4 mr-2 text-indigo-600" /> Active Executions
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {workflows.map((job) => (
            <div key={job.id} className="p-3 bg-white border border-slate-100 rounded-sm flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                  {job.status === "COMPLETED" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
                   job.status === "DEAD_LETTER" ? <AlertTriangle className="w-4 h-4 text-rose-500" /> :
                   <Clock className="w-4 h-4 text-blue-500" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-bold text-slate-800">{job.eventType}</div>
                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-mono">{job.status}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 mt-1">ID: {job.id} • Tries: {job.retryCount || 0} • {new Date(job.createdAt).toLocaleString()}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
