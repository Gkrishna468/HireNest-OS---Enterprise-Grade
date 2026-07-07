// src/views/AIOpsCenter/AIWorkforce.tsx
import React, { useState, useMemo } from "react";
import { 
  Bot, 
  User, 
  Users, 
  Settings, 
  Play, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Send,
  Calendar,
  Network,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  Inbox,
  Award,
  Compass,
  FolderOpen,
  FileSpreadsheet,
  Check,
  FileText,
  UserCheck
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Agent, AIReport } from "./AIOpsTypes";

interface AIWorkforceProps {
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  agents: Agent[];
  onToggleAgent: (id: string, enabled: boolean) => void;
  onTriggerAgent: (id: string) => void;
  isTriggering: Record<string, boolean>;
  onGenerateReport: (type: string) => void;
  reportResult: string | null;
  isGeneratingReport: boolean;
  reports: AIReport[];
  onAcknowledgeReport: (id: string) => void;
}

export default function AIWorkforce({
  activeSubTab,
  setActiveSubTab,
  agents,
  onToggleAgent,
  onTriggerAgent,
  isTriggering,
  onGenerateReport,
  reportResult,
  isGeneratingReport,
  reports = [],
  onAcknowledgeReport
}: AIWorkforceProps) {
  
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Organization Chart selected node
  const [selectedOrgNode, setSelectedOrgNode] = useState<{ id: string; name: string; type: 'HUMAN' | 'AI'; role: string; dept: string; reportsTo?: string; kpis: string } | null>(null);

  // AI Inbox selected report state
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Performance Reviews state
  const [reviewAgentId, setReviewAgentId] = useState<string>("founder-office");
  const [isGeneratingScorecard, setIsGeneratingScorecard] = useState<boolean>(false);
  const [compiledScorecard, setCompiledScorecard] = useState<string | null>(null);

  // Collaboration graph selected step
  const [selectedGraphStep, setSelectedGraphStep] = useState<string | null>("step-1");

  // Playbooks active step checkmark state
  const [playbookChecks, setPlaybookChecks] = useState<Record<string, boolean>>({
    'verify-abac': true,
    'validate-credentials': true,
    'check-sla': false,
    'override-score': false
  });

  // Knowledge center selected file
  const [selectedPromptFile, setSelectedPromptFile] = useState<string | null>("directives-matcher");

  // Automatic Reporting Config state
  const [reportsConfig, setReportsConfig] = useState({
    requirementsDaily: true,
    candidatesWeekly: true,
    clientVendorMonthly: false,
    errorsRealtime: true,
    deliverToBdm: true,
    deliverToSlack: true,
    deliverToCeo: false
  });

  const selectedAgent = useMemo(() => {
    return agents.find(a => a.id === selectedAgentId) || null;
  }, [agents, selectedAgentId]);

  const selectedReport = useMemo(() => {
    return reports.find(r => r.id === selectedReportId) || reports[0] || null;
  }, [reports, selectedReportId]);

  // Org chart data representing hierarchical node layout
  const orgChartNodes = useMemo(() => [
    // Level 1: Leadership & Strategic
    { id: "lead-01", name: "Bruce Wayne", type: "HUMAN" as const, role: "Talent Director / Owner", dept: "Founder Office", reportsTo: "The Board", kpis: "Net Placement Rate: 98%, SLA Violations: 0" },
    { id: "lead-02", name: "Diana Prince", type: "HUMAN" as const, role: "VP Strategic Operations", dept: "Operations", reportsTo: "CEO", kpis: "Ecosystem Health: 98.4%, Strategic Revenue: $425K" },
    { id: "ai-01", name: "Alpha Executive (AI)", type: "AI" as const, role: "Strategic Advisor / Liaison", dept: "Founder Office", reportsTo: "Bruce Wayne", kpis: "Confidence Score: 98.7%, Saved Recruiter Hours: 124h" },
    
    // Level 2: Growth & Ecosystem Managers
    { id: "grow-01", name: "Tony Stark", type: "HUMAN" as const, role: "GTM Growth Lead", dept: "Growth & Sales", reportsTo: "Diana Prince", kpis: "Active Campaign Influence: $180K, Client Conversion: +18%" },
    { id: "grow-02", name: "Clark Kent", type: "HUMAN" as const, role: "Ecosystem Partner Mgr", dept: "Ecosystem Core", reportsTo: "Diana Prince", kpis: "Active Vendors: 12, Average Vendor Trust Score: 98.2%" },
    { id: "ai-02", name: "Siri GTM (AI)", type: "AI" as const, role: "Growth Campaign Auto", dept: "Growth & Sales", reportsTo: "Tony Stark", kpis: "Email open-rate: 45%, Generated leads today: 4" },
    { id: "ai-03", name: "Vance Vendor (AI)", type: "AI" as const, role: "Vendor Trust Coordinator", dept: "Ecosystem Core", reportsTo: "Clark Kent", kpis: "Pending credentials verified: 14, Trust updates: Daily" },
    
    // Level 3: Recruitment & CS Core
    { id: "rec-01", name: "Peter Parker", type: "HUMAN" as const, role: "CS Delivery Lead", dept: "Ecosystem Core", reportsTo: "Diana Prince", kpis: "Submittal Latency: 12 mins avg, Open Requirements closed: 8" },
    { id: "rec-02", name: "Steve Rogers", type: "HUMAN" as const, role: "Operations Coordinator", dept: "Operations", reportsTo: "Diana Prince", kpis: "Successful interview confirmations: 94%, Candidate response rate: 98%" },
    { id: "ai-04", name: "Conrad Conductor (AI)", type: "AI" as const, role: "Recruiter Conductor", dept: "Ecosystem Core", reportsTo: "Bruce Wayne", kpis: "Resumes parsed today: 124, Match scoring confidence: 96%" },
    { id: "ai-05", name: "Cleo CS (AI)", type: "AI" as const, role: "Customer Experience Bot", dept: "Ecosystem Core", reportsTo: "Peter Parker", kpis: "SLA delays auto-escalated: 100%, Chat response delay: 0.2s" },
    { id: "ai-06", name: "Sam Scheduler (AI)", type: "AI" as const, role: "Calendar Sync Coordinator", dept: "Operations", reportsTo: "Steve Rogers", kpis: "Auto-synced calendar matches: 14, Discrepancies cleared: 1" }
  ], []);

  // Organize nodes by depth levels for simple CSS block tree rendering
  const orgLevels = useMemo(() => {
    return {
      level1: orgChartNodes.filter(n => ["lead-01", "lead-02", "ai-01"].includes(n.id)),
      level2: orgChartNodes.filter(n => ["grow-01", "grow-02", "ai-02", "ai-03"].includes(n.id)),
      level3: orgChartNodes.filter(n => ["rec-01", "rec-02", "ai-04", "ai-05", "ai-06"].includes(n.id))
    };
  }, [orgChartNodes]);

  // Handle scorecard compilation
  const handleCompileScorecard = async () => {
    setIsGeneratingScorecard(true);
    setCompiledScorecard(null);
    await new Promise(r => setTimeout(r, 1200)); // Smooth simulation delay

    const target = agents.find(a => a.id === reviewAgentId) || agents[0];
    const scoreVal = target ? (target.successRate || 98.4) : 98.4;
    const runs = target ? (target.execsToday || 12) : 12;

    const summaryText = `### PERFORMANCE REVIEW & AUDIT REPORT CARD
Digital Employee ID: ${reviewAgentId}
Name: ${target?.name || "Alpha Employee"}
Evaluation Period: Q3 2026 Sandbox Audit

1. PERFORMANCE METRICS LEDGER:
=========================================
- Task Alignment Accuracy: ${scoreVal}% Sourced Precision
- Autonomous Execution Count: ${runs} runs today
- System Latency Mean: 1120ms Round-Trip Time
- Model Gateway Configuration: gemini-1.5-pro

2. TRUST & SLA ANALYSIS:
=========================================
- Human Escalation Flags: 0 nominal manual overrides
- ABAC Scope Isolation: 100% compliant, zero cross-org leaks
- Circuit Breaker Incidents: None. Daily Token Limit cap was kept.

3. RECOMMENDATION DECISION:
=========================================
- CONTEXTUAL ASSESSMENT: Agent operates at extreme maturity. Suggest increasing the budget threshold cap from 5,000,000 to 10,000,000 tokens daily to allow automated sourcing workflows during high-volume recruitment surges.`;

    setCompiledScorecard(summaryText);
    setIsGeneratingScorecard(false);
  };

  return (
    <div className="flex flex-col flex-1 gap-6">
      
      {/* 1. Digital Employee Registry tab */}
      {activeSubTab === 'registry' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">AI Workforce Registry</h2>
              <p className="text-xs text-slate-400">Manage and audit dedicated digital employees, their reporting structures, ownership and tasks.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold animate-pulse">
              Registry Live
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            {/* Table list of named digital employees */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs bg-[#070A13] border border-slate-900 rounded-2xl overflow-hidden">
                <thead>
                  <tr className="bg-[#0c111f] border-b border-slate-900 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-4">Agent Employee Details</th>
                    <th className="p-4">Department</th>
                    <th className="p-4">Assigned Owner</th>
                    <th className="p-4">Reports To</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {agents.map((agt) => (
                    <tr 
                      key={agt.id}
                      onClick={() => setSelectedAgentId(agt.id)}
                      className={cn("hover:bg-[#0d1222] transition-colors cursor-pointer", 
                        selectedAgentId === agt.id ? "bg-indigo-600/5" : ""
                      )}
                    >
                      <td className="p-4 flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                          <Bot size={16} />
                        </div>
                        <div>
                          <span className="font-bold text-white block">{agt.name}</span>
                          <span className="text-[9px] text-indigo-400 uppercase font-black">{agt.id}</span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-300">{agt.department || "Ecosystem Core"}</td>
                      <td className="p-4 font-medium text-slate-300">{agt.ownerName || "Bruce Wayne"}</td>
                      <td className="p-4 font-medium text-slate-300">{agt.reportsTo || "Bruce Wayne"}</td>
                      <td className="p-4">
                        <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border", 
                          agt.enabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-slate-500/10 text-slate-400 border-slate-900"
                        )}>
                          {agt.enabled ? "ACTIVE" : "PAUSED"}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronRight size={14} className="inline text-slate-500" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Accountability attributes details drawer */}
            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[480px]">
              {selectedAgent ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  {/* Registry profile details */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Agent Employee Credentials</span>
                        <h4 className="text-xs font-black text-white">{selectedAgent.name}</h4>
                        <span className="text-[9px] font-mono text-slate-500">{selectedAgent.id} • {selectedAgent.model || "gemini-1.5-pro"}</span>
                      </div>
                      <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 border rounded-full",
                        selectedAgent.enabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-slate-500/10 border-slate-900 text-slate-500"
                      )}>
                        {selectedAgent.enabled ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>

                    {/* Operational Accountability Specs */}
                    <div className="space-y-2.5">
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-900 text-[11px] hover:border-slate-800 transition-colors">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Assigned Owner / Reports To</span>
                        <span className="font-bold text-slate-300">Owner: {selectedAgent.ownerName} • Reports: {selectedAgent.reportsTo}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-900 text-[11px] hover:border-slate-800 transition-colors">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Approval Authority Bounds</span>
                        <span className="font-bold text-indigo-400">{selectedAgent.approvalAuthority || "Executive Override Required"}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0b0f19] border border-slate-900 text-[11px] hover:border-slate-800 transition-colors">
                        <span className="text-[9px] text-indigo-400 uppercase font-bold block">Current Task / Action</span>
                        <span className="font-medium text-slate-300">{selectedAgent.currentTask || "Idle. Monitoring event listeners."}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-900 text-[11px] hover:border-slate-800 transition-colors">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Next Scheduled Task</span>
                        <span className="font-bold text-slate-300">{selectedAgent.nextTask || "Trigger on event bus callbacks"}</span>
                      </div>
                    </div>

                    {/* Simple performance indicators */}
                    <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950 p-2.5 rounded-xl border border-slate-900/60">
                      <div>
                        <span className="text-slate-500 uppercase block font-bold">Success Ratio</span>
                        <span className="text-emerald-400 font-bold">{selectedAgent.successRate || 98.7}%</span>
                      </div>
                      <div>
                        <span className="text-slate-500 uppercase block font-bold">Today Execs</span>
                        <span className="text-white font-bold">{selectedAgent.execsToday || 12} times</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions for agent */}
                  <div className="border-t border-slate-900/60 pt-3 flex items-center justify-between gap-3">
                    <button
                      onClick={() => onToggleAgent(selectedAgent.id, !selectedAgent.enabled)}
                      className={cn("flex-1 py-2 rounded-xl text-[10px] font-black uppercase border tracking-wider transition-all",
                        selectedAgent.enabled 
                          ? "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white"
                          : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white"
                      )}
                    >
                      {selectedAgent.enabled ? "Pause Employee" : "Resume Employee"}
                    </button>
                    <button
                      onClick={() => onTriggerAgent(selectedAgent.id)}
                      disabled={isTriggering[selectedAgent.id] || !selectedAgent.enabled}
                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Play size={10} />
                      {isTriggering[selectedAgent.id] ? "Conducting..." : "Force Run Task"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Bot size={36} className="text-slate-600 animate-bounce" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Select Digital Employee</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits reporting structures, next tasks, approval authority bounds, and performance metrics.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. AI Inbox & Briefs tab */}
      {activeSubTab === 'inbox' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">AI Inbox & Operational Briefings</h2>
              <p className="text-xs text-slate-400">Review, acknowledge, and audit reports dynamically compiled by the digital workforce directly from the Firestore SSOT.</p>
            </div>
            <span className="text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 font-bold px-2.5 py-1 rounded-full uppercase">
              {reports.filter(r => r.status === 'unread').length} Unacknowledged Briefings
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            {/* Live Mail inbox list */}
            <div className="flex-1 space-y-3 max-h-[460px] overflow-y-auto pr-2">
              {reports.length === 0 ? (
                <div className="p-8 text-center bg-[#070A13] border border-slate-900 rounded-2xl text-slate-500 text-xs">
                  No active brief notifications compiled in this workspace session.
                </div>
              ) : (
                reports.map(rep => (
                  <div 
                    key={rep.id}
                    onClick={() => setSelectedReportId(rep.id)}
                    className={cn("p-4 border rounded-2xl cursor-pointer transition-all hover:bg-[#0c1121] flex justify-between items-start",
                      selectedReportId === rep.id ? "bg-[#0B1226] border-indigo-500/40" : "bg-[#070A13] border-slate-900/80",
                      rep.status === 'unread' ? "border-l-4 border-l-red-500" : ""
                    )}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white block">{rep.title}</span>
                        {rep.status === 'unread' && (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-medium">Compiled by: <span className="text-indigo-400 font-bold">{rep.agentName}</span> ({rep.agentId})</span>
                      <span className="text-[9px] text-slate-500 block font-mono">{new Date(rep.timestamp).toLocaleString()}</span>
                    </div>

                    <div className="flex flex-col items-end gap-2.5">
                      <span className={cn("text-[8px] font-black uppercase px-2 py-0.5 rounded border",
                        rep.status === 'unread' ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      )}>
                        {rep.status === 'unread' ? "UNREAD" : "ACKNOWLEDGED"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Read-Only Mail view pane */}
            <div className="w-full xl:w-[480px] bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[460px]">
              {selectedReport ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Briefing Memo Summary</span>
                          <h4 className="text-sm font-black text-white">{selectedReport.title}</h4>
                        </div>
                        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 border rounded-full",
                          selectedReport.status === 'unread' ? "bg-red-500/10 border-red-500/20 text-red-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        )}>
                          {selectedReport.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-2">
                        Sender Employee: <span className="font-bold text-white">{selectedReport.agentName}</span> ({selectedReport.agentId})
                      </span>
                    </div>

                    {/* Pre-formatted Markdown report body */}
                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-900 font-mono text-[10px] text-slate-300 leading-relaxed max-h-[220px] overflow-y-auto whitespace-pre-wrap select-text">
                      {selectedReport.content}
                    </div>

                    {/* Acknowledged status details block */}
                    {selectedReport.status === 'acknowledged' && (
                      <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-2.5 text-[10px] text-emerald-400 font-medium">
                        <CheckCircle2 size={14} />
                        <div>
                          <span>Acknowledged & Synced to BDM Team channels.</span>
                          <span className="block text-[8px] text-slate-500">
                            By {selectedReport.acknowledgedBy || "Admin"} at {selectedReport.acknowledgedAt ? new Date(selectedReport.acknowledgedAt).toLocaleTimeString() : ""}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {selectedReport.status === 'unread' ? (
                    <button
                      onClick={() => onAcknowledgeReport(selectedReport.id)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <UserCheck size={14} />
                      Acknowledge & Sync to BDM Team
                    </button>
                  ) : (
                    <div className="w-full py-2 bg-slate-900 text-slate-500 rounded-xl text-xs font-black uppercase tracking-wider text-center border border-slate-800">
                      Brief verified
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Inbox size={36} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Select Operational Briefing</p>
                  <p className="text-[10px] text-slate-500">Click on any compiled digital employee summary on the left to read its data audits and trigger syncs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Performance Reviews tab */}
      {activeSubTab === 'reviews' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">AI Employee Performance & Scorecards</h2>
              <p className="text-xs text-slate-400">Acknowledge scorecard ratings, SLA accuracy indices, and token usage budgets for individual digital employees.</p>
            </div>
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2.5 py-1 rounded-full uppercase">
              Workforce Optimization
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            {/* Setup selection panel */}
            <div className="flex-1 bg-[#070A13] border border-slate-900 rounded-2xl p-6 space-y-6 max-h-[460px] overflow-y-auto">
              <span className="text-xs font-bold text-white block border-b border-slate-900 pb-2">Evaluate Digital Employee</span>
              
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-black block mb-1.5">Select Agent profile</label>
                  <select 
                    value={reviewAgentId}
                    onChange={(e) => setReviewAgentId(e.target.value)}
                    className="w-full p-3 bg-slate-950 border border-slate-900 rounded-xl text-xs font-bold text-white focus:border-indigo-500 transition-colors"
                  >
                    {agents.map(agt => (
                      <option key={agt.id} value={agt.id}>{agt.name} ({agt.id})</option>
                    ))}
                  </select>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-900/80 space-y-3 text-xs leading-relaxed text-slate-400">
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span>Performance Target SLA:</span>
                    <span className="font-bold text-emerald-400">95% minimum compliance</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-900 pb-2">
                    <span>Risk Category Isolation:</span>
                    <span className="font-bold text-white">Strict ABAC Matrix</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Verification Loop:</span>
                    <span className="font-bold text-indigo-400">Recruiter Overrides Enabled</span>
                  </div>
                </div>

                <button
                  onClick={handleCompileScorecard}
                  disabled={isGeneratingScorecard}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-900 disabled:text-slate-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                >
                  <Award size={14} />
                  {isGeneratingScorecard ? "Computing ratings & logs..." : "Generate Performance Scorecard"}
                </button>
              </div>
            </div>

            {/* Compiled Card Output display */}
            <div className="w-full xl:w-[480px] bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[460px]">
              {isGeneratingScorecard ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-400 space-y-2">
                  <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">Aggregating Cognitive Telemetry Logs</p>
                  <p className="text-[10px] text-slate-500">Analyzing matching accuracy and daily token budget ratios from Firestore SSOT...</p>
                </div>
              ) : compiledScorecard ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider block">Compiled Performance Scorecard</span>
                    <pre className="p-4 bg-slate-950/80 rounded-xl border border-slate-900 font-mono text-[9px] text-slate-300 leading-relaxed max-h-[340px] overflow-y-auto whitespace-pre-wrap select-text">
                      {compiledScorecard}
                    </pre>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => alert("Quarterly Scorecard signed off and recorded in Governance Trace logs!")}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition-colors"
                    >
                      Sign Off Scorecard
                    </button>
                    <button 
                      onClick={() => setCompiledScorecard(null)}
                      className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-slate-400 text-xs font-bold uppercase border border-slate-900 rounded-xl transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Award size={36} className="text-slate-600 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Performance Scorecard Panel</p>
                  <p className="text-[10px] text-slate-500 max-w-[240px]">Select a digital employee on the left and click Generate to parse their active transaction latency and match precision ratings.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Collaboration Graph tab */}
      {activeSubTab === 'collaboration' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">AI Collaboration Graph</h2>
              <p className="text-xs text-slate-400">Observe how event transmissions synchronize cognitive workflows across human recruiters and digital employees.</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full uppercase">
              Event Routing Graph
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            
            {/* SVG Visual Graph Container */}
            <div className="flex-1 bg-[#05070D] border border-slate-900 rounded-2xl p-6 min-h-[380px] flex flex-col justify-between items-center">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-4">ACTIVE DEPLOYMENT INTERACTION MAP</span>
              
              <div className="flex flex-col lg:flex-row items-center gap-6 py-4">
                
                {/* Node 1: Requirement Creation */}
                <div 
                  onClick={() => setSelectedGraphStep("step-1")}
                  className={cn("p-3 rounded-xl border w-40 text-center cursor-pointer transition-all",
                    selectedGraphStep === 'step-1' ? "border-indigo-500 bg-indigo-500/10" : "bg-slate-950 border-slate-900"
                  )}
                >
                  <span className="text-[10px] font-bold text-white block">1. Requirement Created</span>
                  <span className="text-[8px] text-slate-500 font-mono">By BDM Diana Prince</span>
                </div>

                <div className="text-slate-700 font-black lg:rotate-0 rotate-90">➔</div>

                {/* Node 2: Recruiter Conductor */}
                <div 
                  onClick={() => setSelectedGraphStep("step-2")}
                  className={cn("p-3 rounded-xl border w-40 text-center cursor-pointer transition-all",
                    selectedGraphStep === 'step-2' ? "border-indigo-500 bg-indigo-500/10" : "bg-slate-950 border-slate-900"
                  )}
                >
                  <span className="text-[10px] font-bold text-indigo-400 block">2. Conrad Conductor</span>
                  <span className="text-[8px] text-emerald-400 font-mono">Match Matrix Score</span>
                </div>

                <div className="text-slate-700 font-black lg:rotate-0 rotate-90">➔</div>

                {/* Node 3: GTM Outreach */}
                <div 
                  onClick={() => setSelectedGraphStep("step-3")}
                  className={cn("p-3 rounded-xl border w-40 text-center cursor-pointer transition-all",
                    selectedGraphStep === 'step-3' ? "border-indigo-500 bg-indigo-500/10" : "bg-slate-950 border-slate-900"
                  )}
                >
                  <span className="text-[10px] font-bold text-indigo-400 block">3. Siri GTM Marketer</span>
                  <span className="text-[8px] text-slate-500 font-mono">Outreach Dispatch</span>
                </div>

                <div className="text-slate-700 font-black lg:rotate-0 rotate-90">➔</div>

                {/* Node 4: Calendar Sync */}
                <div 
                  onClick={() => setSelectedGraphStep("step-4")}
                  className={cn("p-3 rounded-xl border w-40 text-center cursor-pointer transition-all",
                    selectedGraphStep === 'step-4' ? "border-indigo-500 bg-indigo-500/10" : "bg-slate-950 border-slate-900"
                  )}
                >
                  <span className="text-[10px] font-bold text-white block">4. Sam Scheduler</span>
                  <span className="text-[8px] text-amber-500 font-mono">Recruiter Override</span>
                </div>

              </div>

              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-900 text-[10px] text-slate-500 flex items-center gap-2">
                <Sparkles size={12} className="text-indigo-400" />
                <span>Tip: Click on any step block to view detailed event trigger routing parameters and governing policies.</span>
              </div>
            </div>

            {/* Selected step metadata audit panel */}
            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[380px]">
              {selectedGraphStep === 'step-1' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Intake Event Trigger</span>
                      <h4 className="text-xs font-black text-white">Event: REQUIREMENT_CREATED</h4>
                    </div>
                    <div className="space-y-2.5 text-[11px] leading-relaxed text-slate-400">
                      <p><span className="font-bold text-white">Origin:</span> Manual entry by Recruiter / BDM in Client Workspace.</p>
                      <p><span className="font-bold text-white">System Action:</span> Pushes immediate JSON payload to operational Firestore event bus (`agent_queue`).</p>
                      <p><span className="font-bold text-indigo-400">Governing Policy:</span> **SLA-RITL-02** (Ensures no match notifications are transmitted without explicit human approval validation).</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Routing Verified • ABAC Secure</span>
                </div>
              )}

              {selectedGraphStep === 'step-2' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Match Matrix Phase</span>
                      <h4 className="text-xs font-black text-white">Conrad Conductor (AI Employee)</h4>
                    </div>
                    <div className="space-y-2.5 text-[11px] leading-relaxed text-slate-400">
                      <p><span className="font-bold text-white">System Action:</span> Triggers semantic query matching over candidate pool matching registries.</p>
                      <p><span className="font-bold text-white">Model Parameters:</span> gemini-1.5-pro (temperature: 0.1, system-prompt version: v4.2)</p>
                      <p><span className="font-bold text-indigo-400">Governing Policy:</span> **ABAC-Token-01** (Enforces scoped token boundaries, ensuring no workspace data is processed across distinct client boundaries).</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Routing Verified • ABAC Secure</span>
                </div>
              )}

              {selectedGraphStep === 'step-3' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Outreach Outreach phase</span>
                      <h4 className="text-xs font-black text-white">Siri GTM Marketer (AI Employee)</h4>
                    </div>
                    <div className="space-y-2.5 text-[11px] leading-relaxed text-slate-400">
                      <p><span className="font-bold text-white">System Action:</span> Compiles candidate list details and auto-drafts tailored submittal summaries.</p>
                      <p><span className="font-bold text-white">Security Bound:</span> Enforces strict outbound rate limiting (maximum 12 campaign transmissions per hour to prevent spam flags).</p>
                      <p><span className="font-bold text-indigo-400">Governing Policy:</span> **Budget-Gate-03** (Circuit-breaker limit blocks campaigns if cost limit index threshold is breached).</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Routing Verified • ABAC Secure</span>
                </div>
              )}

              {selectedGraphStep === 'step-4' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Human Verification Override</span>
                      <h4 className="text-xs font-black text-white">Sam Scheduler (SLA Coordination)</h4>
                    </div>
                    <div className="space-y-2.5 text-[11px] leading-relaxed text-slate-400">
                      <p><span className="font-bold text-white">System Action:</span> Escales parsed interview candidates to Steve Rogers (Operations Manager) to verify calendar alignments.</p>
                      <p><span className="font-bold text-white">Recruiter Override:</span> Bruce Wayne maintains absolute veto authority. AI proposals can be deleted or adjusted instantly.</p>
                      <p><span className="font-bold text-emerald-400">Outcome:</span> Seamless human-in-the-loop operation, eliminating false notifications or incorrect bookings.</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Routing Verified • ABAC Secure</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 5. Playbooks tab */}
      {activeSubTab === 'playbooks' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Operational Playbooks & SOPs</h2>
              <p className="text-xs text-slate-400">Verify standard operating guidelines defining roles and interaction limits for hybrid human-AI teams.</p>
            </div>
            <span className="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold px-2.5 py-1 rounded-full uppercase">
              Playbook SOPs
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            
            {/* Playbook checklist panel */}
            <div className="flex-1 bg-[#070A13] border border-slate-900 rounded-2xl p-6 space-y-6 max-h-[460px] overflow-y-auto">
              <div>
                <span className="text-xs font-bold text-white block">SOP Guide: Placement Verification & Submittal Loop</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Standard procedure for processing strategic match proposal overrides.</span>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-900/80 hover:border-slate-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={playbookChecks['verify-abac']} 
                    onChange={() => setPlaybookChecks(prev => ({ ...prev, 'verify-abac': !prev['verify-abac'] }))}
                    className="mt-0.5 rounded accent-indigo-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Step 1: Enforce ABAC Token Boundaries</span>
                    <span className="text-[9px] text-slate-500 font-medium">Verify that the digital employee is configured with distinct client workspace environment tokens. No cross-org memory exposure allowed.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-900/80 hover:border-slate-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={playbookChecks['validate-credentials']} 
                    onChange={() => setPlaybookChecks(prev => ({ ...prev, 'validate-credentials': !prev['validate-credentials'] }))}
                    className="mt-0.5 rounded accent-indigo-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Step 2: Validate Sourced Candidate Credentials</span>
                    <span className="text-[9px] text-slate-500 font-medium">Run resume parses through Layers 1 & 2 semantic models to confirm certifications. Ensure no invalid profiles are proposable.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-900/80 hover:border-slate-800 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={playbookChecks['check-sla']} 
                    onChange={() => setPlaybookChecks(prev => ({ ...prev, 'check-sla': !prev['check-sla'] }))}
                    className="mt-0.5 rounded accent-indigo-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Step 3: Track Intake-to-Match SLA Delay Window</span>
                    <span className="text-[9px] text-slate-500 font-medium">Confirm that the match calculation latency index does not exceed the designated 48-hour client response window.</span>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-[#0b0f19] border border-slate-900/80 hover:border-indigo-500/20 transition-colors">
                  <input 
                    type="checkbox" 
                    checked={playbookChecks['override-score']} 
                    onChange={() => setPlaybookChecks(prev => ({ ...prev, 'override-score': !prev['override-score'] }))}
                    className="mt-0.5 rounded accent-indigo-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-300 block">Step 4: Recruiter Match Score Override validation</span>
                    <span className="text-[9px] text-indigo-400 font-medium">Absolute manual sign-off required by BDM Diana Prince or Owner Bruce Wayne before final client notification is dispatched.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Playbook details side panel */}
            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="border-b border-slate-900 pb-3">
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Compliance Audit Summary</span>
                    <h4 className="text-xs font-black text-white">SOP Progress & Certification</h4>
                  </div>

                  <div className="space-y-3 text-xs text-slate-400">
                    <p>
                      This playbook enforces complete operational governance for hybrid workflows, ensuring high-fidelity matches with robust security gates.
                    </p>
                    <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-900 space-y-2">
                      <div className="flex justify-between text-[11px]">
                        <span>Checked Steps:</span>
                        <span className="font-bold text-white">
                          {Object.values(playbookChecks).filter(Boolean).length} / {Object.keys(playbookChecks).length}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div 
                          className="bg-indigo-500 h-full transition-all duration-300" 
                          style={{ width: `${(Object.values(playbookChecks).filter(Boolean).length / Object.keys(playbookChecks).length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (Object.values(playbookChecks).filter(Boolean).length === Object.keys(playbookChecks).length) {
                      alert("SOP Loop Certified successfully! Audit token saved to trace logs.");
                    } else {
                      alert("Please complete and check all checklist steps before certifying the SOP playbooks.");
                    }
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition-colors"
                >
                  Certify SOP Loop Compliance
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 6. Platform Knowledge Center tab */}
      {activeSubTab === 'knowledge' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Platform Knowledge Center</h2>
              <p className="text-xs text-slate-400">Version-controlled repository for Prompt directives, grounding parameters, and system guidelines.</p>
            </div>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold px-2.5 py-1 rounded-full uppercase">
              Directives Repo v4.2
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            
            {/* Versioned Folder Tree selection list */}
            <div className="flex-1 bg-[#070A13] border border-slate-900 rounded-2xl p-5 space-y-4 max-h-[460px] overflow-y-auto">
              <span className="text-xs font-bold text-white block border-b border-slate-900 pb-2">Cognitive Files Directory</span>
              
              <div className="space-y-2">
                <div 
                  onClick={() => setSelectedPromptFile("directives-matcher")}
                  className={cn("p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                    selectedPromptFile === 'directives-matcher' ? "bg-[#0b1021] border-indigo-500/40" : "bg-slate-950 border-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={14} className="text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">candidate_matcher_v4.2.txt</span>
                      <span className="text-[9px] text-slate-500">System prompt instructions for Conrad Conductor</span>
                    </div>
                  </div>
                  <span className="text-[8px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">v4.2.1</span>
                </div>

                <div 
                  onClick={() => setSelectedPromptFile("rules-vendor")}
                  className={cn("p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                    selectedPromptFile === 'rules-vendor' ? "bg-[#0b1021] border-indigo-500/40" : "bg-slate-950 border-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={14} className="text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">vendor_trust_index_rules.json</span>
                      <span className="text-[9px] text-slate-500">Grounding rules governing partners Trust Indices</span>
                    </div>
                  </div>
                  <span className="text-[8px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">v1.0.4</span>
                </div>

                <div 
                  onClick={() => setSelectedPromptFile("directives-sla")}
                  className={cn("p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between",
                    selectedPromptFile === 'directives-sla' ? "bg-[#0b1021] border-indigo-500/40" : "bg-slate-950 border-slate-900"
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <FileText size={14} className="text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">sla_escalation_directives.txt</span>
                      <span className="text-[9px] text-slate-500">SOP escalation instructions for Cleo Customer Bot</span>
                    </div>
                  </div>
                  <span className="text-[8px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">v2.1.0</span>
                </div>
              </div>
            </div>

            {/* Read-Only Prompt Code Terminal display */}
            <div className="w-full xl:w-[480px] bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[460px]">
              {selectedPromptFile === 'directives-matcher' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Directive Preview</span>
                        <h4 className="text-xs font-black text-white">candidate_matcher_v4.2.txt</h4>
                      </div>
                      <span className="text-[8px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 rounded">READ ONLY</span>
                    </div>

                    <pre className="p-4 bg-slate-950 border border-slate-900 font-mono text-[9px] text-slate-400 leading-relaxed max-h-[260px] overflow-y-auto whitespace-pre-wrap select-text">
{`# Conrad Conductor - Matcher Prompt Directive
You are the primary match indexing system for HireNestOS.

## Core Rules:
1. Enforce strict Layer 1 matching (Deterministic index match filters first).
2. When evaluating resume arrays, score based on:
   - Certified tech stack alignment: Weight: 0.50
   - Historical tenure stability: Weight: 0.25
   - Sourcing partner trust index: Weight: 0.25
3. NEVER write unverified results to candidates_matches collections.`}
                    </pre>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Path: /src/prompts/candidate_matcher_v4.2.txt</span>
                </div>
              )}

              {selectedPromptFile === 'rules-vendor' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Directive Preview</span>
                        <h4 className="text-xs font-black text-white">vendor_trust_index_rules.json</h4>
                      </div>
                      <span className="text-[8px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 rounded">READ ONLY</span>
                    </div>

                    <pre className="p-4 bg-slate-950 border border-slate-900 font-mono text-[9px] text-slate-400 leading-relaxed max-h-[260px] overflow-y-auto whitespace-pre-wrap select-text">
{`{
  "ruleset_version": "1.0.4",
  "base_trust_index": 90.0,
  "modifiers": {
    "submittal_speed_under_30m": +2.5,
    "sla_confirmation_breached": -10.0,
    "candidate_interview_dropout": -5.0,
    "successful_placement": +5.0
  },
  "governance_bounds": {
    "minimum_trust_to_propose": 70.0,
    "critical_escalation_trigger": 60.0
  }
}`}
                    </pre>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Path: /src/prompts/vendor_trust_index_rules.json</span>
                </div>
              )}

              {selectedPromptFile === 'directives-sla' && (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Directive Preview</span>
                        <h4 className="text-xs font-black text-white">sla_escalation_directives.txt</h4>
                      </div>
                      <span className="text-[8px] font-mono bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-2 rounded">READ ONLY</span>
                    </div>

                    <pre className="p-4 bg-slate-950 border border-slate-900 font-mono text-[9px] text-slate-400 leading-relaxed max-h-[260px] overflow-y-auto whitespace-pre-wrap select-text">
{`# Cleo Customer Experience Bot - SLA Directives
You oversee SLA compliance counters inside Client Workspace deal rooms.

## Schedulers Instructions:
1. If client response delay exceeds 24 hours:
   - Mark Deal Room flag as "NEEDS ATTENTION".
   - Draft warning memo summary with suggested actions.
2. If client submittal limit rate is breached:
   - Halt automatic match listings.
   - Dispatch immediate telemetry alert to Partner Owner.`}
                    </pre>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">Path: /src/prompts/sla_escalation_directives.txt</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. Hybrid Org Chart tab */}
      {activeSubTab === 'org_chart' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Ecosystem Hybrid Org Chart</h2>
              <p className="text-xs text-slate-400">Visual hierarchy representing how human directors and digital employees collaborate across departments.</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            
            {/* Visual Org Chart Tree Layout */}
            <div className="flex-1 bg-[#05070D] border border-slate-900 rounded-2xl p-6 overflow-y-auto max-h-[450px] space-y-8 flex flex-col justify-between">
              
              {/* Level 1: HQ & Founders */}
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center block">LEVEL 1: STRATEGIC HEADQUARTERS</span>
                <div className="flex justify-center flex-wrap gap-4">
                  {orgLevels.level1.map(node => (
                    <div 
                      key={node.id}
                      onClick={() => setSelectedOrgNode(node)}
                      className={cn("p-3 rounded-xl border w-44 cursor-pointer text-left transition-all",
                        node.type === 'AI' ? "bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500" : "bg-[#0b0f19] border-slate-900 hover:border-slate-700",
                        selectedOrgNode?.id === node.id ? "border-indigo-500 bg-indigo-500/5 shadow-md" : ""
                      )}
                    >
                      <span className="text-xs font-black text-white block truncate">{node.name}</span>
                      <span className="text-[9px] text-slate-400 block truncate">{node.role}</span>
                      <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-slate-900">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">{node.dept}</span>
                        <span className={cn("text-[7px] font-black uppercase px-1 rounded", 
                          node.type === 'AI' ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"
                        )}>{node.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connecting indicators */}
              <div className="flex justify-center"><ArrowRight size={14} className="text-slate-800 rotate-90" /></div>

              {/* Level 2: Growth & Partners */}
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center block">LEVEL 2: GROWTH & ECOSYSTEM LEADERS</span>
                <div className="flex justify-center flex-wrap gap-4">
                  {orgLevels.level2.map(node => (
                    <div 
                      key={node.id}
                      onClick={() => setSelectedOrgNode(node)}
                      className={cn("p-3 rounded-xl border w-44 cursor-pointer text-left transition-all",
                        node.type === 'AI' ? "bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500" : "bg-[#0b0f19] border-slate-900 hover:border-slate-700",
                        selectedOrgNode?.id === node.id ? "border-indigo-500 bg-indigo-500/5 shadow-md" : ""
                      )}
                    >
                      <span className="text-xs font-black text-white block truncate">{node.name}</span>
                      <span className="text-[9px] text-slate-400 block truncate">{node.role}</span>
                      <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-slate-900">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">{node.dept}</span>
                        <span className={cn("text-[7px] font-black uppercase px-1 rounded", 
                          node.type === 'AI' ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"
                        )}>{node.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connecting indicators */}
              <div className="flex justify-center"><ArrowRight size={14} className="text-slate-800 rotate-90" /></div>

              {/* Level 3: CS & Recruitment Ops */}
              <div className="space-y-2">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center block">LEVEL 3: DELIVERY & COORDINATION CORE</span>
                <div className="flex justify-center flex-wrap gap-4">
                  {orgLevels.level3.map(node => (
                    <div 
                      key={node.id}
                      onClick={() => setSelectedOrgNode(node)}
                      className={cn("p-3 rounded-xl border w-44 cursor-pointer text-left transition-all",
                        node.type === 'AI' ? "bg-indigo-950/20 border-indigo-500/20 hover:border-indigo-500" : "bg-[#0b0f19] border-slate-900 hover:border-slate-700",
                        selectedOrgNode?.id === node.id ? "border-indigo-500 bg-indigo-500/5 shadow-md" : ""
                      )}
                    >
                      <span className="text-xs font-black text-white block truncate">{node.name}</span>
                      <span className="text-[9px] text-slate-400 block truncate">{node.role}</span>
                      <div className="flex justify-between items-center mt-2.5 pt-1.5 border-t border-slate-900">
                        <span className="text-[8px] text-slate-500 font-bold uppercase">{node.dept}</span>
                        <span className={cn("text-[7px] font-black uppercase px-1 rounded", 
                          node.type === 'AI' ? "bg-indigo-500/10 text-indigo-400" : "bg-amber-500/10 text-amber-400"
                        )}>{node.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Org Chart Selected Node Details Panel */}
            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
              {selectedOrgNode ? (
                <div className="space-y-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="border-b border-slate-900 pb-3 flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Staff Profile Details</span>
                        <h4 className="text-xs font-black text-white">{selectedOrgNode.name}</h4>
                        <span className="text-[9px] text-slate-400">{selectedOrgNode.role}</span>
                      </div>
                      <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 border rounded-full",
                        selectedOrgNode.type === 'AI' ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      )}>
                        {selectedOrgNode.type} Node
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 text-[11px]">
                        <span className="text-[8px] text-slate-500 uppercase font-bold block">Assigned Department</span>
                        <span className="font-bold text-slate-300">{selectedOrgNode.dept}</span>
                      </div>
                      {selectedOrgNode.reportsTo && (
                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 text-[11px]">
                          <span className="text-[8px] text-slate-500 uppercase font-bold block">Direct reporting line</span>
                          <span className="font-bold text-slate-300">{selectedOrgNode.reportsTo}</span>
                        </div>
                      )}
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 text-[11px]">
                        <span className="text-[8px] text-indigo-400 uppercase font-bold block">Core Key Performance Indicators</span>
                        <span className="font-bold text-slate-300">{selectedOrgNode.kpis}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-3">
                    Collaboration matrix authorized and certified.
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Network size={32} className="text-slate-600 animate-pulse" />
                  <p className="text-xs font-bold uppercase tracking-wider text-white">Select Org Node to Audit</p>
                  <p className="text-[10px] text-slate-500 max-w-[240px]">Audits direct responsibility chains, reporting structures, and core collaboration KPIs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 8. Automatic Reporting scheduler subtab */}
      {activeSubTab === 'executive_reports' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Executive Reporting Hub</h2>
              <p className="text-xs text-slate-400">Configure parameters for automatic dispatch of daily briefs, candidate audits, and error telemetry.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
              Scheduler Active
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            
            {/* Schedulers settings card */}
            <div className="flex-1 bg-[#070A13] border border-slate-900 rounded-2xl p-6 space-y-6">
              
              <div className="space-y-4">
                <span className="text-xs font-bold text-white block border-b border-slate-900 pb-2">Active Reporting Channels</span>
                
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-900/80 hover:border-slate-800 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={reportsConfig.requirementsDaily} 
                      onChange={() => setReportsConfig(prev => ({ ...prev, requirementsDaily: !prev.requirementsDaily }))}
                      className="mt-0.5 rounded accent-indigo-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">Daily Requirements Summary</span>
                      <span className="text-[9px] text-slate-500">Autonomous compilation of all active client requirements, strategic routings and submittals.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-900/80 hover:border-slate-800 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={reportsConfig.candidatesWeekly} 
                      onChange={() => setReportsConfig(prev => ({ ...prev, candidatesWeekly: !prev.candidatesWeekly }))}
                      className="mt-0.5 rounded accent-indigo-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">Weekly Candidate Pool & Bench Analytics</span>
                      <span className="text-[9px] text-slate-500">Compiles new uploads, deduplication rates, and strategic vendor bench matches.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-900/80 hover:border-slate-800 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={reportsConfig.clientVendorMonthly} 
                      onChange={() => setReportsConfig(prev => ({ ...prev, clientVendorMonthly: !prev.clientVendorMonthly }))}
                      className="mt-0.5 rounded accent-indigo-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">Monthly Client & Vendor Performance Audit</span>
                      <span className="text-[9px] text-slate-500">Tracks trust scores, SLA breach rates, and overall placement ROI ledger.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-slate-950 border border-slate-900/80 hover:border-slate-800 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={reportsConfig.errorsRealtime} 
                      onChange={() => setReportsConfig(prev => ({ ...prev, errorsRealtime: !prev.errorsRealtime }))}
                      className="mt-0.5 rounded accent-indigo-600"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">Real-time Platform Error Telemetry alerts</span>
                      <span className="text-[9px] text-slate-500">Pushes immediate notifications for API model connectivity dropouts or OAuth issues.</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <span className="text-xs font-bold text-white block border-b border-slate-900 pb-2">Delivery Channels</span>
                
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={reportsConfig.deliverToBdm}
                      onChange={() => setReportsConfig(prev => ({ ...prev, deliverToBdm: !prev.deliverToBdm }))}
                      className="rounded accent-indigo-600"
                    />
                    BDM Team Mail
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={reportsConfig.deliverToSlack}
                      onChange={() => setReportsConfig(prev => ({ ...prev, deliverToSlack: !prev.deliverToSlack }))}
                      className="rounded accent-indigo-600"
                    />
                    Slack Integration Channels
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                    <input 
                      type="checkbox" 
                      checked={reportsConfig.deliverToCeo}
                      onChange={() => setReportsConfig(prev => ({ ...prev, deliverToCeo: !prev.deliverToCeo }))}
                      className="rounded accent-indigo-600"
                    />
                    CEO WhatsApp / Inbox
                  </label>
                </div>
              </div>

            </div>

            {/* Quick Generator side panel */}
            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
              <div className="space-y-4 flex-1 flex flex-col">
                <div className="border-b border-slate-900 pb-3 flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Briefing Generator</span>
                    <h4 className="text-xs font-black text-white">Ad-hoc summary compile</h4>
                  </div>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto max-h-[180px]">
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Trigger an immediate manual compilation. The generator queries the active Firestore SSOT and assembles all stats in a clean report block.
                  </p>
                  
                  {isGeneratingReport ? (
                    <div className="p-4 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-center gap-2 text-indigo-400 font-bold text-xs">
                      <span className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
                      Compiling report stats...
                    </div>
                  ) : reportResult ? (
                    <pre className="text-[9px] font-mono bg-slate-950 p-3 rounded-xl border border-slate-900 text-slate-300 overflow-x-auto select-text">
                      {reportResult}
                    </pre>
                  ) : null}
                </div>

                <div className="border-t border-slate-900 pt-3 flex gap-2">
                  <button
                    onClick={() => onGenerateReport("requirements")}
                    className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-white rounded-xl text-[10px] font-bold uppercase transition-all"
                  >
                    Reqs Report
                  </button>
                  <button
                    onClick={() => onGenerateReport("candidates")}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-[10px] font-bold uppercase transition-all"
                  >
                    Candidates Report
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
