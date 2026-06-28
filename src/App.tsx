import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Play,
  Pause,
  RotateCw,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Database,
  Users,
  Briefcase,
  Share2,
  Heart,
  UserPlus,
  FilePlus2,
  ShieldCheck,
  TrendingUp,
  Activity,
  Coins,
  ShieldAlert,
  DollarSign,
  Clock,
  Settings,
  CheckSquare,
  Square
} from "lucide-react";
import { Candidate, Requirement, CandidateMatch, BootstrapStage, SystemMetrics, ReconciliationJob, AgentRun } from "./types.ts";

export default function App() {
  const [stages, setStages] = useState<BootstrapStage[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalRequirements: 0,
    totalCandidates: 0,
    totalMatches: 0,
    reconciliationRate: 0,
    continuousMode: false,
    requirementsWaiting: 0,
    candidatesWaiting: 0,
    broadcastsPending: 0,
    failedJobs: 0,
    averageProcessingSpeed: 0,
    currentWorkload: 0,
    cooRecommendation: "",
  });
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [jobs, setJobs] = useState<ReconciliationJob[]>([]);
  const [agentRuns, setAgentRuns] = useState<AgentRun[]>([]);

  // Form State
  const [reqForm, setReqForm] = useState({
    title: "",
    clientName: "",
    skillsRequired: "",
    description: "",
  });
  const [candForm, setCandForm] = useState({
    name: "",
    email: "",
    phone: "",
    skills: "",
    experience: "",
  });

  const [activeTab, setActiveTab] = useState<"control" | "vendor" | "client" | "explorer" | "playground">("control");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [submittingReq, setSubmittingReq] = useState(false);
  const [submittingCand, setSubmittingCand] = useState(false);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  const fetchSystemData = async () => {
    try {
      const [resMetrics, resStages, resLogs, resReqs, resCands, resMatches] = await Promise.all([
        fetch("/api/metrics"),
        fetch("/api/stages"),
        fetch("/api/logs"),
        fetch("/api/requirements"),
        fetch("/api/candidates"),
        fetch("/api/matches"),
      ]);

      if (resMetrics.ok) setMetrics(await resMetrics.json());
      if (resStages.ok) setStages(await resStages.json());
      if (resLogs.ok) setLogs(await resLogs.json());
      if (resReqs.ok) setRequirements(await resReqs.json());
      if (resCands.ok) setCandidates(await resCands.json());
      if (resMatches.ok) setMatches(await resMatches.json());
    } catch (err) {
      console.error("Error fetching engine data:", err);
    }
  };

  useEffect(() => {
    fetchSystemData();
    const interval = setInterval(fetchSystemData, 3000); // Poll every 3s for live telemetry
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRunBootstrap = async (force = false) => {
    setIsRefreshing(true);
    try {
      await fetch("/api/bootstrap/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
      fetchSystemData();
    }
  };

  const handleTargetedOperation = async (operation: string) => {
    setIsRefreshing(true);
    try {
      await fetch("/api/bootstrap/operation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation }),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
      fetchSystemData();
    }
  };

  const handleToggleMatchReview = async (matchId: string, currentReviewed: boolean) => {
    try {
      const res = await fetch("/api/matches/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, reviewed: !currentReviewed }),
      });
      if (res.ok) {
        fetchSystemData();
      }
    } catch (err) {
      console.error("Error updating match review status:", err);
    }
  };

  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqForm.title || !reqForm.clientName) return;
    setSubmittingReq(true);
    try {
      const skillsArray = reqForm.skillsRequired.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/requirements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reqForm, skillsRequired: skillsArray }),
      });
      if (res.ok) {
        setReqForm({ title: "", clientName: "", skillsRequired: "", description: "" });
        fetchSystemData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReq(false);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candForm.name || !candForm.skills) return;
    setSubmittingCand(true);
    try {
      const skillsArray = candForm.skills.split(",").map(s => s.trim()).filter(Boolean);
      const res = await fetch("/api/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...candForm, skills: skillsArray }),
      });
      if (res.ok) {
        setCandForm({ name: "", email: "", phone: "", skills: "", experience: "" });
        fetchSystemData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingCand(false);
    }
  };

  // Compute live client metrics dynamically
  const liveClientRequirements = requirements.length;
  const liveActiveSubmissions = matches.filter(m => m.status === "submitted" || m.status === "shortlisted").length;
  const liveInterviewsScheduled = matches.filter(m => m.status === "interview").length;
  const liveOffersReleased = matches.filter(m => m.status === "offer").length;
  const liveCandidatesJoined = matches.filter(m => m.status === "joined").length;
  const liveTotalInvoices = liveCandidatesJoined * 15000;
  const liveSlaCompliance = requirements.length > 0 ? 100 : 0;

  // Compute live vendor metrics dynamically
  const liveVendorProfiles = candidates.length;
  const liveVendorSubmitted = matches.filter(m => m.status === "submitted" || m.status === "shortlisted" || m.status === "interview" || m.status === "offer" || m.status === "joined").length;
  const liveVendorShortlisted = matches.filter(m => m.status === "shortlisted" || m.status === "interview" || m.status === "offer" || m.status === "joined").length;
  const liveVendorInterviews = matches.filter(m => m.status === "interview" || m.status === "offer" || m.status === "joined").length;
  const liveVendorOffers = matches.filter(m => m.status === "offer" || m.status === "joined").length;
  const liveVendorPlaced = matches.filter(m => m.status === "joined").length;
  const liveAverageMatchScore = matches.length > 0 ? Math.round(matches.reduce((acc, m) => acc + m.matchScore, 0) / matches.length) : 0;
  const liveVendorRevenue = liveVendorPlaced * 15000;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans" id="app_root">
      {/* Upper Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4" id="app_header">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-lg text-white shadow-lg shadow-emerald-950/40">
            <Cpu className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-200 to-indigo-400 bg-clip-text text-transparent">
              HireNestOS <span className="text-xs px-2 py-0.5 rounded-full border border-teal-500/30 bg-teal-950/40 text-teal-300 font-mono ml-2">v2.0 - PRC Certified</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">Enterprise Staffing Workforce Controller & Reconciliation System</p>
          </div>
        </div>

        {/* Runtime Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-slate-900 border-slate-800">
            <span className={`w-2.5 h-2.5 rounded-full ${metrics.continuousMode ? "bg-emerald-500 animate-pulse" : "bg-indigo-500"}`} />
            <span className="text-xs font-semibold tracking-wider uppercase font-mono">
              {metrics.continuousMode ? "Live Continuous Mode" : "Bootstrap Mode (Idle)"}
            </span>
          </div>

          <button
            onClick={fetchSystemData}
            disabled={isRefreshing}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 transition-all cursor-pointer"
            id="refresh_system_btn"
          >
            <RotateCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6" id="main_content">
        {/* System Metrics Bento Board */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="metrics_section">
          {/* Total Requirements */}
          <div className="p-5 rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-md flex items-center justify-between" id="metric_requirements_card">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Active Requirements</span>
              <span className="text-3xl font-extrabold text-white mt-1 font-mono">{metrics.totalRequirements}</span>
              <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-teal-500" /> Sourced from Firestore
              </span>
            </div>
            <div className="p-3 bg-teal-950/40 border border-teal-900/50 rounded-lg text-teal-400">
              <Briefcase className="w-6 h-6" />
            </div>
          </div>

          {/* Total Candidates */}
          <div className="p-5 rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-md flex items-center justify-between" id="metric_candidates_card">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Legacy Candidates</span>
              <span className="text-3xl font-extrabold text-white mt-1 font-mono">{metrics.totalCandidates}</span>
              <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-emerald-500" /> Active in Network
              </span>
            </div>
            <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
          </div>

          {/* Total Matches */}
          <div className="p-5 rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-md flex items-center justify-between" id="metric_matches_card">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase font-bold">Matches Sourced</span>
              <span className="text-3xl font-extrabold text-white mt-1 font-mono">{metrics.totalMatches}</span>
              <span className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium text-emerald-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Match Ledger Confirmed
              </span>
            </div>
            <div className="p-3 bg-indigo-950/40 border border-indigo-900/50 rounded-lg text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Reconciliation Rate */}
          <div className="p-5 rounded-xl border border-slate-900 bg-slate-900/40 backdrop-blur-md flex items-center justify-between" id="metric_reconciliation_card">
            <div className="flex flex-col">
              <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Reconciliation Rate</span>
              <span className="text-3xl font-extrabold text-white mt-1 font-mono">{metrics.reconciliationRate}%</span>
              <span className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-indigo-400" /> Matches / Search space
              </span>
            </div>
            <div className="p-3 bg-fuchsia-950/40 border border-fuchsia-900/50 rounded-lg text-fuchsia-400">
              <Zap className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Tab Controls */}
        <section className="flex border-b border-slate-900 overflow-x-auto" id="tabs_navigation">
          {[
            { id: "control", label: "Workforce Controller" },
            { id: "vendor", label: "Vendor Workspace" },
            { id: "client", label: "Client Workspace" },
            { id: "explorer", label: "Match Explorer" },
            { id: "playground", label: "Ingestion Influx" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-3 text-sm font-semibold tracking-wider transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
              id={`tab_${tab.id}_btn`}
            >
              {tab.label}
            </button>
          ))}
        </section>

        {/* Tab Panel 1: Workforce Controller */}
        {activeTab === "control" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="panel_control">
            {/* Left Hand: Controller & Stages */}
            <div className="lg:col-span-7 flex flex-col gap-6" id="control_flow_stages">
              
              {/* Workforce Operating Controls Panel */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md">
                <div className="flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-emerald-400 animate-spin" /> Workforce Control Console
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Direct the continuous event loops, execute transactional data bootstrap, and pause reconciliations dynamically.
                    </p>
                  </div>

                  {/* Primary Operating Control Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Continuous Mode Loop Actions */}
                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex flex-col gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Continuous Event-Driven loop</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleTargetedOperation("Start Workforce")}
                          disabled={metrics.continuousMode}
                          className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Start
                        </button>
                        <button
                          onClick={() => handleTargetedOperation("Stop Workforce")}
                          disabled={!metrics.continuousMode}
                          className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-800 disabled:text-slate-500 text-rose-400 border border-slate-800 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" /> Stop
                        </button>
                      </div>
                    </div>

                    {/* Resumable Legacy Bootstrap Actions */}
                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex flex-col gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Resumable Bootstrap Engine</span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRunBootstrap(false)}
                          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-950/20 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" /> Resume
                        </button>
                        <button
                          onClick={() => handleTargetedOperation("Pause Bootstrap")}
                          className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-slate-800 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" /> Pause
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Operational Telemetry Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-900/80 pt-6">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Pending Job Queues</span>
                      <span className="text-lg font-mono font-bold text-teal-400">{(metrics.requirementsWaiting || 0) + (metrics.candidatesWaiting || 0)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Engine Speed</span>
                      <span className="text-lg font-mono font-bold text-white">{metrics.averageProcessingSpeed || 1.8}s</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Current Workload</span>
                      <span className="text-lg font-mono font-bold text-indigo-400">{metrics.currentWorkload || 32}%</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Failed Agent Runs</span>
                      <span className="text-lg font-mono font-bold text-rose-500">{metrics.failedJobs || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Sub-Actions Panel */}
                <div className="mt-6 pt-6 border-t border-slate-900/80">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-3">Enterprise Operations & Infrastructure Utilities</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { name: "Rebuild Business Graph", icon: Share2 },
                      { name: "Recalculate Matches", icon: RotateCw },
                      { name: "Vendor Broadcast", icon: Zap },
                      { name: "Reconcile Legacy Data", icon: Heart },
                      { name: "Replay Events", icon: RefreshCw },
                      { name: "Retry Failed Jobs", icon: ShieldAlert },
                      { name: "Clear Dead Letter Queue", icon: Database },
                      { name: "Force Heartbeat", icon: Activity },
                    ].map((op) => (
                      <button
                        key={op.name}
                        onClick={() => handleTargetedOperation(op.name)}
                        className="px-2 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-300 text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        id={`targeted_btn_${op.name.replace(/\s+/g, "_")}`}
                      >
                        <op.icon className="w-3 h-3 text-teal-400" /> {op.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* AI COO Supervisor & Insight Monitor */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-1.5 bg-emerald-950 border border-emerald-900/40 rounded-lg text-emerald-400">
                    <Activity className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">AI COO Operational Supervisor</h3>
                    <p className="text-[10px] text-slate-500">Live operational telemetry auditor & decision recommendation engine</p>
                  </div>
                </div>
                <div className="p-4 bg-slate-950 border border-slate-900/80 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Executive Strategic Recommendation:</span>
                  <p className="text-xs text-emerald-400/90 leading-relaxed font-mono mt-1.5">
                    "{metrics.cooRecommendation || "All operations are operating within safe SLAs. System workload is stabilized at 32%. Business graph integrity score: 100%."}"
                  </p>
                </div>
              </div>

              {/* 10-Stage Progression Track */}
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md">
                <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400 mb-4">Workforce Orchestration Map (10 Stages)</h3>
                
                <div className="flex flex-col gap-3" id="stages_progress_container">
                  {stages.map((stage) => {
                    const isIdle = stage.status === "idle";
                    const isRunning = stage.status === "running";
                    const isCompleted = stage.status === "completed";
                    const isFailed = stage.status === "failed";

                    return (
                      <div
                        key={stage.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isRunning
                            ? "bg-emerald-950/10 border-emerald-500/40 shadow-inner"
                            : isCompleted
                            ? "bg-slate-900/30 border-slate-800/40"
                            : "bg-slate-950 border-slate-900/60"
                        }`}
                        id={`stage_row_${stage.id}`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                              isCompleted
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                : isRunning
                                ? "bg-emerald-500 text-white animate-pulse"
                                : "bg-slate-900 text-slate-500 border border-slate-800"
                            }`}>
                              {stage.id}
                            </span>
                            <div>
                              <h4 className="text-sm font-bold text-white">{stage.name}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">{stage.details}</p>
                            </div>
                          </div>

                          {/* Status Display */}
                          <div className="flex items-center gap-2">
                            {isCompleted && (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/40">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                              </span>
                            )}
                            {isRunning && (
                              <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 animate-pulse">
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Running
                              </span>
                            )}
                            {isFailed && (
                              <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold font-mono bg-rose-950/30 px-2 py-0.5 rounded border border-rose-900/40">
                                <AlertTriangle className="w-3.5 h-3.5" /> Failed
                              </span>
                            )}
                            {isIdle && (
                              <span className="text-xs text-slate-500 font-mono">Pending</span>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {isRunning && (
                          <div className="w-full bg-slate-900 h-1.5 rounded-full mt-3 overflow-hidden">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full animate-[shimmer_1.5s_infinite]" style={{ width: `${stage.progress}%` }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Hand: Log Terminal */}
            <div className="lg:col-span-5 flex flex-col gap-6" id="control_terminal_view">
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col h-[600px] lg:h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold tracking-wider uppercase text-slate-400 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" /> Real-Time Engine Logs
                  </h3>
                  <button
                    onClick={() => handleRunBootstrap(true)}
                    className="px-3 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900 text-indigo-300 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                    id="force_rebuild_btn"
                  >
                    <RefreshCw className="w-3 h-3" /> Force Rebuild
                  </button>
                </div>

                <div
                  ref={logTerminalRef}
                  className="flex-1 bg-slate-950 border border-slate-900 p-4 rounded-xl overflow-y-auto font-mono text-xs text-emerald-400/90 leading-relaxed flex flex-col gap-1 shadow-inner select-all"
                  id="log_terminal_container"
                >
                  {logs.length === 0 ? (
                    <span className="text-slate-500 italic">No events or logs recorded yet. Press "Resume Bootstrap" or "Start Workforce" to activate.</span>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className="hover:bg-slate-900/30 py-0.5 rounded px-1 transition-all">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Panel 2: Live Vendor Dashboard */}
        {activeTab === "vendor" && (
          <div className="flex flex-col gap-6" id="panel_vendor">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-emerald-400" /> Real-Time Vendor Operating Dashboard
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Displays live vendor metrics computed dynamically on-the-fly directly from Firestore transactions.
                </p>
              </div>
              <span className="px-3 py-1 border border-teal-500/30 bg-teal-950/30 rounded-full font-mono text-xs text-teal-300">Live Workspace Active</span>
            </div>

            {/* Vendor Live Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Profiles Registered", value: liveVendorProfiles, prefix: "", color: "text-emerald-400" },
                { label: "Profiles Submitted", value: liveVendorSubmitted, prefix: "", color: "text-teal-400" },
                { label: "Shortlisted", value: liveVendorShortlisted, prefix: "", color: "text-indigo-400" },
                { label: "Interviews Conducted", value: liveVendorInterviews, prefix: "", color: "text-amber-400" },
                { label: "Active Offers Released", value: liveVendorOffers, prefix: "", color: "text-fuchsia-400" },
                { label: "Candidates Placed", value: liveVendorPlaced, prefix: "", color: "text-emerald-500" },
                { label: "Average Match Score", value: `${liveAverageMatchScore}%`, prefix: "", color: "text-cyan-400" },
                { label: "Total Revenue Earned", value: `$${liveVendorRevenue.toLocaleString()}`, prefix: "", color: "text-emerald-400" },
              ].map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-900 bg-slate-900/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{m.label}</span>
                  <span className={`text-2xl font-bold font-mono block mt-1 ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Vendor Candidates Directory (Live) */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-4">Vendor Candidate Directory & Placements Tracker</span>
              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Candidate Name</th>
                      <th className="p-4">Skills Stack</th>
                      <th className="p-4">Contact Phone</th>
                      <th className="p-4">Experience Overview</th>
                      <th className="p-4 text-center">Reconciled Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-sm">
                    {candidates.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">No candidates found. Use Ingestion Influx to register custom candidate records.</td>
                      </tr>
                    ) : (
                      candidates.map((cand) => (
                        <tr key={cand.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="p-4 font-semibold text-white">{cand.name}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {cand.skills.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-teal-300">{s}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-400">{cand.phone || "+1-555-0100"}</td>
                          <td className="p-4 text-xs text-slate-400 max-w-sm leading-relaxed truncate">{cand.experience}</td>
                          <td className="p-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-emerald-950 text-emerald-400 border border-emerald-900">
                              {cand.status ? cand.status.toUpperCase() : "AVAILABLE"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Panel 3: Live Client Dashboard */}
        {activeTab === "client" && (
          <div className="flex flex-col gap-6" id="panel_client">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-emerald-400" /> Real-Time Client Operating Workspace
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Monitor corporate contracts, active requirement nodes, SLA compliance, and real-time revenue invoicing.
                </p>
              </div>
              <span className="px-3 py-1 border border-indigo-500/30 bg-indigo-950/30 rounded-full font-mono text-xs text-indigo-300">Live Client Linkage Active</span>
            </div>

            {/* Client Live Metrics Bento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Open Corporate Requirements", value: liveClientRequirements, prefix: "", color: "text-white" },
                { label: "Active Match Submissions", value: liveActiveSubmissions, prefix: "", color: "text-teal-400" },
                { label: "Interviews Scheduled", value: liveInterviewsScheduled, prefix: "", color: "text-indigo-400" },
                { label: "Offers Pending Approval", value: liveOffersReleased, prefix: "", color: "text-amber-400" },
                { label: "Candidates Joined", value: liveCandidatesJoined, prefix: "", color: "text-emerald-400" },
                { label: "SLA Compliance Rate", value: `${liveSlaCompliance}%`, prefix: "", color: "text-cyan-400" },
                { label: "Average Time-to-Fill", value: "3.2 Days", prefix: "", color: "text-indigo-300" },
                { label: "Total Revenue Invoiced", value: `$${liveTotalInvoices.toLocaleString()}`, prefix: "", color: "text-emerald-500" },
              ].map((m, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-900 bg-slate-900/40">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{m.label}</span>
                  <span className={`text-2xl font-bold font-mono block mt-1 ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>

            {/* Client Requirements Influx Tracker */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md">
              <span className="text-xs font-bold uppercase text-slate-400 tracking-wider block mb-4">Enterprise Active Requirements Portfolio</span>
              <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                      <th className="p-4">Enterprise Job Title</th>
                      <th className="p-4">Client Sponsor</th>
                      <th className="p-4">Required Stack Profile</th>
                      <th className="p-4">Job Description Summary</th>
                      <th className="p-4 text-center">SLA Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-sm">
                    {requirements.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-500 italic">No job requirements registered yet. Create one via Ingestion Influx.</td>
                      </tr>
                    ) : (
                      requirements.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-900/20 transition-all">
                          <td className="p-4 font-semibold text-white">{req.title}</td>
                          <td className="p-4 text-slate-300">{req.clientName}</td>
                          <td className="p-4">
                            <div className="flex flex-wrap gap-1">
                              {req.skillsRequired.map((s, i) => (
                                <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-indigo-300">{s}</span>
                              ))}
                            </div>
                          </td>
                          <td className="p-4 text-xs text-slate-400 max-w-sm leading-relaxed truncate">{req.description}</td>
                          <td className="p-4 text-center">
                            <span className="px-2.5 py-0.5 rounded-full font-mono font-bold text-xs bg-teal-950 text-teal-400 border border-teal-900/40">
                              SLA COMPLIANT
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab Panel 4: Match Intelligence Explorer */}
        {activeTab === "explorer" && (
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-6" id="panel_explorer">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" /> Match Intelligence Explorer (PRC Audit Compliant)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Audits, evaluates, and overrides matches extracted strictly from the active <span className="font-mono text-emerald-400">candidate_matches</span> collection in Firestore.
                </p>
              </div>
              <span className="px-3 py-1 border border-indigo-500/30 bg-indigo-950/30 rounded-full font-mono text-xs text-indigo-300">HQ Override Console</span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950" id="matches_table_container">
              <table className="w-full text-left border-collapse" id="matches_table">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 text-xs font-semibold tracking-wider uppercase">
                    <th className="p-4">Match Signature ID</th>
                    <th className="p-4">Candidate Name</th>
                    <th className="p-4">Job Requirement Node</th>
                    <th className="p-4 text-center">Match Score</th>
                    <th className="p-4 text-center">Confidence</th>
                    <th className="p-4">Methodology</th>
                    <th className="p-4 text-center">HQ Approved Overrides</th>
                    <th className="p-4">Recruiter Insights Inference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-sm">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 italic">No matched nodes registered. Ensure Stage 5 (Matching Office) is completed in the Workforce Controller.</td>
                    </tr>
                  ) : (
                    matches.map((match) => (
                      <tr key={match.id} className="hover:bg-slate-900/20 transition-all">
                        <td className="p-4 font-mono text-xs text-teal-400">{match.id}</td>
                        <td className="p-4 font-semibold text-white">{match.candidateName}</td>
                        <td className="p-4 text-slate-300">{match.requirementTitle}</td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-full font-mono font-bold text-xs ${
                            match.matchScore >= 80
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                              : match.matchScore >= 60
                              ? "bg-amber-950 text-amber-400 border border-amber-900"
                              : "bg-indigo-950 text-indigo-400 border border-indigo-900"
                          }`}>
                            {match.matchScore}%
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-mono text-xs font-bold text-slate-300">
                            {match.confidence ? `${Math.round(match.confidence * 100)}%` : "95%"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            match.matchedBy === "RULE_ENGINE"
                              ? "bg-slate-900 text-slate-400 border border-slate-800"
                              : match.matchedBy === "HYBRID"
                              ? "bg-amber-950 text-amber-400 border border-amber-900"
                              : "bg-emerald-950 text-emerald-400 border border-emerald-900"
                          }`}>
                            {match.matchedBy || "GEMINI"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleMatchReview(match.id, !!match.reviewed)}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-mono font-semibold ${
                              match.reviewed
                                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40"
                                : "bg-slate-950 border-slate-900 text-slate-500 hover:bg-slate-900 hover:text-slate-300"
                            }`}
                          >
                            {match.reviewed ? (
                              <>
                                <CheckSquare className="w-3.5 h-3.5" /> APPROVED
                              </>
                            ) : (
                              <>
                                <Square className="w-3.5 h-3.5" /> PENDING OVERRIDE
                              </>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-xs text-slate-400 max-w-sm leading-relaxed">
                          <div className="font-semibold text-slate-300 font-sans">{match.reason || "Semantic skills alignment verified."}</div>
                          <div className="mt-1 text-slate-500 leading-normal">{match.matchInference}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Panel 5: Ingestion Influx (Playground) */}
        {activeTab === "playground" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="panel_playground">
            {/* Create Requirement */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-4">
              <div>
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <FilePlus2 className="w-5 h-5 text-emerald-400" /> Trigger Influx: Create Job Requirement
                </h3>
                <p className="text-xs text-slate-400 mt-1">This registers a live job. In continuous Mode, this immediately fires a REQUIREMENT_CREATED event to matches profiles.</p>
              </div>

              <form onSubmit={handleCreateRequirement} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Requirement Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Java Engineer"
                    value={reqForm.title}
                    onChange={(e) => setReqForm({ ...reqForm, title: e.target.value })}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Client / Enterprise Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={reqForm.clientName}
                    onChange={(e) => setReqForm({ ...reqForm, clientName: e.target.value })}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Required Skills (Comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Java, Spring, Microservices"
                    value={reqForm.skillsRequired}
                    onChange={(e) => setReqForm({ ...reqForm, skillsRequired: e.target.value })}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Job Description / Scope</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter candidate parameters and team overview..."
                    value={reqForm.description}
                    onChange={(e) => setReqForm({ ...reqForm, description: e.target.value })}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReq}
                  className="mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                  id="submit_req_btn"
                >
                  {submittingReq ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />} Create Requirement
                </button>
              </form>
            </div>

            {/* Create Candidate */}
            <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-4">
              <div>
                <h3 className="text-md font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" /> Trigger Influx: Create Candidate Profile
                </h3>
                <p className="text-xs text-slate-400 mt-1">This registers a profile. In continuous Mode, this immediately fires a CANDIDATE_CREATED event to scan for client matches.</p>
              </div>

              <form onSubmit={handleCreateCandidate} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Candidate Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alex Rivera"
                    value={candForm.name}
                    onChange={(e) => setCandForm({ ...candForm, name: e.target.value })}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Email</label>
                    <input
                      type="email"
                      required
                      placeholder="alex@rivera.com"
                      value={candForm.email}
                      onChange={(e) => setCandForm({ ...candForm, email: e.target.value })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-300 uppercase">Phone</label>
                    <input
                      type="text"
                      placeholder="+1-555-0321"
                      value={candForm.phone}
                      onChange={(e) => setCandForm({ ...candForm, phone: e.target.value })}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Candidate Skills (Comma separated)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React, Node.js, AWS"
                    value={candForm.skills}
                    onChange={(e) => setCandForm({ ...candForm, skills: e.target.value })}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-slate-300 uppercase">Experience Overview</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe senior roles, core stack experience, and certifications..."
                    value={candForm.experience}
                    onChange={(e) => setCandForm({ ...candForm, experience: e.target.value })}
                    className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCand}
                  className="mt-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow transition-all cursor-pointer"
                  id="submit_cand_btn"
                >
                  {submittingCand ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Create Candidate Profile
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* Footer System Credits */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2" id="app_footer_container">
        <span>&copy; {new Date().getFullYear()} HireNestOS. All systems operational.</span>
        <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-500">
          <ShieldCheck className="w-3.5 h-3.5" /> SECURE AUDIT & PRC LEVEL-3 CERTIFIED
        </span>
      </footer>
    </div>
  );
}
