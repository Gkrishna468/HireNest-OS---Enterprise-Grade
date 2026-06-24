import React, { useState, useEffect } from "react";
import { Terminal, Database, Mail, AlertTriangle, ShieldCheck, Server, CheckCircle2, XCircle, Clock, Cpu, GitPullRequest, Activity } from "lucide-react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";

export default function AIOpsCenterTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(userRole);
  const [activeTab, setActiveTab] = useState<'vercel' | 'github' | 'firebase' | 'workspace' | 'incidents'>('incidents');
  const [loading, setLoading] = useState(true);

  // Simulated AI DevOps telemetry
  const incidents = [
    { id: "INC-902", service: "Vercel / Next.js", issue: "Memory limit exceeded on API Route /api/match-engine", severity: "high", status: "investigating", time: "10 mins ago", owner: "AI Diagnostic Agent" },
    { id: "INC-901", service: "Firebase Auth", issue: "Spike in OAuth token refresh failures", severity: "medium", status: "resolved", time: "2 hours ago", owner: "System" },
  ];

  const vercelMetrics = {
    status: "Healthy",
    deployments: 24,
    lastDeploy: "12 mins ago",
    errors: 12,
    p95Latency: "240ms"
  };

  const githubMetrics = {
    openPRs: 4,
    recentCommits: 32,
    securityAlerts: 0,
    lastAudit: "Just now"
  };

  const firebaseHealth = [
    { collection: "system_events", status: "Healthy", count: "1.2M", size: "2.4 GB" },
    { collection: "match_opportunities", status: "Warning: Missing Index", count: "450K", size: "1.1 GB" },
    { collection: "placements", status: "Healthy", count: "12K", size: "140 MB" }
  ];

  const workspaceHealth = {
    gmailSyncRate: "99.8%",
    oauthFailures: "0.2%",
    calendarSyncQueue: 4,
    pubsubStatus: "Connected"
  };

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

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
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Cpu className="text-cyan-400" /> Active Triage</h3>
                <span className="text-xs font-mono text-slate-500">Auto-refreshing</span>
              </div>
              <div className="divide-y divide-slate-800">
                {incidents.map(inc => (
                  <div key={inc.id} className="py-4 flex items-start justify-between">
                    <div className="flex gap-4">
                      <div className="mt-1">
                        {inc.status === 'investigating' ? <Activity className="text-amber-400 animate-pulse" size={20} /> : <CheckCircle2 className="text-emerald-400" size={20} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs text-slate-500">{inc.id}</span>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-0.5 rounded">{inc.service}</span>
                          {inc.severity === 'high' && <span className="text-[10px] font-bold uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">High Severity</span>}
                        </div>
                        <h4 className="text-sm font-bold text-slate-200">{inc.issue}</h4>
                        <div className="text-xs text-slate-500 mt-2 flex items-center gap-3">
                           <span className="flex items-center gap-1"><Clock size={12} /> {inc.time}</span>
                           <span className="flex items-center gap-1"><ShieldCheck size={12} /> Owned by {inc.owner}</span>
                        </div>
                        {inc.status === 'investigating' && (
                          <div className="mt-4 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-500 mb-2">AI Diagnostic Summary</div>
                            <p className="text-xs text-slate-400 leading-relaxed">
                              Memory profile indicates unbounded Firestore query on `requirements_public`. Recommending immediate deployment of composite index and `.limit(50)` pagination wrapper in API route.
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
                   {firebaseHealth.map((col, idx) => (
                     <tr key={idx} className="hover:bg-slate-800/50">
                       <td className="py-4 px-6 text-sm font-mono text-slate-300">{col.collection}</td>
                       <td className="py-4 px-6">
                         <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border", col.status.includes('Warning') ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20")}>
                           {col.status}
                         </span>
                       </td>
                       <td className="py-4 px-6 text-sm text-slate-400">{col.count}</td>
                       <td className="py-4 px-6 text-sm text-slate-400">{col.size}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            </div>
          )}

          {activeTab === 'workspace' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white flex items-center gap-2"><Mail className="text-blue-400" /> Workspace Health Center</h3>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-slate-800 px-2 py-1 rounded border border-slate-700">Status: Not Connected</span>
              </div>
              <div className="bg-slate-950 border border-slate-800 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center h-[200px]">
                 <Mail className="text-slate-700 mb-4" size={32} />
                 <h4 className="text-sm font-bold text-slate-400 mb-1">Google Workspace Telemetry Disconnected</h4>
                 <p className="text-xs text-slate-500 max-w-md">OAuth Success Rate, Token Refresh Failures, and Pub/Sub Health will be displayed here once connected to `oauth_events` and the Token Vault.</p>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
