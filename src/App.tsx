import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  Play,
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
  Activity
} from "lucide-react";
import { Candidate, Requirement, CandidateMatch, BootstrapStage, SystemMetrics } from "./types.ts";

export default function App() {
  const [stages, setStages] = useState<BootstrapStage[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalRequirements: 0,
    totalCandidates: 0,
    totalMatches: 0,
    reconciliationRate: 0,
    continuousMode: false,
  });
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);

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

  const [activeTab, setActiveTab] = useState<"control" | "explorer" | "playground">("control");
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
    const interval = setInterval(fetchSystemData, 2000); // Poll every 2s for live reconciliation/matching logging
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
              HireNestOS <span className="text-xs px-2 py-0.5 rounded-full border border-teal-500/30 bg-teal-950/40 text-teal-300 font-mono ml-2">v2.0</span>
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
        <section className="flex border-b border-slate-900" id="tabs_navigation">
          <button
            onClick={() => setActiveTab("control")}
            className={`px-5 py-3 text-sm font-semibold tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "control"
                ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            id="tab_control_btn"
          >
            Workforce Controller
          </button>
          <button
            onClick={() => setActiveTab("explorer")}
            className={`px-5 py-3 text-sm font-semibold tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "explorer"
                ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            id="tab_explorer_btn"
          >
            Match Intelligence Explorer
          </button>
          <button
            onClick={() => setActiveTab("playground")}
            className={`px-5 py-3 text-sm font-semibold tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "playground"
                ? "border-emerald-500 text-emerald-400 bg-emerald-950/10"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
            id="tab_playground_btn"
          >
            Ingestion Influx (Live Mode Trigger)
          </button>
        </section>

        {/* Tab Panel 1: Workforce Controller */}
        {activeTab === "control" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="panel_control">
            {/* Left Hand: Controller & Stages */}
            <div className="lg:col-span-7 flex flex-col gap-6" id="control_flow_stages">
              <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Cpu className="w-5 h-5 text-emerald-400" /> Unified Workforce Control Engine
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Orchestrates preflight database scans, legacy index-rebuilding, relationship matching, and vendor routing.</p>
                  </div>
                  
                  {/* Master Button Action */}
                  <button
                    onClick={() => handleRunBootstrap(false)}
                    className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 hover:shadow-emerald-950/60 transition-all duration-300 transform active:scale-95 cursor-pointer"
                    id="run_workforce_btn"
                  >
                    <Play className="w-4 h-4 fill-current" /> Run Workforce
                  </button>
                </div>

                {/* Sub-Actions / Fine Grained Targeted Tools */}
                <div className="mt-6 pt-6 border-t border-slate-900/80">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500 block mb-3">Targeted Admin Repair Operations</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { name: "Rebuild Business Graph", icon: Share2 },
                      { name: "Recalculate Matches", icon: RotateCw },
                      { name: "Vendor Broadcast", icon: Zap },
                      { name: "Repair Relationships", icon: Heart },
                      { name: "Repair Notifications", icon: AlertTriangle },
                      { name: "Resume Runtime", icon: Activity },
                    ].map((op) => (
                      <button
                        key={op.name}
                        onClick={() => handleTargetedOperation(op.name)}
                        className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800/80 rounded-lg text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                        id={`targeted_btn_${op.name.replace(/\s+/g, "_")}`}
                      >
                        <op.icon className="w-3.5 h-3.5 text-teal-400" /> {op.name}
                      </button>
                    ))}
                  </div>
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
                    <span className="text-slate-500 italic">No events or logs recorded yet. Press "Run Workforce" to activate.</span>
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

        {/* Tab Panel 2: Match Intelligence Explorer */}
        {activeTab === "explorer" && (
          <div className="p-6 rounded-2xl border border-slate-900 bg-slate-900/20 backdrop-blur-md flex flex-col gap-6" id="panel_explorer">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" /> Match Intelligence Ledger (Governance Audit Compliant)
              </h2>
              <p className="text-xs text-slate-400 mt-1">This component is audited and displays matches extracted strictly from the active <span className="font-mono text-emerald-400">candidate_matches</span> collection in Firestore.</p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-900 bg-slate-950" id="matches_table_container">
              <table className="w-full text-left border-collapse" id="matches_table">
                <thead>
                  <tr className="border-b border-slate-900 bg-slate-900/40 text-slate-400 text-xs font-semibold tracking-wider uppercase">
                    <th className="p-4 font-mono">Match Signature ID</th>
                    <th className="p-4">Candidate Profile</th>
                    <th className="p-4">Job Requirement Node</th>
                    <th className="p-4 text-center">Inference Score</th>
                    <th className="p-4">Semantic Overrides / Recruiter Insight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-sm">
                  {matches.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">No matched nodes registered. Ensure Stage 6 (Generate Matches) is completed in the Workforce Controller.</td>
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
                        <td className="p-4 text-xs text-slate-400 max-w-sm leading-relaxed">{match.matchInference}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab Panel 3: Ingestion Influx (Playground) */}
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
