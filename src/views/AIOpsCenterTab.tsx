import React, { useState, useEffect } from "react";
import { Terminal, Database, Mail, AlertTriangle, ShieldCheck, Server, CheckCircle2, XCircle, Clock, Cpu, GitPullRequest, Activity, Brain } from "lucide-react";
import { collection, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AIOpsCenterTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(userRole);
  const [activeTab, setActiveTab] = useState<'vercel' | 'github' | 'firebase' | 'workspace' | 'incidents' | 'agents'>('agents');
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
            onClick={() => setActiveTab('workspace')}
            className={cn("px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors flex items-center gap-2 whitespace-nowrap", activeTab === 'workspace' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" : "bg-slate-900 text-slate-500 border border-slate-800 hover:bg-slate-800")}
          >
            <Mail size={16} /> Workspace Health
          </button>
        </div>

        {/* Dynamic Content */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 min-h-[400px]">
          
          {activeTab === 'agents' && (() => {
            const agentList = [
              'Requirement Extraction Agent', 'Resume Parser', 'Vendor Broadcast', 
              'Matching Engine', 'Interview Agent', 'Finance Agent', 'Mail Sync Agent'
            ];
            const groupedAgents = agentList.map(name => {
              const runs = agentExecutions.filter(a => (a.agentName === name) || (a.agentType === name) || (a.agentName?.includes(name)));
              const total = runs.length;
              const success = runs.filter(a => a.status === 'completed' || a.status === 'success').length;
              const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
              const avgDuration = total > 0 ? Math.round(runs.reduce((acc, curr) => acc + (curr.duration || 0), 0) / total) : 0;
              const lastExecution = runs[0];
              const lastError = runs.find(a => a.status === 'failed' || a.status === 'error');
              return { name, total, successRate, avgDuration, lastExecution, lastError };
            });

            return (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Brain className="text-violet-400" /> AI Operations Console</h3>
                <span className="text-xs font-mono text-slate-500">Auto-refreshing (collection: agent_executions)</span>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden mb-8">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800">
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Agent</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Executions</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Success Rate</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Avg Time</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Last Run</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {groupedAgents.map(agent => (
                      <tr key={agent.name} className="hover:bg-slate-800/50">
                        <td className="py-4 px-6">
                          <div className="text-sm font-bold text-slate-200 flex items-center gap-2">
                             {agent.name}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-300 font-mono">{agent.total}</td>
                        <td className="py-4 px-6">
                           <span className={cn("text-xs font-bold", agent.successRate >= 90 ? "text-emerald-400" : agent.successRate >= 50 ? "text-amber-400" : agent.total === 0 ? "text-slate-500" : "text-rose-400")}>
                             {agent.total > 0 ? `${agent.successRate}%` : '--'}
                           </span>
                        </td>
                        <td className="py-4 px-6 text-sm text-slate-400 font-mono">{agent.total > 0 ? `${agent.avgDuration}ms` : '--'}</td>
                        <td className="py-4 px-6 text-xs text-slate-400">
                          {agent.lastExecution?.createdAt ? new Date(agent.lastExecution.createdAt?.seconds * 1000).toLocaleString() : 'Never'}
                        </td>
                        <td className="py-4 px-6">
                          {agent.total === 0 ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-800 text-slate-500">Standby</span>
                          ) : agent.lastError && (!agent.lastExecution || agent.lastError.id === agent.lastExecution.id) ? (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">Failing</span>
                          ) : (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Healthy</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <h4 className="text-sm font-bold text-slate-300 mb-4 uppercase tracking-wider">Recent Executions</h4>
              <div className="divide-y divide-slate-800">
                {agentExecutions.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No agent executions found</div>
                ) : agentExecutions.slice(0, 15).map(exec => (
                  <div key={exec.id} className="py-4 flex items-start justify-between">
                    <div className="flex gap-4 w-full">
                      <div className="mt-1">
                        {exec.status === 'running' || exec.status === 'pending' ? <Activity className="text-amber-400 animate-pulse" size={20} /> : (exec.status === 'failed' || exec.status === 'error' ? <XCircle className="text-rose-400" size={20} /> : <CheckCircle2 className="text-emerald-400" size={20} />)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-500">{exec.id.substring(0,8)}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{exec.agentName || exec.agentType || 'Unknown Agent'}</span>
                          {exec.duration !== undefined && <span className="text-[10px] font-mono text-slate-500">{exec.duration}ms</span>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{exec.task || exec.description || 'Routine Task execution'}</h4>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                           <span className="flex items-center gap-1"><Clock size={12} /> {exec.createdAt ? new Date(exec.createdAt?.seconds * 1000).toLocaleString() : 'Unknown time'}</span>
                           {exec.targetId && <span className="flex items-center gap-1"><ShieldCheck size={12} /> Target: {exec.targetId}</span>}
                        </div>
                        {(exec.error || exec.logs) && (
                          <div className="mt-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                            {exec.error && <p className="text-xs text-rose-400 font-mono mb-2">{exec.error}</p>}
                            {exec.logs && <p className="text-xs text-slate-400 font-mono line-clamp-3 leading-relaxed">{exec.logs}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )})()}

          {activeTab === 'incidents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Cpu className="text-cyan-400" /> Active Triage</h3>
                <span className="text-xs font-mono text-slate-500">Auto-refreshing</span>
              </div>
              <div className="divide-y divide-slate-800">
                {incidents.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No incidents found</div>
                ) : incidents.map(inc => (
                  <div key={inc.id} className="py-4 flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="mt-1">
                        {inc.status === 'investigating' ? <Activity className="text-amber-400 animate-pulse" size={20} /> : <CheckCircle2 className="text-emerald-400" size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-500">{inc.displayId || inc.id.substring(0,8)}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{inc.service || 'System'}</span>
                          {inc.severity === 'high' && <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">High Severity</span>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{inc.issue || inc.title}</h4>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                           <span className="flex items-center gap-1"><Clock size={12} /> {inc.time || new Date(inc.createdAt?.seconds * 1000).toLocaleString() || 'Unknown time'}</span>
                           <span className="flex items-center gap-1"><ShieldCheck size={12} /> Owned by {inc.owner || 'System'}</span>
                        </div>
                        {inc.status === 'investigating' && (
                          <div className="mt-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 mb-2">AI Diagnostic Summary</div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              {inc.diagnosticSummary || "Diagnostic summary pending..."}
                            </p>
                            <div className="mt-3 flex gap-2">
                              <button className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors">Apply Auto-Fix</button>
                              <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold px-4 py-2 rounded-lg transition-colors">View Trace</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'vercel' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Server className="text-slate-400" /> Vercel Telemetry</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">Status: Not Connected</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-[200px]">
                 <Server className="text-slate-700 mb-4" size={32} />
                 <h4 className="text-sm font-bold text-slate-400 mb-1">Vercel MCP Disconnected</h4>
                 <p className="text-xs text-slate-500 max-w-md">Deployment Status, Build Failures, Runtime Errors, P95 Latency, and Environment Drift will be available once Vercel MCP is integrated.</p>
              </div>
            </div>
          )}

          {activeTab === 'github' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><GitPullRequest className="text-indigo-400" /> Repository Intelligence</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">Status: Not Connected</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-[200px]">
                 <GitPullRequest className="text-slate-700 mb-4" size={32} />
                 <h4 className="text-sm font-bold text-slate-400 mb-1">GitHub MCP Disconnected</h4>
                 <p className="text-xs text-slate-500 max-w-md">PR Count, Open Issues, Security Alerts, and Code Search Results will be available once GitHub MCP is integrated.</p>
              </div>
            </div>
          )}

          {activeTab === 'firebase' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2"><Database className="text-amber-400" /> Firestore Diagnostics</h3>
              <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-950 border-b border-slate-800">
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Collection</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Record Count</th>
                     <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Size</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-800">
                   {diagnostics ? (
                     <>
                       <tr className="hover:bg-slate-800/50">
                         <td className="py-4 px-6 text-sm font-mono text-slate-300">Database Status</td>
                         <td className="py-4 px-6">
                           <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border", diagnostics.status === 'operational' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                             {diagnostics.status}
                           </span>
                         </td>
                         <td className="py-4 px-6 text-sm text-slate-400">-</td>
                         <td className="py-4 px-6 text-sm text-slate-400">-</td>
                       </tr>
                       <tr className="hover:bg-slate-800/50">
                         <td className="py-4 px-6 text-sm font-mono text-slate-300">Firebase Auth</td>
                         <td className="py-4 px-6">
                           <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border", diagnostics.auth === 'healthy' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                             {diagnostics.auth}
                           </span>
                         </td>
                         <td className="py-4 px-6 text-sm text-slate-400">-</td>
                         <td className="py-4 px-6 text-sm text-slate-400">-</td>
                       </tr>
                       <tr className="hover:bg-slate-800/50">
                         <td className="py-4 px-6 text-sm font-mono text-slate-300">Service Account</td>
                         <td className="py-4 px-6">
                           <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border", diagnostics.serviceAccount === 'configured' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20")}>
                             {diagnostics.serviceAccount}
                           </span>
                         </td>
                         <td className="py-4 px-6 text-sm text-slate-400">-</td>
                         <td className="py-4 px-6 text-sm text-slate-400">-</td>
                       </tr>
                     </>
                   ) : (
                     <tr><td colSpan={4} className="py-4 px-6 text-center text-slate-500 text-xs">Loading diagnostics...</td></tr>
                   )}
                 </tbody>
               </table>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Mail className="text-blue-400" /> Workspace Health Center</h3>
                <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border", workspaceDetails?.connected ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-800 text-slate-400 border-slate-700")}>
                  Status: {workspaceDetails?.connected ? "Connected" : "Not Connected"}
                </span>
              </div>
              
              {!workspaceDetails ? (
                 <div className="bg-slate-950 border border-slate-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-[200px]">
                    <Activity className="text-slate-700 mb-4 animate-spin" size={32} />
                    <h4 className="text-sm font-bold text-slate-400 mb-1">Verifying connection...</h4>
                 </div>
              ) : !workspaceDetails.connected ? (
                 <div className="bg-slate-950 border border-slate-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-[200px]">
                    <Mail className="text-slate-700 mb-4" size={32} />
                    <h4 className="text-sm font-bold text-slate-400 mb-1">Google Workspace Disconnected</h4>
                    <p className="text-xs text-slate-500 max-w-md mb-4">Workspace is currently disconnected. Manage your connections in the Integrations settings.</p>
                 </div>
              ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                       <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><CheckCircle2 className="text-emerald-500" size={16} /> Google Workspace Health</h4>
                       <div className="space-y-4">
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Account</p>
                             <p className="text-sm font-mono text-slate-300">{workspaceDetails.emailAddress || 'Unknown'}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Gmail API</p>
                             <p className={cn("text-sm", workspaceDetails.gmail ? "text-emerald-400" : "text-rose-400")}>{workspaceDetails.gmail ? "Healthy" : "Failed"}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Calendar API</p>
                             <p className={cn("text-sm", workspaceDetails.calendar ? "text-emerald-400" : "text-amber-400")}>{workspaceDetails.calendar ? "Healthy" : "Not Found"}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">OAuth Token</p>
                             <p className="text-sm text-emerald-400">Valid</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Watch Status (Pub/Sub)</p>
                             {workspaceDetails.watchStatus ? (
                                <div>
                                    <p className="text-sm text-emerald-400">Running</p>
                                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                        <Clock size={12} /> {workspaceDetails.watchRemainingHours} hours remaining
                                    </p>
                                </div>
                             ) : (
                                <div>
                                    <p className="text-sm text-rose-400">Failed</p>
                                    <p className="text-xs text-rose-500/70 mt-1 break-all bg-rose-500/10 p-2 rounded border border-rose-500/20 font-mono">
                                        {typeof workspaceDetails.watchError === 'object' ? JSON.stringify(workspaceDetails.watchError) : (workspaceDetails.watchError || 'Unknown Error')}
                                    </p>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                       <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2"><Activity className="text-blue-400" size={16} /> Mail Pipeline Diagnostics</h4>
                       <div className="space-y-4">
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Pipeline Status</p>
                             <p className={cn("text-sm", workspaceDetails.mailSync?.status === 'healthy' ? "text-emerald-400" : "text-amber-400")}>
                               {workspaceDetails.mailSync?.status === 'healthy' ? 'Active' : 'Awaiting First Sync'}
                             </p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Last History ID</p>
                             <p className="text-sm font-mono text-slate-300">{workspaceDetails.mailSync?.lastHistoryId || 'N/A'}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Last Pub/Sub Event</p>
                             <p className="text-sm text-slate-300">{workspaceDetails.mailSync?.lastPubSubMessage ? new Date(workspaceDetails.mailSync.lastPubSubMessage).toLocaleString() : 'N/A'}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Last Sync Processing</p>
                             <p className="text-sm text-slate-300">{workspaceDetails.mailSync?.lastSync ? new Date(workspaceDetails.mailSync.lastSync).toLocaleString() : 'N/A'}</p>
                          </div>
                          <div>
                             <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Webhook Health</p>
                             <p className="text-sm text-emerald-400">Standing By</p>
                          </div>
                       </div>
                    </div>
                 </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
