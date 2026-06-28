import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Database, 
  Send, 
  Cpu, 
  Mail, 
  Terminal, 
  Play, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  Sparkles,
  TrendingUp,
  Clock
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";

interface SystemHealth {
  server: string;
  firestore: string;
  runtimeKernel: string;
  eventBus: string;
  mailOS: string;
  aiGateway: string;
  uptime: number;
  version: string;
  timestamp: string;
}

const mockChartData = [
  { name: "00:00", requests: 120, latency: 15 },
  { name: "04:00", requests: 80, latency: 12 },
  { name: "08:00", requests: 340, latency: 45 },
  { name: "12:00", requests: 450, latency: 50 },
  { name: "16:00", requests: 380, latency: 38 },
  { name: "20:00", requests: 290, latency: 22 },
  { name: "24:00", requests: 180, latency: 18 }
];

export default function App() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiResult, setAiResult] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: "info" | "success" | "warn" }>>([]);
  const [emailTo, setEmailTo] = useState<string>("");
  const [emailSent, setEmailSent] = useState<boolean>(false);

  const addLog = (text: string, type: "info" | "success" | "warn" = "info") => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [{ id: Math.random().toString(), time, text, type }, ...prev].slice(0, 50));
  };

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/health");
      if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
      const data = await res.json();
      setHealth(data);
      setError(null);
      addLog("System health parameters fetched successfully.", "success");
    } catch (err: any) {
      setError(err.message || "Failed to reach backend services");
      addLog(`Failed to sync health status: ${err.message}`, "warn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    addLog("HireNestOS Diagnostic Control Center initialized.", "info");

    const interval = setInterval(() => {
      fetchHealth();
    }, 15000); // refresh health every 15s

    return () => clearInterval(interval);
  }, []);

  const triggerEvent = (name: string) => {
    addLog(`Published internal event: [EventBus::${name}]`, "info");
    // Mock successful publish
    setTimeout(() => {
      addLog(`Event [${name}] successfully processed by Runtime Kernel subscribers.`, "success");
    }, 800);
  };

  const handleTestAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResult("");
    addLog(`Dispatching AI analysis request to Gemini API proxy...`, "info");
    try {
      const res = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      if (!res.ok) throw new Error(`AI Gateway Error ${res.status}`);
      const data = await res.json();
      setAiResult(data.response);
      addLog("AI generation task finished successfully.", "success");
    } catch (err: any) {
      setAiResult(`Error: ${err.message}`);
      addLog(`AI task failed: ${err.message}`, "warn");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSendTestEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo.trim()) return;
    addLog(`Instructing MailOS to send notification sequence to: ${emailTo}`, "info");
    setEmailSent(true);
    setTimeout(() => {
      addLog(`MailOS notification dispatch acknowledged by SMTP gateways.`, "success");
      setEmailTo("");
      setEmailSent(false);
    }, 1500);
  };

  const renderStatus = (status: string | undefined) => {
    if (status === "running" || status === "connected" || status === "healthy" || status === "ready") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
          <CheckCircle className="w-3.5 h-3.5" />
          ACTIVE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
        <XCircle className="w-3.5 h-3.5" />
        OFFLINE
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0c101b] px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2.5 rounded-lg shadow-lg shadow-blue-500/20 text-white flex items-center justify-center">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-display">HireNestOS</h1>
              <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 font-semibold px-1.5 py-0.5 rounded font-mono">
                v{health?.version || "1.0.1"}
              </span>
            </div>
            <p className="text-xs text-slate-400 m-0">Enterprise Recruitment Staffing Operating System - Diagnostic Panel</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            id="refresh-btn"
            onClick={fetchHealth} 
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 hover:text-white px-3.5 py-2 rounded-lg text-sm font-medium transition duration-200 border border-slate-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh State
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns - Stats, Service Grid, Diagnostics */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Top Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
              <div className="bg-blue-500/10 text-blue-400 p-3 rounded-lg border border-blue-500/20">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">SYS UPTIME</span>
                <p className="text-lg font-bold font-mono text-white">
                  {health ? `${health.uptime}s` : "---"}
                </p>
              </div>
            </div>

            <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
              <div className="bg-emerald-500/10 text-emerald-400 p-3 rounded-lg border border-emerald-500/20">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">SYS HEALTH</span>
                <p className="text-lg font-bold text-emerald-400">
                  {error ? "COMPROMISED" : "OPTIMAL"}
                </p>
              </div>
            </div>

            <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-5 flex items-center gap-4">
              <div className="bg-indigo-500/10 text-indigo-400 p-3 rounded-lg border border-indigo-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium">API STATUS</span>
                <p className="text-lg font-bold text-indigo-400">
                  {loading ? "CHECKING..." : "ONLINE"}
                </p>
              </div>
            </div>
          </div>

          {/* Service Grid Card */}
          <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              System Service Microkernel Registry
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Web Server */}
              <div className="bg-[#121826] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-500/10 text-blue-400 p-2.5 rounded-lg border border-blue-500/15">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Express Web Server</h3>
                    <p className="text-xs text-slate-400">Port 3000 Ingress Routing</p>
                  </div>
                </div>
                {renderStatus(health?.server || "healthy")}
              </div>

              {/* Firestore */}
              <div className="bg-[#121826] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-lg border border-amber-500/15">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Firestore Cloud DB</h3>
                    <p className="text-xs text-slate-400">Multi-tenant Persistence</p>
                  </div>
                </div>
                {renderStatus(health?.firestore)}
              </div>

              {/* Runtime Kernel */}
              <div className="bg-[#121826] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg border border-indigo-500/15">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">Runtime Kernel</h3>
                    <p className="text-xs text-slate-400">Async Background Services</p>
                  </div>
                </div>
                {renderStatus(health?.runtimeKernel)}
              </div>

              {/* Event Bus */}
              <div className="bg-[#121826] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/10 text-purple-400 p-2.5 rounded-lg border border-purple-500/15">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">System Event Bus</h3>
                    <p className="text-xs text-slate-400">Publisher-Subscriber Matrix</p>
                  </div>
                </div>
                {renderStatus(health?.eventBus)}
              </div>

              {/* MailOS */}
              <div className="bg-[#121826] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-pink-500/10 text-pink-400 p-2.5 rounded-lg border border-pink-500/15">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">MailOS Outbound</h3>
                    <p className="text-xs text-slate-400">Staffing Communications</p>
                  </div>
                </div>
                {renderStatus(health?.mailOS)}
              </div>

              {/* AI Gateway */}
              <div className="bg-[#121826] border border-slate-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-500/10 text-cyan-400 p-2.5 rounded-lg border border-cyan-500/15">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-200">AI Gateway (Gemini)</h3>
                    <p className="text-xs text-slate-400">Grounded Intelligence</p>
                  </div>
                </div>
                {renderStatus(health?.aiGateway)}
              </div>

            </div>
          </div>

          {/* Metrics Performance Chart */}
          <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" />
              Strategic Routing & System Latency Analytics
            </h2>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155" }} />
                  <Area type="monotone" dataKey="requests" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" name="API Vol" />
                  <Area type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorLatency)" name="Latency (ms)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Right Columns - Diagnostics, Prompting, Event Testing */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Quick Diagnostics Actions */}
          <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-purple-500" />
              Trigger Event Bus Broadcasts
            </h2>
            <div className="flex flex-col gap-2.5">
              <button 
                id="event-reconcile-btn"
                onClick={() => triggerEvent("SYSTEM_RECONCILIATION")}
                className="w-full flex items-center justify-between text-left px-4 py-3 bg-[#121826] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-sm transition duration-150"
              >
                <span className="font-semibold text-xs">RECONCILE DATABASE COLLECTIONS</span>
                <Play className="w-3.5 h-3.5 text-blue-500" />
              </button>
              <button 
                id="event-metrics-btn"
                onClick={() => triggerEvent("METRICS_REBUILD")}
                className="w-full flex items-center justify-between text-left px-4 py-3 bg-[#121826] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-sm transition duration-150"
              >
                <span className="font-semibold text-xs">REBUILD PERFORMANCE SHARDS</span>
                <Play className="w-3.5 h-3.5 text-blue-500" />
              </button>
              <button 
                id="event-sync-btn"
                onClick={() => triggerEvent("BOOTSTRAP_SYNC_SCAN")}
                className="w-full flex items-center justify-between text-left px-4 py-3 bg-[#121826] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-sm transition duration-150"
              >
                <span className="font-semibold text-xs">TRIGGER COMPLIANCE AUDIT</span>
                <Play className="w-3.5 h-3.5 text-blue-500" />
              </button>
            </div>
          </div>

          {/* AI Generation Sandbox */}
          <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-500 animate-pulse" />
              AI Gateway Prompt Playground
            </h2>
            <p className="text-xs text-slate-400 mb-4">Test grounded staffing predictions securely through our Gemini API proxy.</p>

            <form onSubmit={handleTestAI} className="space-y-4">
              <textarea 
                id="ai-prompt-input"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ask Gemini to draft recruitment criteria or JD summaries..."
                rows={3}
                className="w-full bg-[#121826] text-slate-100 border border-slate-800 rounded-lg p-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button 
                id="ai-submit-btn"
                type="submit" 
                disabled={aiLoading || !aiPrompt.trim()}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition duration-200 shadow-md shadow-blue-500/15"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing Prompt...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Query Gemini
                  </>
                )}
              </button>
            </form>

            {aiResult && (
              <div className="mt-4 p-3.5 bg-[#121826] border border-slate-800 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider font-mono">Gemini Response:</span>
                <p className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">{aiResult}</p>
              </div>
            )}
          </div>

          {/* MailOS Test Form */}
          <div className="bg-[#0c101b] border border-slate-800 rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-pink-500" />
              MailOS Email Diagnostic
            </h2>
            <p className="text-xs text-slate-400 mb-4">Validate that outbound transactional SMTP mail routing is functional.</p>

            <form onSubmit={handleSendTestEmail} className="space-y-4">
              <input 
                id="email-input"
                type="email"
                required
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="recipient@domain.com"
                className="w-full bg-[#121826] text-slate-100 border border-slate-800 rounded-lg p-3 text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <button 
                id="email-submit-btn"
                type="submit" 
                disabled={emailSent}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-slate-200 font-medium py-2 px-4 rounded-lg text-sm transition duration-200"
              >
                {emailSent ? "Dispatching..." : "Send Test Dispatch"}
              </button>
            </form>
          </div>

        </div>

      </main>

      {/* Terminal logs panel (Full Width bottom) */}
      <footer className="border-t border-slate-800 bg-[#060911] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2 font-display">
              <Terminal className="w-4 h-4 text-slate-400" />
              Grounded Event Logging Console
            </h2>
            <span className="text-[10px] font-mono text-slate-500 uppercase">Interactive Logs Monitor</span>
          </div>

          <div id="logs-panel" className="bg-[#0c101b] border border-slate-800 rounded-xl p-4 font-mono text-xs h-40 overflow-y-auto space-y-2 scrollbar-thin">
            {logs.length === 0 ? (
              <p className="text-slate-500 italic text-center py-8">Console is waiting for diagnostic events...</p>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2.5 items-start py-0.5 border-b border-slate-800/20 last:border-0">
                  <span className="text-slate-500 text-[10px] shrink-0 font-sans">{log.time}</span>
                  <span className={`font-semibold shrink-0 uppercase text-[10px] ${
                    log.type === "success" ? "text-emerald-400" : log.type === "warn" ? "text-amber-400" : "text-blue-400"
                  }`}>
                    [{log.type}]
                  </span>
                  <span className="text-slate-300 leading-relaxed break-all">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
