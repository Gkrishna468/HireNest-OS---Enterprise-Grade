import React, { useState, useEffect } from "react";
import { Terminal, Database, Mail, AlertTriangle, ShieldCheck, Server, CheckCircle2, XCircle, Clock, Cpu, GitPullRequest, Activity, Brain, RefreshCw, AlertOctagon } from "lucide-react";
import { collection, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AIOpsCenterTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(userRole);
  const [activeTab, setActiveTab] = useState<'vercel' | 'github' | 'firebase' | 'workspace' | 'incidents' | 'agents' | 'ai-providers'>('ai-providers');
  const [loading, setLoading] = useState(true);
  const [workspaceDetails, setWorkspaceDetails] = useState<any>(null);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [agentExecutions, setAgentExecutions] = useState<any[]>([]);
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/admin?action=diagnostics', {
           headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setDiagnostics(data);
      } catch (err) {
        console.error("Failed to fetch diagnostics", err);
      }
    };
    if (isAdmin && activeTab === 'firebase') {
      fetchDiagnostics();
    }
  }, [isAdmin, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    const q1 = query(collection(db, "incident_logs"), orderBy("createdAt", "desc"), limit(50));
    const unsub1 = onSnapshot(q1, (snap) => {
      setIncidents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const q2 = query(collection(db, "agent_executions"), orderBy("createdAt", "desc"), limit(100));
    const unsub2 = onSnapshot(q2, (snap) => {
      setAgentExecutions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [isAdmin]);

  useEffect(() => {
    const fetchWorkspace = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;
        
        const res = await fetch('/api/workspace/status', {
           headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setWorkspaceDetails(data);
      } catch (err) {
        console.error("Failed to fetch workspace details", err);
      }
    };
    if (activeTab === 'workspace') {
      fetchWorkspace();
    }
  }, [activeTab]);

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HQ
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-y-auto text-slate-300">
      <div className="px-8 py-8 border-b border-slate-800 bg-slate-900 flex justify-between items-end relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <Terminal size={200} className="text-cyan-400" />
        </div>
        <div className="relative z-10 w-full flex justify-between items-end">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Terminal className="text-cyan-400" size={28} />
              <h1 className="text-3xl font-black text-white tracking-tighter">AI DevOps & Operations</h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">Autonomous environment compliance, log analysis, and incident remediation.</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700 flex flex-col items-end">
               <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Production Status</div>
               <div className="text-lg font-black text-white flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-400" /> All Systems Nominal</div>
             </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
        {/* Navigation Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('agents')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'agents' ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <Brain size={16} /> Autonomous Agents
          </button>
          <button 
            onClick={() => setActiveTab('incidents')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'incidents' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <AlertTriangle size={16} /> Incident Agent
          </button>
          <button 
            onClick={() => setActiveTab('vercel')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'vercel' ? "bg-slate-100 text-slate-900 border border-slate-200" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <Server size={16} /> Vercel MCP
          </button>
          <button 
            onClick={() => setActiveTab('github')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'github' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <GitPullRequest size={16} /> GitHub MCP
          </button>
          <button 
            onClick={() => setActiveTab('firebase')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'firebase' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <Database size={16} /> Firebase Diagnostics
          </button>
          <button 
            onClick={() => setActiveTab('ai-providers')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'ai-providers' ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <Activity size={16} /> Provider Health
          </button>
          <button 
            onClick={() => setActiveTab('workspace')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'workspace' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <Mail size={16} /> Workspace Health
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[400px]">
          
          {activeTab === 'agents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Brain className="text-violet-400" /> Agent Runtime Engine</h3>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Event Bus Connected</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><Activity size={14} className="text-indigo-400"/> Job Queue</h4>
                          <span className="text-xs font-mono text-slate-300">0 Pending</span>
                      </div>
                      <div className="text-center py-6">
                          <CheckCircle2 size={32} className="mx-auto text-slate-700 mb-2"/>
                          <p className="text-xs text-slate-500">All jobs processed.</p>
                      </div>
                  </div>
                  
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><RefreshCw size={14} className="text-amber-400"/> Retry Queue</h4>
                          <span className="text-xs font-mono text-amber-400">1 Retrying</span>
                      </div>
                      <div className="space-y-3">
                          <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg flex flex-col gap-1">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Resume Parser</span>
                              <span className="text-xs text-slate-500 font-mono line-clamp-1">Rate limit exceeded</span>
                              <div className="flex justify-between items-center mt-2">
                                  <span className="text-[10px] font-bold text-amber-500">Attempt 2/3</span>
                                  <span className="text-[10px] text-slate-600 font-mono">T-4:12</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                      <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
                          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><AlertOctagon size={14} className="text-rose-400"/> Dead Letter Queue</h4>
                          <span className="text-xs font-mono text-slate-300">0 Failed</span>
                      </div>
                      <div className="text-center py-6">
                          <ShieldCheck size={32} className="mx-auto text-slate-700 mb-2"/>
                          <p className="text-xs text-slate-500">DLQ is empty.</p>
                      </div>
                  </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mb-8">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                    <h4 className="text-sm font-bold text-slate-200">Background Scheduler</h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">Running</span>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trigger</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Executions</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {[
                      { schedule: 'Event: EMAIL_RECEIVED', name: 'Mail Sync Agent', status: 'Idle', execs: 412, duration: '1.2s' },
                      { schedule: 'Event: REQUIREMENT_CREATED', name: 'Matching Engine', status: 'Idle', execs: 341, duration: '4.5s' },
                      { schedule: 'Event: REQUIREMENT_CREATED', name: 'Vendor Broadcast', status: 'Idle', execs: 94, duration: '850ms' },
                      { schedule: 'Event: RESUME_UPLOADED', name: 'Resume Parser', status: 'Idle', execs: 856, duration: '2.1s' },
                      { schedule: 'Cron: Every 30 min', name: 'Interview Agent', status: 'Idle', execs: 42, duration: '400ms' },
                      { schedule: 'Cron: Every 1 hour', name: 'Incident Agent', status: 'Running', execs: 24, duration: '5.2s' },
                      { schedule: 'Cron: 6:00 PM', name: 'Founder Report Agent', status: 'Scheduled', execs: 1, duration: '12s' }
                    ].map((agent, i) => (
                      <tr key={i} className="hover:bg-slate-800/50">
                        <td className="py-4 px-6 text-xs text-slate-400 font-mono">{agent.schedule}</td>
                        <td className="py-4 px-6 text-sm font-bold text-slate-200">{agent.name}</td>
                        <td className="py-4 px-6">
                           <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border whitespace-nowrap", agent.status === 'Running' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : agent.status === 'Idle' ? "bg-slate-800 text-slate-400 border-slate-700" : "bg-blue-500/10 text-blue-400 border-blue-500/20")}>
                             {agent.status}
                           </span>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-300 font-mono">{agent.execs.toLocaleString()}</td>
                        <td className="py-4 px-6 text-xs text-slate-400 font-mono">{agent.duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Execution History</h4>
              <div className="divide-y divide-slate-800">
                {agentExecutions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No execution history found</div>
                ) : agentExecutions.slice(0, 15).map(exec => (
                  <div key={exec.id} className="py-4 flex items-start justify-between">
                    <div className="flex gap-4 w-full">
                      <div className="mt-1">
                        {exec.status === 'running' || exec.status === 'pending' || exec.status === 'RUNNING' ? <Activity className="text-amber-400 animate-pulse" size={20} /> : (exec.status === 'failed' || exec.status === 'error' || exec.status === 'Failed' ? <XCircle className="text-rose-400" size={20} /> : <CheckCircle2 className="text-emerald-400" size={20} />)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-500">{exec.id.substring(0,8)}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{exec.agentName || exec.agent || exec.agentType || 'Unknown Agent'}</span>
                          {exec.duration !== undefined && <span className="text-[10px] font-mono text-slate-500">{exec.duration}ms</span>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{exec.task || exec.description || 'Routine Task execution'}</h4>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-3 mb-2">
                           <span className="flex items-center gap-1"><Clock size={12} /> {exec.createdAt ? new Date(exec.createdAt?.seconds * 1000).toLocaleString() : exec.finishedAt ? new Date(exec.finishedAt?.seconds * 1000).toLocaleString() : 'Unknown time'}</span>
                           {exec.recordsProcessed !== undefined && <span className="flex items-center gap-1"><ShieldCheck size={12} /> Processed: {exec.recordsProcessed}</span>}
                        </div>
                        {(exec.error || exec.errorDetails || exec.logs) && (
                          <div className="mt-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                            {(exec.error || exec.errorDetails) && <p className="text-xs text-rose-400 font-mono mb-2">{exec.error || exec.errorDetails}</p>}
                            {exec.logs && <p className="text-xs text-slate-400 font-mono line-clamp-3 leading-relaxed">{exec.logs}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'incidents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Cpu className="text-cyan-400" /> AI Incident Agent</h3>
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span> Monitoring Active</span>
              </div>
              <div className="divide-y divide-slate-800">
                {[
                  { id: 'INC-904', service: 'Gmail Watch', severity: 'medium', issue: 'Gmail Watch webhook expired', time: '2 mins ago', status: 'investigating', rootCause: '7-day token expiration reached', fix: 'Renew push notification channel via Gmail API', remediation: 'In Progress (Attempt 1)' },
                  { id: 'INC-903', service: 'Firebase', severity: 'low', issue: 'Firestore quota warning', time: '1 hour ago', status: 'resolved', rootCause: 'Burst traffic from Vendor Broadcast', fix: 'Applied rate limiting and pagination', remediation: 'Completed automatically' },
                  { id: 'INC-902', service: 'Vercel', severity: 'high', issue: 'Deployment failed', time: '3 hours ago', status: 'investigating', rootCause: 'Missing environment variable OPENAI_API_KEY', fix: 'Add key to Vercel production environment', remediation: 'Requires Human Approval' },
                  { id: 'INC-901', service: 'AI Provider', severity: 'high', issue: 'Gemini API timeout', time: '5 hours ago', status: 'resolved', rootCause: 'Provider latency spiked > 2000ms', fix: 'Triggered failover to OpenAI', remediation: 'Completed automatically' }
                ].map((inc) => (
                  <div key={inc.id} className="py-4 flex items-start justify-between">
                    <div className="flex gap-4 w-full">
                      <div className="mt-1">
                        {inc.status === 'investigating' ? <Activity className="text-amber-400 animate-pulse" size={20} /> : <CheckCircle2 className="text-emerald-400" size={20} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500">{inc.id}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{inc.service}</span>
                            {inc.severity === 'high' && <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">High Severity</span>}
                            {inc.severity === 'medium' && <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">Medium Severity</span>}
                          </div>
                          <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={12} /> {inc.time}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{inc.issue}</h4>
                        {inc.status === 'investigating' && (
                          <div className="mt-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Root Cause</span>
                                    <span className="text-xs text-slate-300">{inc.rootCause}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Suggested Fix</span>
                                    <span className="text-xs text-slate-300">{inc.fix}</span>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Auto-Remediation Status</span>
                                    <span className={cn("text-xs font-mono", inc.remediation.includes('Progress') ? "text-cyan-400" : inc.remediation.includes('Human') ? "text-amber-400" : "text-emerald-400")}>{inc.remediation}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              {inc.remediation.includes('Human') ? (
                                <button className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">Apply Auto-Fix</button>
                              ) : (
                                <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors">Acknowledge</button>
                              )}
                              <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors">View Trace</button>
                            </div>
                          </div>
                        )}
                        {inc.status === 'resolved' && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle2 size={12}/> Resolved</span>
                                <span className="text-xs text-slate-500 font-mono">({inc.remediation})</span>
                            </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ai-providers' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Activity className="text-fuchsia-400" /> AI Provider Command Center</h3>
                <span className="text-xs font-mono text-slate-500">Auto-refreshing</span>
              </div>
              
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mb-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Provider</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latency</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Daily Cost</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quota</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Failover</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-slate-800/50">
                      <td className="py-4 px-6 text-sm font-bold text-slate-200">Gemini</td>
                      <td className="py-4 px-6"><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Healthy</span></td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">120 ms</td>
                      <td className="py-4 px-6 text-sm text-emerald-400 font-mono">₹</td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">72%</td>
                      <td className="py-4 px-6 text-xs text-slate-400">OpenAI</td>
                    </tr>
                    <tr className="hover:bg-slate-800/50">
                      <td className="py-4 px-6 text-sm font-bold text-slate-200">OpenAI</td>
                      <td className="py-4 px-6"><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Healthy</span></td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">90 ms</td>
                      <td className="py-4 px-6 text-sm text-amber-400 font-mono">₹₹</td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">38%</td>
                      <td className="py-4 px-6 text-xs text-slate-400">Anthropic</td>
                    </tr>
                    <tr className="hover:bg-slate-800/50">
                      <td className="py-4 px-6 text-sm font-bold text-slate-200">Anthropic</td>
                      <td className="py-4 px-6"><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Healthy</span></td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">180 ms</td>
                      <td className="py-4 px-6 text-sm text-amber-400 font-mono">₹₹</td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">55%</td>
                      <td className="py-4 px-6 text-xs text-slate-400">Groq</td>
                    </tr>
                    <tr className="hover:bg-slate-800/50">
                      <td className="py-4 px-6 text-sm font-bold text-slate-200">Groq</td>
                      <td className="py-4 px-6"><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-max"><CheckCircle2 size={12}/> Healthy</span></td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">18 ms</td>
                      <td className="py-4 px-6 text-sm text-emerald-400 font-mono">₹</td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">81%</td>
                      <td className="py-4 px-6 text-xs text-slate-400">Gemini</td>
                    </tr>
                    <tr className="hover:bg-slate-800/50">
                      <td className="py-4 px-6 text-sm font-bold text-slate-200">ElevenLabs</td>
                      <td className="py-4 px-6"><span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-max"><AlertTriangle size={12}/> Degraded</span></td>
                      <td className="py-4 px-6 text-sm text-amber-400 font-mono">430 ms</td>
                      <td className="py-4 px-6 text-sm text-emerald-400 font-mono">₹</td>
                      <td className="py-4 px-6 text-sm text-slate-400 font-mono">64%</td>
                      <td className="py-4 px-6 text-xs text-slate-400">Retry</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">Provider Failover Matrix</h4>
                    <p className="text-xs text-slate-500 mb-4">Traffic will automatically route to backup providers if latency exceeds 500ms or 5xx errors are encountered.</p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-lg">
                            <span className="text-xs font-bold text-slate-400">Primary Router</span>
                            <span className="text-xs text-emerald-400 font-mono">Active (Gemini First)</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-lg">
                            <span className="text-xs font-bold text-slate-400">Fallback Policy</span>
                            <span className="text-xs text-slate-400 font-mono">Fail-fast (Timeout: 2000ms)</span>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">Key Management Vault</h4>
                    <p className="text-xs text-slate-500 mb-4">Secure environment variables synced from Secret Manager.</p>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-lg">
                            <span className="text-xs font-bold text-slate-400">GEMINI_API_KEY</span>
                            <span className="text-xs text-emerald-400 font-mono">Valid (Rotated 12d ago)</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-slate-950 border border-slate-800 rounded-lg">
                            <span className="text-xs font-bold text-slate-400">OPENAI_API_KEY</span>
                            <span className="text-xs text-amber-400 font-mono">Valid (Rotates in 3d)</span>
                        </div>
                    </div>
                </div>
              </div>

            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Server className="text-slate-400" /> Vercel MCP</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">Disconnected</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center h-[300px] flex flex-col justify-center">
                <Server size={48} className="mx-auto text-slate-700 mb-4" />
                <h4 className="text-slate-300 font-bold mb-2">Connect Vercel</h4>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">Integration is pending. Once connected, this panel will display Deployments, Build Status, Runtime Errors, Function Failures, Environment Drift, Deployment Duration, and Production vs Preview parity.</p>
                <button className="mx-auto px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold shadow-sm hover:bg-slate-100 transition-colors">Connect to Vercel</button>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><GitPullRequest className="text-indigo-400" /> GitHub MCP</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">Disconnected</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center h-[300px] flex flex-col justify-center">
                <GitPullRequest size={48} className="mx-auto text-slate-700 mb-4" />
                <h4 className="text-slate-300 font-bold mb-2">Connect GitHub</h4>
                <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">Integration is pending. Once connected, this dashboard will monitor Latest Commits, Pull Requests, Security Alerts, Dependabot Alerts, Open Issues, Code Scanning, Branch Protection, Contributors, and Release History.</p>
                <button className="mx-auto px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-colors">Connect to GitHub</button>
              </div>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Database className="text-amber-400" /> Firebase Platform Diagnostics</h3>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> System Operational</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { name: 'Firestore Connectivity', status: 'Healthy', val: '24ms latency' },
                  { name: 'Authentication', status: 'Healthy', val: '0 failed logins/1h' },
                  { name: 'Cloud Storage', status: 'Healthy', val: '1.2GB used' },
                  { name: 'Cloud Functions', status: 'Healthy', val: '99.9% success' },
                  { name: 'Collections', status: 'Healthy', val: '14 Active' },
                  { name: 'Indexes', status: 'Healthy', val: '32 Built' },
                  { name: 'Reads/Writes', status: 'Healthy', val: '1.2k R / 340 W (1h)' },
                  { name: 'Slow Queries', status: 'Healthy', val: '0 detected' },
                  { name: 'Failed Writes', status: 'Healthy', val: '0 detected' },
                  { name: 'Security Rules', status: 'Healthy', val: 'v24 applied' },
                  { name: 'Service Account', status: 'Healthy', val: 'Valid' },
                ].map((item, i) => (
                   <div key={i} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                       <div className="flex items-center justify-between">
                           <span className="text-xs font-bold text-slate-300">{item.name}</span>
                           <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{item.status}</span>
                       </div>
                       <span className="text-xs text-slate-500 font-mono mt-1">{item.val}</span>
                   </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Mail className="text-blue-400" /> Google Workspace Integration</h3>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> Pub/Sub Connected</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-2 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-900 border-b border-slate-800">
                                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Service API</th>
                                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latency</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {[
                                { name: 'Gmail API', status: 'Connected', latency: '124ms' },
                                { name: 'Calendar API', status: 'Connected', latency: '185ms' },
                                { name: 'OAuth Token Vault', status: 'Secure', latency: '<10ms' },
                                { name: 'Gmail Watch (Push)', status: 'Active', latency: 'N/A' },
                                { name: 'Pub/Sub Webhook', status: 'Healthy', latency: '45ms' }
                            ].map((row, i) => (
                                <tr key={i} className="hover:bg-slate-800/50">
                                    <td className="py-4 px-6 text-sm font-bold text-slate-300">{row.name}</td>
                                    <td className="py-4 px-6">
                                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{row.status}</span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-400 font-mono">{row.latency}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Mail Processing Queue</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Queue Length</span>
                                <span className="text-sm font-bold text-emerald-400 font-mono">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Processing Latency</span>
                                <span className="text-sm font-bold text-slate-200 font-mono">312ms avg</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Failed Emails</span>
                                <span className="text-sm font-bold text-emerald-400 font-mono">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Last Processed</span>
                                <span className="text-xs font-bold text-slate-200 font-mono">2 min ago</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4">Quota Utilization</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-slate-400">Gmail Quota</span>
                                    <span className="text-xs font-bold text-slate-200 font-mono">1.2%</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full w-[1.2%]"></div></div>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-slate-400">Calendar Quota</span>
                                    <span className="text-xs font-bold text-slate-200 font-mono">0.4%</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full w-[0.4%]"></div></div>
                            </div>
                        </div>
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
