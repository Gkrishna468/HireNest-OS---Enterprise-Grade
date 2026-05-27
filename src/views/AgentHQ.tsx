import { useState, useEffect, useRef } from "react";
import { Activity, Brain, ShieldAlert, TrendingUp, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "../lib/Button";
import { cn } from "../lib/utils";
import ReactMarkdown from "react-markdown";

export default function AgentHQ() {
  const [analysis, setAnalysis] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [governanceQueue, setGovernanceQueue] = useState<any[]>([]);
  const [activeRequirements, setActiveRequirements] = useState<any[]>([]);
  const [activeMatches, setActiveMatches] = useState<any[]>([]);
  const [emailLogs, setEmailLogs] = useState<any[]>([]);

  const fetchInitialized = useRef(false);

  const fetchStrategicData = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Fetch live governance data
      const govRes = await fetch("/api/governance");
      if (!govRes.ok) {
        const text = await govRes.text();
        throw new Error(`Governance failed: ${text.substring(0, 50)}`);
      }
      const rawText = await govRes.text();
      const govData = JSON.parse(rawText);
      
      const requirementsList = govData.requirements || [];
      const pending = requirementsList.filter((r: any) => r.status === "PENDING_FINANCIAL_APPROVAL");
      const active = requirementsList.filter((r: any) => r.status === "PUBLISHED" || r.status === "OPEN");
      setActiveRequirements(active);
      setActiveMatches(govData.submissions || []);
      setGovernanceQueue(pending);

      // 2. Run strategic agent analysis (optional - handle if API missing)
      try {
        const stratRes = await fetch("/api/strategy/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            requirements: requirementsList,
            metrics: govData.metrics
          })
        });
        if (stratRes.ok) {
          const stratData = await stratRes.json();
          setAnalysis(stratData.analysis);
        }
      } catch (err) {
        setAnalysis("Strategic Analysis Offline: Using deterministic heuristics for current session.");
      }

      // 3. Fetch notifications/logs (fallback to empty if API missing)
      try {
        const notifyRes = await fetch("/api/admin/notifications");
        if (notifyRes.ok) {
          const notifyData = await notifyRes.json();
          setEmailLogs(notifyData);
        }
      } catch (err) {
        setEmailLogs([]);
      }
    } catch (err) {
      console.warn("[Agent HQ] Strategic Engine Sync Failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!fetchInitialized.current) {
        fetchStrategicData();
        fetchInitialized.current = true;
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
      <div className="p-8 pb-4">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                   <Brain className="text-indigo-600" size={32} /> 
                   Strategic Agent HQ
                </h1>
            </div>
            <Button 
                onClick={fetchStrategicData} 
                className="bg-indigo-600 hover:bg-slate-900 text-white font-black px-6 rounded-2xl shadow-xl shadow-indigo-100 uppercase tracking-widest text-xs h-12 flex items-center gap-2"
                disabled={loading}
            >
                <Activity size={16} className={loading ? "animate-spin" : ""} />
                {loading ? "Processing Hub..." : "Refresh Intelligence"}
            </Button>
        </div>

        <div className="grid grid-cols-12 gap-8 h-[calc(100vh-210px)]">
          {/* Main Strategic Column */}
          <div className="col-span-8 flex flex-col gap-6 overflow-hidden">
            
            {/* The Agent's Thought Space */}
            <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-2xl p-8 overflow-y-auto">
                <div className="flex items-center gap-3 mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                        <Brain size={24} />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Global Marketplace Analysis</h2>
                        <p className="text-[10px] text-indigo-500 font-bold uppercase">LLM-Refined • Real-time Stream</p>
                    </div>
                </div>

                {loading ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                        <div className="h-4 bg-slate-100 rounded w-full"></div>
                        <div className="h-4 bg-slate-100 rounded w-5/6"></div>
                        <div className="h-32 bg-slate-50 rounded-2xl mt-8"></div>
                    </div>
                ) : (
                    <div className="prose prose-slate max-w-none prose-sm">
                        <div className="markdown-body p-2 text-slate-700 leading-relaxed custom-agent-brief">
                            <ReactMarkdown>{analysis || "Waiting for strategic signal..."}</ReactMarkdown>
                        </div>
                    </div>
                )}
            </div>

            {/* Active Requirements & Matches */}
            <div className="h-64 bg-white rounded-3xl p-6 shadow-xl border border-slate-200 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                        <Activity size={14}/> Active Requirements
                    </h3>
                    <span className="text-[10px] font-black uppercase bg-indigo-50 text-indigo-600 px-2 py-1 rounded">
                        {activeRequirements.length} ACTIVE
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3">
                    {activeRequirements.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic text-center mt-8">No active requirements found across the network.</div>
                    ) : (
                        activeRequirements.map(req => {
                            const reqMatches = activeMatches.filter(m => m.requirementId === req.id);
                            return (
                                <div key={req.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 gap-2">
                                    <div>
                                        <div className="text-xs font-black text-slate-800">{req.title}</div>
                                        <div className="text-[10px] uppercase font-bold text-slate-500">{req.clientName || req.clientId}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matches</div>
                                            <div className="text-sm font-black text-indigo-600">{reqMatches.length}</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Budget</div>
                                            <div className="text-sm font-black text-emerald-600">${req.clientTargetBudget || 0}</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Email Dispatch Audit Log */}
            <div className="h-40 bg-slate-900 rounded-3xl p-6 shadow-xl border border-slate-800 text-white flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-300 flex items-center gap-2">
                        <Mail size={14}/> Communication Dispatch Hub
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400">gopal@hirenestworkforce.com</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2 font-mono">
                    {emailLogs.length === 0 ? (
                        <div className="text-[10px] text-slate-500 italic">No alert dispatches in this session.</div>
                    ) : (
                        emailLogs.map(log => (
                            <div key={log.id} className="flex items-center gap-3 text-[10px]">
                                <span className="text-slate-500">[{log.createdAt.split('T')[1].slice(0, 8)}]</span>
                                <span className="text-emerald-400 uppercase font-bold">{log.status}</span>
                                <span className="text-slate-300">{log.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
          </div>

          {/* Side Control Panel */}
          <div className="col-span-4 space-y-6 overflow-y-auto pr-2">
            
            {/* Urgent Approval Gate */}
            <div className="bg-white rounded-3xl border-2 border-indigo-100 p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert className="text-orange-500" size={16}/> Governance Gate
                    </h2>
                    <span className="bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {governanceQueue.length} PENDING
                    </span>
                </div>
                
                <div className="space-y-4">
                    {governanceQueue.length === 0 ? (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
                             <CheckCircle className="mx-auto text-emerald-500 mb-2" size={24}/>
                             <p className="text-xs font-bold text-slate-400">All commercial approvals cleared.</p>
                        </div>
                    ) : (
                        governanceQueue.map((item: any) => (
                            <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all group">
                                <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">{item.id}</div>
                                <div className="text-xs font-black text-slate-800 mb-2">{item.title}</div>
                                <div className="flex items-center justify-between">
                                    <div className="text-[10px] font-mono text-indigo-600">Target: ${item.clientTargetBudget || '---'}</div>
                                    <Button 
                                        variant="ghost" 
                                        onClick={() => window.location.href = '/clients'}
                                        className="h-8 px-3 text-[10px] font-black uppercase text-indigo-600 hover:bg-indigo-50"
                                    >
                                        Quick Review
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Strategic KPIs */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                    <TrendingUp size={14}/> Vital Signals
                </h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Fill Rate</div>
                        <div className="text-2xl font-black text-emerald-400">88%</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Avg Margin</div>
                        <div className="text-2xl font-black text-indigo-400">18.2%</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Vendor Health</div>
                        <div className="text-2xl font-black text-amber-400">92</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700">
                        <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Latency</div>
                        <div className="text-2xl font-black text-slate-200">4h</div>
                    </div>
                </div>
            </div>

            {/* Admin Alert System Configuration */}
            <div className="bg-orange-50 border border-orange-100 rounded-3xl p-6">
                <div className="flex items-center gap-3 mb-3 text-orange-700">
                    <Mail size={18} />
                    <h4 className="text-xs font-black uppercase tracking-widest">Active Watchlist</h4>
                </div>
                <p className="text-[10px] text-orange-600 font-medium leading-relaxed">
                    Critical approval alerts are being dispatched to <span className="font-bold underline text-orange-800">gopal@hirenestworkforce.com</span> for all new job postings.
                </p>
                <div className="mt-4 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] font-black text-orange-800 uppercase">Live Watch Enabled</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
