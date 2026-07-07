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
  ArrowRight
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Agent } from "./AIOpsTypes";

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
  isGeneratingReport
}: AIWorkforceProps) {
  
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  
  // Organization Chart selected node
  const [selectedOrgNode, setSelectedOrgNode] = useState<{ id: string; name: string; type: 'HUMAN' | 'AI'; role: string; dept: string; reportsTo?: string; kpis: string } | null>(null);

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

  return (
    <div className="flex flex-col flex-1 gap-6">
      
      {/* Digital Employee Registry tab */}
      {activeSubTab === 'registry' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">AI Workforce Registry</h2>
              <p className="text-xs text-slate-400">Manage and audit dedicated digital employees, their reporting structures, ownership and tasks.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
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
                        <span className="text-[9px] font-mono text-slate-500">{selectedAgent.id} • {selectedAgent.model || "Gemini 2.5 Flash"}</span>
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
                      <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-900 text-[11px] hover:border-slate-800 transition-colors">
                        <span className="text-[9px] text-slate-500 uppercase font-bold block">Last Weekly Report Dispatched</span>
                        <span className="font-bold text-slate-300">{selectedAgent.lastReportSent || "Yesterday, 6:00 PM"}</span>
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
                  <Bot size={36} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select Digital Employee</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits reporting structures, next tasks, approval authority bounds, and performance metrics.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Human + AI Org Chart */}
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
                  <Network size={32} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select Org Node to Audit</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits direct responsibility chains, reporting structures, and core collaboration KPIs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Automatic Reporting scheduler subtab */}
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
