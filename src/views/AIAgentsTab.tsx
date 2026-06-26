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
  Network,
  Target,
  TrendingUp,
  ArrowRight
} from "lucide-react";
import { collection, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AIAgentsTab({ userRole }: { userRole: string }) {
  const [activeCategory, setActiveCategory] = useState('Workforce Overview');
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "ai_agents"));
    const unsub = onSnapshot(q, (snap) => {
      setAgents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    const unsubQ = onSnapshot(query(collection(db, "agent_queue")), (snap) => {
        let qC = 0;
        let fC = 0;
        snap.forEach(doc => {
            const data = doc.data();
            if (data.status === 'queued') qC++;
            if (data.status === 'failed') fC++;
        });
        setQueueCount(qC);
        setFailedCount(fC);
    });
    
    return () => { unsub(); unsubQ(); };
  }, []);

  const handleInitialize = async () => {
    try {
      await fetch('/api/cron/orchestrator/seed');
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      await fetch('/api/cron/orchestrator/reset');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = async () => {
    try {
      await fetch('/api/cron/orchestrator/process');
    } catch (e) {
      console.error(e);
    }
  };

  const handleRunNow = async () => {
    if (!selectedAgent) return;
    try {
      await fetch('/api/cron/orchestrator/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgent.id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!selectedAgent) return;
    // We cannot use where + orderBy on different fields without an index, so we just order by timestamp
    const unsub = onSnapshot(query(collection(db, "agent_executions"), limit(5)), (snap) => {
      // In a real app we'd filter by agentId on the server or client
      const allExecs: any[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setExecutions(allExecs.filter(e => e.agentId === selectedAgent.id || e.agentName === selectedAgent.name).slice(0, 5));
    });
    return () => unsub();
  }, [selectedAgent]);

  const categories = [
    'Workforce Overview', 
    'Chief Operating Office',
    'Founder Office', 
    'Recruitment Office', 
    'GTM Office', 
    'Vendor Office', 
    'Client Office', 
    'Platform Office',
    'Agent Marketplace'
  ];

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
            <Bot size={14} className="text-indigo-900" /> Business Automation Engine (Vercel Eve Runtime)
          </p>
        </div>
        <div className="flex items-center gap-3">
            {agents.length === 0 && (
                <button onClick={handleInitialize} className="bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-amber-600 transition-colors flex items-center gap-2">
                    <Activity size={16} /> Initialize Engine
                </button>
            )}
            {agents.length > 0 && (
                <button onClick={handleReset} className="bg-rose-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-rose-800 transition-colors flex items-center gap-2">
                    <RefreshCw size={16} /> Reset DB
                </button>
            )}
            <button onClick={async () => {
              await fetch('/api/events/publish', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'RESUME_UPLOADED', payload: { resumeUrl: 'test.pdf' } })
              });
              await fetch('/api/events/publish', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ type: 'REQUIREMENT_CREATED', payload: { reqId: 'req-123' } })
              });
            }} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-emerald-500 transition-colors flex items-center gap-2">
                <Play size={16} /> Test Events
            </button>
            <button onClick={handleRefresh} className="bg-indigo-900 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-800 transition-colors flex items-center gap-2">
                <RefreshCw size={16} /> Process Queue
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Agents Running</span>
            <span className="text-2xl font-black text-emerald-600">{agents.filter(a => a.status === 'Running').length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Idle / Standby</span>
            <span className="text-2xl font-black text-slate-700">{agents.filter(a => a.status === 'Idle').length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Disabled</span>
            <span className="text-2xl font-black text-rose-600">{agents.filter(a => a.status === 'Disabled').length}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Failed</span>
            <span className="text-2xl font-black text-rose-600">{failedCount}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Job Queue</span>
            <span className="text-2xl font-black text-indigo-600">{queueCount}</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Executions Today</span>
            <span className="text-2xl font-black text-slate-800">{agents.reduce((acc, a) => acc + (a.execsToday || 0), 0).toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2">
              {categories.map(cat => {
                  const isAgentCategory = cat.includes('Layer');
                  const count = isAgentCategory ? agents.filter(a => a.category === cat).length : null;
                  
                  return (
                  <button
                    key={cat}
                    onClick={() => { setActiveCategory(cat); setSelectedAgent(null); }}
                    className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-colors flex items-center justify-between",
                        activeCategory === cat ? "bg-indigo-900 text-white shadow-sm" : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                    )}
                  >
                      {cat}
                      {isAgentCategory && count !== null && count > 0 && (
                          <span className={cn("text-xs font-mono px-2 py-0.5 rounded-full", activeCategory === cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500")}>
                              {count}
                          </span>
                      )}
                  </button>
                  );
              })}
          </div>

          <div className="lg:col-span-3 space-y-4">
              {!selectedAgent ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[500px]">
                      <h3 className="text-lg font-bold text-white mb-6 border-b border-slate-800 pb-4">{activeCategory}</h3>
                      
                      {activeCategory === 'Workforce Overview' ? (
                          <div className="space-y-8">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Core Infrastructure Health</h4>
                                      <div className="space-y-3">
                                          {agents.filter(a => a.core).slice(0, 4).map(agent => (
                                              <div key={agent.id} className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2 text-sm text-slate-300">
                                                      <Bot size={14} className="text-slate-500" />
                                                      {agent.name}
                                                  </div>
                                                  {renderAgentStatus(agent.status)}
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Top Active Agents</h4>
                                      <div className="space-y-3">
                                          {agents.filter(a => !a.core).sort((a, b) => (b.execsToday || 0) - (a.execsToday || 0)).slice(0, 4).map(agent => (
                                              <div key={agent.id} className="flex items-center justify-between">
                                                  <div className="flex items-center gap-2 text-sm text-slate-300">
                                                      <Bot size={14} className="text-indigo-400" />
                                                      {agent.name}
                                                  </div>
                                                  <span className="text-xs font-mono text-slate-400">{(agent.execsToday || 0).toLocaleString()} runs</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                                      Agent Supervisor Action Required
                                      <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">0 Pending</span>
                                  </h4>
                                  <div className="text-center py-8">
                                      <CheckCircle2 size={32} className="mx-auto text-slate-700 mb-2" />
                                      <p className="text-sm text-slate-400">All agents are operating normally.</p>
                                  </div>
                              </div>
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-4">Enterprise Maturity Roadmap</h4>
                                  <div className="space-y-4 text-sm">
                                      <div className="flex items-start gap-4">
                                          <div className="w-24 font-mono text-xs text-indigo-400 mt-1">HN-011</div>
                                          <div>
                                              <div className="text-slate-300 font-bold mb-1">Enterprise Runtime <span className="ml-2 text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded uppercase">Current Phase</span></div>
                                              <div className="text-slate-400 text-xs">AI COO, Enterprise Scheduler, Agent Runtime Engine, Queues, Observability.</div>
                                          </div>
                                      </div>
                                      <div className="flex items-start gap-4">
                                          <div className="w-24 font-mono text-xs text-slate-500 mt-1">HN-012</div>
                                          <div>
                                              <div className="text-slate-300 font-bold mb-1 text-slate-400">Office Memory</div>
                                              <div className="text-slate-500 text-xs">Long-term memory, Working memory, KPI history, Vendor/Candidate history.</div>
                                          </div>
                                      </div>
                                      <div className="flex items-start gap-4">
                                          <div className="w-24 font-mono text-xs text-slate-500 mt-1">HN-013</div>
                                          <div>
                                              <div className="text-slate-300 font-bold mb-1 text-slate-400">Business Engine</div>
                                              <div className="text-slate-500 text-xs">Cross-office automation, end-to-end loops from requirement to placement to coaching.</div>
                                          </div>
                                      </div>
                                      <div className="flex items-start gap-4">
                                          <div className="w-24 font-mono text-xs text-slate-500 mt-1">HN-014</div>
                                          <div>
                                              <div className="text-slate-300 font-bold mb-1 text-slate-400">Revenue Intelligence</div>
                                              <div className="text-slate-500 text-xs">Executive insights, profit prediction, recruiter/vendor ranking, risk forecasting.</div>
                                          </div>
                                      </div>
                                      <div className="flex items-start gap-4">
                                          <div className="w-24 font-mono text-xs text-slate-500 mt-1">HN-015</div>
                                          <div>
                                              <div className="text-slate-300 font-bold mb-1 text-slate-400">Enterprise Learning</div>
                                              <div className="text-slate-500 text-xs">Continuous optimization of the entire organization, higher placement/revenue automatically.</div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ) : activeCategory === 'Chief Operating Office' ? (
                          <div className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 col-span-3">
                                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Target size={14} /> Mission: OS Conductor</h4>
                                      <p className="text-sm text-slate-300 italic mb-4">
                                          Monitor every Office, balance workloads, detect bottlenecks, escalate failures, reassign work, and optimize AI/Infrastructure costs across the entire workforce.
                                      </p>
                                      
                                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                              <div className="text-slate-400 text-xs font-bold uppercase mb-1">Global Queue</div>
                                              <div className="text-2xl font-mono text-white">{queueCount.toLocaleString()}</div>
                                          </div>
                                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                              <div className="text-slate-400 text-xs font-bold uppercase mb-1">Blocked Workflows</div>
                                              <div className="text-2xl font-mono text-rose-400">{failedCount.toLocaleString()}</div>
                                          </div>
                                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                                              <div className="text-slate-400 text-xs font-bold uppercase mb-1">Active Offices</div>
                                              <div className="text-2xl font-mono text-emerald-400">7 / 7</div>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col justify-center">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Activity size={14} /> System Health</h4>
                                      <div className="flex flex-col gap-4">
                                          <div className="flex justify-between items-center text-sm">
                                              <span className="text-slate-400">Runtime</span>
                                              <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Stable</span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm">
                                              <span className="text-slate-400">Event Bus</span>
                                              <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Synced</span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm">
                                              <span className="text-slate-400">Cost Engine</span>
                                              <span className="text-indigo-400 font-bold">Optimized</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                                      Real-Time Observability
                                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">15m refresh loop</span>
                                  </h4>
                                  <div className="overflow-x-auto">
                                      <table className="w-full text-left text-sm text-slate-400">
                                          <thead className="text-xs text-slate-500 uppercase bg-slate-900/50 border-b border-slate-800">
                                              <tr>
                                                  <th className="px-4 py-3">Office</th>
                                                  <th className="px-4 py-3">Status</th>
                                                  <th className="px-4 py-3">Capacity</th>
                                                  <th className="px-4 py-3">SLA Health</th>
                                                  <th className="px-4 py-3">AI Spend (24h)</th>
                                                  <th className="px-4 py-3">Action</th>
                                              </tr>
                                          </thead>
                                          <tbody>
                                              <tr className="border-b border-slate-800/50">
                                                  <td className="px-4 py-3 font-bold text-slate-300">Recruitment Office</td>
                                                  <td className="px-4 py-3 text-emerald-400">Active</td>
                                                  <td className="px-4 py-3">85%</td>
                                                  <td className="px-4 py-3 text-emerald-400">92%</td>
                                                  <td className="px-4 py-3 font-mono">$12.40</td>
                                                  <td className="px-4 py-3"><button className="text-xs text-indigo-400 hover:text-indigo-300">Rebalance</button></td>
                                              </tr>
                                              <tr className="border-b border-slate-800/50">
                                                  <td className="px-4 py-3 font-bold text-slate-300">Vendor Office</td>
                                                  <td className="px-4 py-3 text-emerald-400">Active</td>
                                                  <td className="px-4 py-3">45%</td>
                                                  <td className="px-4 py-3 text-emerald-400">98%</td>
                                                  <td className="px-4 py-3 font-mono">$4.20</td>
                                                  <td className="px-4 py-3"><button className="text-xs text-indigo-400 hover:text-indigo-300">Rebalance</button></td>
                                              </tr>
                                              <tr className="border-b border-slate-800/50">
                                                  <td className="px-4 py-3 font-bold text-slate-300">GTM Office</td>
                                                  <td className="px-4 py-3 text-amber-400">Spiking</td>
                                                  <td className="px-4 py-3">94%</td>
                                                  <td className="px-4 py-3 text-amber-400">76%</td>
                                                  <td className="px-4 py-3 font-mono">$24.80</td>
                                                  <td className="px-4 py-3"><button className="text-xs text-indigo-400 hover:text-indigo-300">Scale Up</button></td>
                                              </tr>
                                              <tr className="border-b border-slate-800/50">
                                                  <td className="px-4 py-3 font-bold text-slate-300">Client Office</td>
                                                  <td className="px-4 py-3 text-emerald-400">Active</td>
                                                  <td className="px-4 py-3">60%</td>
                                                  <td className="px-4 py-3 text-emerald-400">99%</td>
                                                  <td className="px-4 py-3 font-mono">$8.15</td>
                                                  <td className="px-4 py-3"><button className="text-xs text-indigo-400 hover:text-indigo-300">Rebalance</button></td>
                                              </tr>
                                          </tbody>
                                      </table>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                                      Decision Engine Loop
                                  </h4>
                                  <div className="flex items-center text-xs text-slate-400 font-mono overflow-x-auto pb-2 space-x-2">
                                      <span className="text-indigo-400">Monitor</span> <span className="text-slate-600">→</span>
                                      <span className="text-slate-300">Is Blocked?</span> <span className="text-slate-600">→</span>
                                      <span className="text-amber-400">Can Unblock?</span> <span className="text-slate-600">→</span>
                                      <span className="text-slate-300">Delegate</span> <span className="text-slate-600">→</span>
                                      <span className="text-rose-400">Approval Required?</span> <span className="text-slate-600">→</span>
                                      <span className="text-emerald-400">Improve Workflow</span>
                                  </div>
                              </div>
                          </div>
                      ) : activeCategory.includes('Office') ? (
                          <div className="space-y-6">
                              {/* Office Dashboard Sections */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 col-span-2">
                                      <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2"><Target size={14} /> 1. Mission & Objectives</h4>
                                      <p className="text-sm text-slate-300 italic mb-4">
                                          {activeCategory === 'Recruitment Office' && 'Deliver the best candidates to clients as quickly as possible while continuously improving placement success.'}
                                          {activeCategory === 'GTM Office' && 'Generate predictable revenue pipeline through targeted outreach and lead conversion.'}
                                          {activeCategory === 'Vendor Office' && 'Maximize vendor success, improve submission quality, and maintain high engagement.'}
                                          {activeCategory === 'Client Office' && 'Ensure high client satisfaction by driving hiring outcomes and requirement fulfillment.'}
                                          {activeCategory === 'Founder Office' && 'Oversee operational health, optimize costs, and predict overall business growth.'}
                                          {activeCategory === 'Platform Office' && 'Ensure 99.99% uptime, zero queue failures, and optimal latency across the OS.'}
                                          {activeCategory === 'Chief Operating Office' && 'Monitor every Office, balance workloads, detect bottlenecks, and generate operational reports.'}
                                      </p>
                                      
                                      <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                          <h5 className="text-[10px] uppercase font-bold text-slate-500 mb-2">Current OKRs</h5>
                                          <div className="space-y-2">
                                              <div className="flex justify-between items-center text-xs">
                                                  <span className="text-slate-300">Objective: Accelerate Q3 Outcomes</span>
                                                  <span className="text-emerald-400 font-bold">On Track</span>
                                              </div>
                                              <div className="w-full bg-slate-800 rounded-full h-1.5">
                                                  <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex flex-col">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Activity size={14} /> Digital Twin</h4>
                                      <div className="flex-1 flex flex-col justify-between">
                                          <div className="flex justify-between items-center mb-2 text-sm">
                                              <span className="text-slate-400">Health</span>
                                              <span className="text-emerald-400 font-bold flex items-center gap-1"><CheckCircle2 size={12}/> Healthy</span>
                                          </div>
                                          <div className="flex justify-between items-center mb-2 text-sm">
                                              <span className="text-slate-400">Capacity</span>
                                              <span className="text-slate-300 font-mono">72%</span>
                                          </div>
                                          <div className="flex justify-between items-center mb-2 text-sm">
                                              <span className="text-slate-400">AI Confidence</span>
                                              <span className="text-indigo-400 font-bold font-mono">91%</span>
                                          </div>
                                          <div className="flex justify-between items-center mb-2 text-sm">
                                              <span className="text-slate-400">Queue</span>
                                              <span className="text-amber-400 font-mono">16 items</span>
                                          </div>
                                          <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-2 mt-2">
                                              <span className="text-slate-400">Est. Completion</span>
                                              <span className="text-slate-300 font-mono">4:35 PM</span>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                      <div className="flex justify-between items-center mb-4">
                                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2"><TrendingUp size={14}/> 2. Office Scorecard</h4>
                                          <span className="bg-indigo-900/50 text-indigo-400 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-800">SCORE: 91%</span>
                                      </div>
                                      <ul className="space-y-3">
                                          <li className="flex justify-between items-center text-sm">
                                              <span className="text-slate-300">Quality Index</span>
                                              <span className="font-mono text-emerald-400 font-bold">95%</span>
                                          </li>
                                          <li className="flex justify-between items-center text-sm">
                                              <span className="text-slate-300">Velocity (SLA)</span>
                                              <span className="font-mono text-amber-400 font-bold">89%</span>
                                          </li>
                                          <li className="flex justify-between items-center text-sm">
                                              <span className="text-slate-300">Predictive Success</span>
                                              <span className="font-mono text-emerald-400 font-bold">92%</span>
                                          </li>
                                          <li className="flex justify-between items-center text-sm">
                                              <span className="text-slate-300">Daily Target</span>
                                              <span className="font-mono text-slate-400">78 / 120</span>
                                          </li>
                                      </ul>
                                  </div>
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Brain size={14}/> 3. Office Memory (Learning)</h4>
                                      <ul className="space-y-2 text-xs text-slate-400 list-disc list-inside">
                                          <li>Identified 3 top-performing vendors for technical roles.</li>
                                          <li>Detected interview failure patterns in recent submissions.</li>
                                          <li>Learned successful keywords matching recent JD patterns.</li>
                                          <li>Adjusted SLA expectations based on historical turnaround.</li>
                                      </ul>
                                      <button className="mt-4 text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 flex items-center gap-1 transition-colors">
                                          View Knowledge Graph <ArrowRight size={10} />
                                      </button>
                                  </div>
                              </div>

                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">4. Shared Skills & Capabilities</h4>
                                  <div className="flex flex-wrap gap-2">
                                      <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">Resume Parser</span>
                                      <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">Matching Engine</span>
                                      <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">Submission Generator</span>
                                      <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs rounded border border-slate-700">Interview Scheduler</span>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">5. Continuous Improvement Loop</h4>
                                  <div className="flex items-center text-xs text-slate-400 font-mono overflow-x-auto pb-2 space-x-2">
                                      <span className="text-indigo-400">Event</span> <span className="text-slate-600">→</span>
                                      <span className="text-slate-300">Decision</span> <span className="text-slate-600">→</span>
                                      <span className="text-amber-400">Skill Invoked</span> <span className="text-slate-600">→</span>
                                      <span className="text-slate-300">Execution</span> <span className="text-slate-600">→</span>
                                      <span className="text-emerald-400">Learning</span> <span className="text-slate-600">→</span>
                                      <span className="text-blue-400">Memory Saved</span> <span className="text-slate-600">→</span>
                                      <span className="text-rose-400">KPI Updated</span>
                                  </div>
                              </div>
                              
                              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
                                      6. Office Contract
                                      <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono">v1.2.0</span>
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                      <div>
                                          <h5 className="font-bold text-slate-300 mb-2">Inputs</h5>
                                          <ul className="list-disc list-inside text-slate-400 space-y-1">
                                              <li>Requirements</li>
                                              <li>Candidate Resumes</li>
                                              <li>Vendor Resumes</li>
                                              <li>Interview Feedback</li>
                                          </ul>
                                      </div>
                                      <div>
                                          <h5 className="font-bold text-slate-300 mb-2">Outputs</h5>
                                          <ul className="list-disc list-inside text-slate-400 space-y-1">
                                              <li>Matches</li>
                                              <li>Submissions</li>
                                              <li>Interview Schedules</li>
                                              <li>Candidate Coaching</li>
                                          </ul>
                                      </div>
                                      <div>
                                          <h5 className="font-bold text-slate-300 mb-2 mt-2">Events Published</h5>
                                          <ul className="list-disc list-inside text-indigo-400 space-y-1 font-mono">
                                              <li>CandidateMatched</li>
                                              <li>CandidateSubmitted</li>
                                              <li>InterviewScheduled</li>
                                              <li>CandidateRejected</li>
                                          </ul>
                                      </div>
                                      <div>
                                          <h5 className="font-bold text-slate-300 mb-2 mt-2">Events Consumed</h5>
                                          <ul className="list-disc list-inside text-emerald-400 space-y-1 font-mono">
                                              <li>RequirementCreated</li>
                                              <li>VendorUploadedResume</li>
                                              <li>InterviewFeedbackReceived</li>
                                          </ul>
                                      </div>
                                  </div>
                              </div>
                          </div>
                      ) : activeCategory.includes('Layer') ? (
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
                                              <p className="text-xs text-slate-300 font-mono">{(agent.execsToday || 0).toLocaleString()}</p>
                                          </div>
                                          <div>
                                              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">Success Rate</p>
                                              <p className={cn("text-xs font-mono", agent.success === '100%' ? "text-emerald-400" : agent.success === '--' ? "text-slate-500" : "text-amber-400")}>{agent.success}</p>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : activeCategory === 'Operations Calendar' ? (
                          <div className="space-y-6">
                              <p className="text-sm text-slate-400 mb-6">The Operations Calendar is the scheduled heartbeat of the AI Workforce OS.</p>
                              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                                  <table className="w-full text-left border-collapse">
                                      <thead>
                                          <tr className="border-b border-slate-800 bg-slate-900/50">
                                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Office</th>
                                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Task</th>
                                              <th className="py-3 px-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/50 text-sm">
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">08:30 AM</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Founder</span></td>
                                              <td className="py-3 px-4">Overnight business briefing</td>
                                              <td className="py-3 px-4 text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 size={12}/> OK</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">09:00 AM</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">GTM</span></td>
                                              <td className="py-3 px-4">Find new leads</td>
                                              <td className="py-3 px-4 text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 size={12}/> OK</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">09:05 AM</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Sales</span></td>
                                              <td className="py-3 px-4">Follow up opportunities</td>
                                              <td className="py-3 px-4 text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 size={12}/> OK</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">09:10 AM</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Recruitment</span></td>
                                              <td className="py-3 px-4">Parse resumes</td>
                                              <td className="py-3 px-4 text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 size={12}/> OK</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">09:15 AM</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Vendor</span></td>
                                              <td className="py-3 px-4">Collect bench profiles</td>
                                              <td className="py-3 px-4 text-slate-500 text-xs font-mono flex items-center gap-1">PENDING</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">Every 5 min</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">MailOS</span></td>
                                              <td className="py-3 px-4">Gmail sync</td>
                                              <td className="py-3 px-4 text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 size={12}/> RUNNING</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">Every 10 min</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Matching</span></td>
                                              <td className="py-3 px-4">Candidate matching</td>
                                              <td className="py-3 px-4 text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 size={12}/> RUNNING</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">Every 15 min</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Client</span></td>
                                              <td className="py-3 px-4">Requirement updates</td>
                                              <td className="py-3 px-4 text-emerald-400 text-xs font-mono flex items-center gap-1"><CheckCircle2 size={12}/> RUNNING</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">Every hour</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Finance</span></td>
                                              <td className="py-3 px-4">Invoice reconciliation</td>
                                              <td className="py-3 px-4 text-slate-500 text-xs font-mono flex items-center gap-1">PENDING</td>
                                          </tr>
                                          <tr className="hover:bg-slate-800/30 text-slate-300">
                                              <td className="py-3 px-4 font-mono text-indigo-400">06:00 PM</td>
                                              <td className="py-3 px-4"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs">Founder</span></td>
                                              <td className="py-3 px-4">End-of-day report</td>
                                              <td className="py-3 px-4 text-slate-500 text-xs font-mono flex items-center gap-1">PENDING</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      ) : activeCategory === 'Office Memory' ? (
                          <div className="space-y-6">
                              <p className="text-sm text-slate-400 mb-6">Offices run, learn, store memory, and improve tomorrow.</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                      <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Bot size={16} className="text-indigo-400"/> Recruitment Office Memory</h4>
                                      <ul className="space-y-2 text-xs text-slate-400">
                                          <li className="flex gap-2"><span className="text-indigo-500">•</span> Learns: Top vendors for backend roles</li>
                                          <li className="flex gap-2"><span className="text-indigo-500">•</span> Learns: Best recruiters by conversion</li>
                                          <li className="flex gap-2"><span className="text-indigo-500">•</span> Learns: Successful keywords matching JD</li>
                                          <li className="flex gap-2"><span className="text-indigo-500">•</span> Learns: Interview failure patterns</li>
                                      </ul>
                                  </div>
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                      <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Bot size={16} className="text-emerald-400"/> GTM Office Memory</h4>
                                      <ul className="space-y-2 text-xs text-slate-400">
                                          <li className="flex gap-2"><span className="text-emerald-500">•</span> Learns: Campaign open rates</li>
                                          <li className="flex gap-2"><span className="text-emerald-500">•</span> Learns: Best performing outreach messaging</li>
                                          <li className="flex gap-2"><span className="text-emerald-500">•</span> Learns: ICPs that respond fastest</li>
                                          <li className="flex gap-2"><span className="text-emerald-500">•</span> Learns: Campaign conversion history</li>
                                      </ul>
                                  </div>
                                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                                      <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Bot size={16} className="text-amber-400"/> Founder Office Memory</h4>
                                      <ul className="space-y-2 text-xs text-slate-400">
                                          <li className="flex gap-2"><span className="text-amber-500">•</span> Learns: Revenue history trends</li>
                                          <li className="flex gap-2"><span className="text-amber-500">•</span> Learns: Hiring velocity per client</li>
                                          <li className="flex gap-2"><span className="text-amber-500">•</span> Learns: Month-over-month growth patterns</li>
                                          <li className="flex gap-2"><span className="text-amber-500">•</span> Learns: Forecast accuracy deviations</li>
                                      </ul>
                                  </div>
                              </div>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-center">
                              <Bot size={48} className="text-slate-700 mb-4" />
                              <h4 className="text-slate-300 font-bold mb-2">Module Not Yet Implemented</h4>
                              <p className="text-slate-500 text-sm max-w-md">The {activeCategory} view is part of the future Agent Supervisor architecture and will be available in an upcoming release.</p>
                          </div>
                      )}
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
                              <span className="text-sm font-bold text-slate-200 font-mono">{(selectedAgent.execsToday || 0).toLocaleString()}</span>
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
                          <button onClick={handleRunNow} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors">
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
                                  {executions.length === 0 ? (
                                      <div className="p-6 text-center text-xs text-slate-500 font-mono">No executions recently</div>
                                  ) : (
                                      <table className="w-full text-left border-collapse">
                                        <tbody className="divide-y divide-slate-800/50">
                                            {executions.map(exec => (
                                                <tr key={exec.id} className="hover:bg-slate-800/30">
                                                    <td className="py-2.5 px-4">
                                                        {exec.status === 'success' ? <CheckCircle2 size={14} className="text-emerald-500"/> : <XCircle size={14} className="text-rose-500"/>}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-xs font-mono text-slate-400">
                                                        {exec.timestamp?.toDate ? exec.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-xs font-mono text-slate-500 text-right">{exec.duration}ms</td>
                                                </tr>
                                            ))}
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
