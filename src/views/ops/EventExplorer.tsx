import React, { useState } from "react";
import { Activity, Search, Filter, Box } from "lucide-react";

export default function EventExplorer() {
  const [events] = useState([
    { id: "evt-0a1", type: "SUBMISSION_CREATED", tenant: "org-acme", actor: "system:api", timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString() },
    { id: "evt-0a2", type: "WORKFLOW_STARTED", tenant: "org-acme", actor: "system:temporal", timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString() },
    { id: "evt-0a3", type: "INTERVIEW_REQUESTED", tenant: "org-acme", actor: "usr-req-1", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: "evt-0a4", type: "CANDIDATE_RECOMMENDED", tenant: "org-global", actor: "system:ai-agent:recruiter", timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString() },
    { id: "evt-0a5", type: "PROJECTION_REBUILT", tenant: "system", actor: "admin:root", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  ]);

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center gap-3 bg-white p-3 border rounded-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-sm text-sm"
            placeholder="Search events by ID, type, or tenant..."
          />
        </div>
        <button className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-sm text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-100 text-slate-600">
          <Filter className="w-4 h-4" /> Filter
        </button>
      </div>

      <div className="flex-1 bg-white border rounded-sm flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
            <Activity className="w-4 h-4 mr-2" /> Global Event Stream
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono">LIVE</span>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {events.map((evt, idx) => (
            <div key={evt.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 flex items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-sm font-black text-slate-800">{evt.type}</span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono leading-none">ID: {evt.id}</span>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  <span>{new Date(evt.timestamp).toLocaleString()}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Box className="w-3 h-3" /> {evt.tenant}</span>
                  <span>•</span>
                  <span className="font-mono bg-indigo-50 text-indigo-500 px-1 py-0.5 rounded">{evt.actor}</span>
                </div>
              </div>
              <div>
                <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 border border-slate-200 rounded-sm hover:bg-slate-100">
                  Inspect Payload
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
