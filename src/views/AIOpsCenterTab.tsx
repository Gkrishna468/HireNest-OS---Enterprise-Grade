import React, { useState, useEffect } from "react";
import { Terminal, Database, Mail, AlertTriangle, ShieldCheck, Server, CheckCircle2, XCircle, Clock, Cpu, GitPullRequest, Activity, Brain, RefreshCw, AlertOctagon } from "lucide-react";
import { collection, getDocs, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AIOpsCenterTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(userRole);
  const [activeTab, setActiveTab] = useState<'vercel' | 'github' | 'firebase' | 'workspace' | 'incidents' | 'ai-providers'>('incidents');
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
          
          {activeTab === 'incidents' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Cpu className="text-cyan-400" /> AI Incident Agent</h3>
                <span className="text-xs font-mono text-cyan-400 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span></span> Monitoring Active</span>
              </div>
              <div className="divide-y divide-slate-800">
                {incidents.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">No incidents reported</div>
                ) : incidents.map((inc) => (
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
                          <span className="flex items-center gap-1 text-xs text-slate-500"><Clock size={12} /> {inc.createdAt ? new Date(inc.createdAt.seconds * 1000).toLocaleString() : 'Unknown'}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{inc.issue || inc.message}</h4>
                        {inc.status === 'investigating' && (
                          <div className="mt-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Root Cause</span>
                                    <span className="text-xs text-slate-300">{inc.rootCause || 'Under investigation'}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Suggested Fix</span>
                                    <span className="text-xs text-slate-300">{inc.fix || 'Pending analysis'}</span>
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Auto-Remediation Status</span>
                                    <span className={cn("text-xs font-mono", inc.remediation?.includes('Progress') ? "text-cyan-400" : inc.remediation?.includes('Human') ? "text-amber-400" : "text-emerald-400")}>{inc.remediation || 'Not triggered'}</span>
                                </div>
                            </div>
                            <div className="mt-3 flex gap-2">
                              {inc.remediation?.includes('Human') ? (
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

          {activeTab === 'firebase' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Activity className="text-amber-400" /> Firebase Platform Diagnostics</h3>
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-2"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span> System Operational</span>
              </div>
              
              {!diagnostics ? (
                <div className="py-8 text-center text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Diagnostics...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(diagnostics).map(([key, val]: [string, any]) => (
                     <div key={key} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                         <div className="flex items-center justify-between">
                             <span className="text-xs font-bold text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                             <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">{val === true ? 'Healthy' : val === false ? 'Degraded' : 'Active'}</span>
                         </div>
                         <span className="text-xs text-slate-500 font-mono mt-1">{typeof val === 'boolean' ? (val ? 'Operational' : 'Error') : JSON.stringify(val)}</span>
                     </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab !== 'incidents' && activeTab !== 'firebase' && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle size={48} className="text-slate-700 mb-4" />
                <h4 className="text-slate-300 font-bold mb-2">Metrics Pending</h4>
                <p className="text-slate-500 text-sm max-w-md">Live operational data for {activeTab} is not currently reporting to the central bus.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
