import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Pause, 
  RefreshCw, 
  Settings, 
  History, 
  Terminal, 
  FileText,
  Clock,
  ShieldAlert,
  Brain,
  Network
} from "lucide-react";
import { collection, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AIAgentsTab({ userRole }: { userRole: string }) {
  const [activeCategory, setActiveCategory] = useState('Recruitment');
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  
  const agents = [
    // Core (Infrastructure)
    { id: 'auth-agent', name: 'Authentication Agent', category: 'Infrastructure', status: 'Running', core: true, execsToday: 1420, avgTime: '12ms', success: '100%', schedule: 'Event-driven', desc: 'Validates tokens and enforces RBAC policies' },
    { id: 'mail-sync', name: 'Mail Sync Agent', category: 'Infrastructure', status: 'Running', core: true, execsToday: 412, avgTime: '1.2s', success: '99.8%', schedule: 'Event: EMAIL_RECEIVED', desc: 'Synchronizes emails via Gmail Pub/Sub webhook' },
    { id: 'event-bus', name: 'Event Bus', category: 'Infrastructure', status: 'Running', core: true, execsToday: 8540, avgTime: '5ms', success: '100%', schedule: 'Continuous', desc: 'Routes system events to appropriate worker queues' },
    { id: 'audit-logger', name: 'Audit Logger', category: 'Infrastructure', status: 'Running', core: true, execsToday: 4210, avgTime: '15ms', success: '100%', schedule: 'Event-driven', desc: 'Maintains compliance and security audit trails' },

    // Security
    { id: 'incident-agent', name: 'Incident Agent', category: 'Security', status: 'Running', core: false, execsToday: 24, avgTime: '5.2s', success: '100%', schedule: 'Cron: Every 1 hour', desc: 'Scans logs and raises incidents for anomalies' },
    { id: 'security-scanner', name: 'Security Scanner', category: 'Security', status: 'Idle', core: false, execsToday: 6, avgTime: '18s', success: '100%', schedule: 'Cron: Every 4 hours', desc: 'Scans for exposed secrets and auth failures' },
    { id: 'rbac-auditor', name: 'RBAC Auditor', category: 'Security', status: 'Running', core: false, execsToday: 12, avgTime: '4.5s', success: '100%', schedule: 'Cron: Every 2 hours', desc: 'Verifies role assignments and access policies' },

    // Recruitment
    { id: 'resume-parser', name: 'Resume Parser', category: 'Recruitment', status: 'Running', core: false, execsToday: 856, avgTime: '2.1s', success: '98.2%', schedule: 'Event: RESUME_UPLOADED', desc: 'Extracts entities from uploaded candidate CVs' },
    { id: 'jd-parser', name: 'JD Parser', category: 'Recruitment', status: 'Idle', core: false, execsToday: 128, avgTime: '3.4s', success: '96.5%', schedule: 'Event: REQUIREMENT_CREATED', desc: 'Parses client job descriptions into structured models' },
    { id: 'matching-engine', name: 'Matching Engine', category: 'Recruitment', status: 'Idle', core: false, execsToday: 341, avgTime: '4.5s', success: '100%', schedule: 'Event: REQUIREMENT_CREATED', desc: 'Ranks candidate pool against new requirements' },
    { id: 'interview-agent', name: 'Interview Agent', category: 'Recruitment', status: 'Idle', core: false, execsToday: 42, avgTime: '400ms', success: '100%', schedule: 'Cron: Every 30 min', desc: 'Monitors interview schedules and sends reminders' },
    { id: 'duplicate-detector', name: 'Duplicate Detector', category: 'Recruitment', status: 'Running', core: false, execsToday: 856, avgTime: '800ms', success: '99.9%', schedule: 'Event: RESUME_UPLOADED', desc: 'Prevents candidate ownership conflicts' },

    // Business
    { id: 'vendor-broadcast', name: 'Vendor Broadcast', category: 'Business', status: 'Idle', core: false, execsToday: 94, avgTime: '850ms', success: '100%', schedule: 'Event: REQUIREMENT_CREATED', desc: 'Distributes open jobs to eligible vendor partners' },
    { id: 'founder-report', name: 'Founder Report', category: 'Business', status: 'Scheduled', core: false, execsToday: 1, avgTime: '12s', success: '100%', schedule: 'Cron: 6:00 PM', desc: 'Generates end-of-day executive summary' },
    { id: 'finance-agent', name: 'Finance Agent', category: 'Business', status: 'Idle', core: false, execsToday: 12, avgTime: '2.5s', success: '100%', schedule: 'Cron: Every 1 hour', desc: 'Updates invoices, payments, and revenue ledger' },
    { id: 'revenue-forecast', name: 'Revenue Forecast', category: 'Business', status: 'Disabled', core: false, execsToday: 0, avgTime: '--', success: '--', schedule: 'Cron: Every 12 hours', desc: 'Predicts monthly revenue based on pipeline' },

    // AI
    { id: 'prompt-optimizer', name: 'Prompt Optimizer', category: 'AI', status: 'Running', core: false, execsToday: 2150, avgTime: '120ms', success: '99.5%', schedule: 'Event-driven', desc: 'Injects context into dynamic AI prompts' },
    { id: 'cost-optimizer', name: 'AI Cost Optimizer', category: 'AI', status: 'Idle', core: false, execsToday: 24, avgTime: '1.2s', success: '100%', schedule: 'Cron: Every 1 hour', desc: 'Monitors token usage and manages provider failovers' }
  ];

  const categories = ['Recruitment', 'Business', 'Security', 'Infrastructure', 'AI'];

  const filteredAgents = agents.filter(a => a.category === activeCategory);

  const renderAgentStatus = (status: string) => {
    switch (status) {
      case 'Running': return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit"><span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span></span> Running</span>;
      case 'Idle': return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 w-fit">Idle</span>;
      case 'Scheduled': return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">Scheduled</span>;
      case 'Disabled': return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 w-fit">Disabled</span>;
      default: return <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700 w-fit">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-900 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(30,58,138,1)]">
            AI Agents
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <Bot size={14} className="text-indigo-900" /> Business Automation Engine
          </p>
        </div>
        <button className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-800 transition-colors flex items-center gap-2">
           <RefreshCw size={16} /> Refresh State
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agents Running</span>
            <span className="text-2xl font-black text-emerald-600">12</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Idle / Standby</span>
            <span className="text-2xl font-black text-slate-700">4</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Disabled</span>
            <span className="text-2xl font-black text-rose-600">1</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Failed</span>
            <span className="text-2xl font-black text-rose-600">0</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Job Queue</span>
            <span className="text-2xl font-black text-indigo-600">18</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Executions Today</span>
            <span className="text-2xl font-black text-slate-800">16,241</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2">
              {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setSelectedAgent(null); }}
                    className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between",
                        activeCategory === cat ? "bg-indigo-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                    )}
                  >
                      {cat}
                      <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", activeCategory === cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                          {agents.filter(a => a.category === cat).length}
                      </span>
                  </button>
              ))}
          </div>

          <div className="lg:col-span-3 space-y-4">
              {!selectedAgent ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[500px]">
                      <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-4">{activeCategory} Agents</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {filteredAgents.map(agent => (
                              <div 
                                key={agent.id} 
                                onClick={() => setSelectedAgent(agent)}
                                className="bg-slate-950 border border-slate-800 rounded-xl p-5 hover:border-indigo-500/50 transition-colors cursor-pointer group flex flex-col h-full"
                              >
                                  <div className="flex justify-between items-start mb-3">
                                      <div className="flex items-center gap-2">
                                          <Bot size={18} className="text-indigo-400" />
                                          <h4 className="text-sm font-bold text-slate-200 group-hover:text-indigo-400 transition-colors">{agent.name}</h4>
                                          {agent.core && <span className="text-[8px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20">Core</span>}
                                      </div>
                                      {renderAgentStatus(agent.status)}
                                  </div>
                                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 flex-1">{agent.desc}</p>
                                  <div className="grid grid-cols-2 gap-2 mt-auto border-t border-slate-800 pt-3">
                                      <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">Executions</p>
                                          <p className="text-xs text-slate-300 font-mono">{agent.execsToday.toLocaleString()}</p>
                                      </div>
                                      <div>
                                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">Success Rate</p>
                                          <p className={cn("text-xs font-mono", agent.success === '100%' ? "text-emerald-400" : agent.success === '--' ? "text-slate-500" : "text-amber-400")}>{agent.success}</p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[500px]">
                      <button 
                        onClick={() => setSelectedAgent(null)}
                        className="text-xs font-bold text-slate-400 hover:text-white mb-6 flex items-center gap-1 transition-colors"
                      >
                          ← Back to {activeCategory}
                      </button>

                      <div className="flex justify-between items-start mb-8">
                          <div>
                              <div className="flex items-center gap-3 mb-2">
                                  <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                                      <Bot size={24} className="text-indigo-400" />
                                  </div>
                                  <div>
                                      <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                          {selectedAgent.name}
                                          {selectedAgent.core && <span className="text-[10px] font-bold uppercase tracking-widest bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 relative top-0.5">Core System</span>}
                                      </h2>
                                      <p className="text-sm text-slate-400">{selectedAgent.desc}</p>
                                  </div>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                              {renderAgentStatus(selectedAgent.status)}
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Trigger / Schedule</span>
                              <span className="text-xs text-slate-300 font-mono">{selectedAgent.schedule}</span>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Executions Today</span>
                              <span className="text-sm font-bold text-slate-200 font-mono">{selectedAgent.execsToday.toLocaleString()}</span>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Avg Latency</span>
                              <span className="text-sm font-bold text-slate-200 font-mono">{selectedAgent.avgTime}</span>
                          </div>
                          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Success Rate</span>
                              <span className={cn("text-sm font-bold font-mono", selectedAgent.success === '100%' ? "text-emerald-400" : selectedAgent.success === '--' ? "text-slate-500" : "text-amber-400")}>{selectedAgent.success}</span>
                          </div>
                      </div>

                      <div className="flex gap-3 mb-8 border-b border-slate-800 pb-8">
                          <button className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                              <Play size={16}/> Run Now
                          </button>
                          {selectedAgent.status === 'Disabled' ? (
                              <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                                  <Play size={16}/> Enable
                              </button>
                          ) : (
                              <button 
                                className={cn("px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors", selectedAgent.core ? "bg-slate-800 text-slate-500 cursor-not-allowed" : "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400")}
                                disabled={selectedAgent.core}
                                title={selectedAgent.core ? "Core agents cannot be disabled" : ""}
                              >
                                  <Pause size={16}/> Disable
                              </button>
                          )}
                          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
                              <RefreshCw size={16}/> Restart
                          </button>
                          <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ml-auto">
                              <Settings size={16}/> Configuration
                          </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                              <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><History size={16}/> Recent Executions</h4>
                              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                                  {selectedAgent.execsToday === 0 ? (
                                      <div className="p-6 text-center text-xs text-slate-500 font-mono">No executions today</div>
                                  ) : (
                                      <table className="w-full text-left border-collapse">
                                        <tbody className="divide-y divide-slate-800/50">
                                            <tr className="hover:bg-slate-800/30">
                                                <td className="py-2.5 px-4"><CheckCircle2 size={14} className="text-emerald-500"/></td>
                                                <td className="py-2.5 px-4 text-xs font-mono text-slate-400">Just now</td>
                                                <td className="py-2.5 px-4 text-xs font-mono text-slate-500 text-right">{selectedAgent.avgTime}</td>
                                            </tr>
                                            <tr className="hover:bg-slate-800/30">
                                                <td className="py-2.5 px-4"><CheckCircle2 size={14} className="text-emerald-500"/></td>
                                                <td className="py-2.5 px-4 text-xs font-mono text-slate-400">2 mins ago</td>
                                                <td className="py-2.5 px-4 text-xs font-mono text-slate-500 text-right">1.4s</td>
                                            </tr>
                                            <tr className="hover:bg-slate-800/30">
                                                <td className="py-2.5 px-4"><CheckCircle2 size={14} className="text-emerald-500"/></td>
                                                <td className="py-2.5 px-4 text-xs font-mono text-slate-400">5 mins ago</td>
                                                <td className="py-2.5 px-4 text-xs font-mono text-slate-500 text-right">800ms</td>
                                            </tr>
                                        </tbody>
                                      </table>
                                  )}
                              </div>
                          </div>
                          <div>
                              <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Network size={16}/> Dependencies</h4>
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                                  {selectedAgent.id === 'mail-sync' && (
                                      <>
                                        <div className="flex items-center gap-2 text-xs text-slate-400"><Activity size={14} className="text-amber-500"/> Blocks: JD Parser</div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400"><Activity size={14} className="text-amber-500"/> Blocks: Resume Parser</div>
                                      </>
                                  )}
                                  {selectedAgent.id === 'resume-parser' && (
                                      <>
                                        <div className="flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 size={14} className="text-emerald-500"/> Depends on: Mail Sync</div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400"><Activity size={14} className="text-amber-500"/> Blocks: Matching Engine</div>
                                      </>
                                  )}
                                  {selectedAgent.id !== 'mail-sync' && selectedAgent.id !== 'resume-parser' && (
                                      <div className="text-xs text-slate-500 font-mono">No direct dependencies mapped.</div>
                                  )}
                              </div>
                          </div>
                      </div>

                  </div>
              )}
          </div>
      </div>
    </div>
  );
}
