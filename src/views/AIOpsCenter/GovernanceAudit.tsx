// src/views/AIOpsCenter/GovernanceAudit.tsx
import React, { useState, useMemo } from "react";
import { 
  ShieldCheck, 
  Workflow, 
  Settings, 
  Lock, 
  ChevronRight, 
  Clock, 
  Database, 
  Terminal, 
  AlertTriangle, 
  Play, 
  BookOpen, 
  Flame, 
  Sparkles,
  RefreshCw,
  Cpu
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { Execution, Agent } from "./AIOpsTypes";

interface GovernanceAuditProps {
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  executions: Execution[];
  selectedExec: Execution | null;
  setSelectedExec: (exec: Execution | null) => void;
  agents: Agent[];
  simulationPrompt: string;
  setSimulationPrompt: (prompt: string) => void;
  isSimulating: boolean;
  onRunSimulation: () => void;
  simulationResult: any;
}

export default function GovernanceAudit({
  activeSubTab,
  setActiveSubTab,
  executions,
  selectedExec,
  setSelectedExec,
  agents,
  simulationPrompt,
  setSimulationPrompt,
  isSimulating,
  onRunSimulation,
  simulationResult
}: GovernanceAuditProps) {
  
  // Memory Explorer selected agent
  const [selectedMemoryAgentId, setSelectedMemoryAgentId] = useState<string>("conrad-recruitment");

  // Selected agent object for memory explorer
  const memoryAgent = useMemo(() => {
    return agents.find(a => a.id === selectedMemoryAgentId) || agents[0] || null;
  }, [agents, selectedMemoryAgentId]);

  // ABAC permission matrix details
  const iamMatrix = useMemo(() => [
    { role: "Platform Super Admin", node: "Bruce Wayne (Human)", access: "ALL MODULES", scope: "Global Workspace & Core DB", status: "CERTIFIED" },
    { role: "VP Strategic Operations", node: "Diana Prince (Human)", access: "ALL OPERATIONAL MODULES", scope: "Operational Workspace & SLA Metrics", status: "CERTIFIED" },
    { role: "Recruiter Conductor (AI)", node: "Conrad Conductor", access: "READ/WRITE candidate_matches", scope: "Candidate Pool & Requirements Index", status: "BOUND_ABAC" },
    { role: "GTM Marketer Siri (AI)", node: "Siri GTM", access: "READ requirements, WRITE outreach_campaigns", scope: "Active campaigns & Requirements Info", status: "BOUND_ABAC" },
    { role: "CS CS Officer (AI)", node: "Cleo CS", access: "READ requirements, WRITE escalations", scope: "Escalations ledger & Communication Logs", status: "BOUND_ABAC" },
    { role: "Ecosystem Partner Mgr", node: "Clark Kent (Human)", access: "READ/WRITE vendor_benches", scope: "Ecosystem Vendors & trust_scores", status: "CERTIFIED" }
  ], []);

  // Short term context buffer simulations
  const shortTermBuffers = useMemo<Record<string, string>>(() => ({
    "conrad-recruitment": `CONTEXT BUFFER [conrad-recruitment]
- Active Requirement ID: req-091 ("Lead Cloud Platform Architect")
- Target Skills Vector: ["AWS", "Kubernetes", "TypeScript", "Go", "Terraform"]
- Active Candidates Scanned: 14 profiles
- Recruiter Override Guideline: "Prioritize candidates with strong Go runtime credentials and active security clearance"
- Operational constraints: Do not match candidates with notices > 30 days.`,
    
    "gtm-office": `CONTEXT BUFFER [gtm-office]
- Campaign ID: cmp-9921 ("InnovateLabs Q3 strategic scale")
- Active Requirement Target: "Senior Frontend Engineer (React/Tailwind)"
- Outreach template context: "Custom tailored recruitment invite highlighting team size, equity options, and HMR-disabled development stack"
- Constraints: Frequency capped. Maximum 4 invites per client per week.`,
    
    "vendor-office": `CONTEXT BUFFER [vendor-office]
- Target Partner ID: apex-staffing
- Action context: "Recalculate trust coefficient"
- Inputs: Success submittals ratio = 0.92, Submission latency = 4.2 hours, Escalated SLA warning count = 0
- Constraints: Require manual approval if trust factor falls below 0.85`
  }), []);

  // Long term semantic memory simulations
  const longTermMemories = useMemo<Record<string, { memory: string; weight: number }[]>>(() => ({
    "conrad-recruitment": [
      { memory: "Initech corporate culture profile highlights high-density engineering and flat org structures.", weight: 0.94 },
      { memory: "Previous React Native candidates matched with Peter Parker required minimal notice periods.", weight: 0.88 },
      { memory: "Rule: Candidates with trust scores < 80 are flagged for manual resume screening.", weight: 0.99 }
    ],
    "gtm-office": [
      { memory: "TechCorp candidate outreach responded most frequently on Tuesday mornings.", weight: 0.85 },
      { memory: "Siri campaign subject line 'Strategic Developer Opportunity' achieved 48% open-rate.", weight: 0.92 }
    ],
    "vendor-office": [
      { memory: "Ecosystem rule: Vendor apex-staffing excels at staff Go developers; average submittal latency = 3.8 hours.", weight: 0.95 },
      { memory: "Security validation: All submitted candidate resumes must pass PII hashing tests.", weight: 1.00 }
    ]
  }), []);

  const activeShortTermBuffer = useMemo(() => {
    return shortTermBuffers[selectedMemoryAgentId] || shortTermBuffers["conrad-recruitment"];
  }, [selectedMemoryAgentId, shortTermBuffers]);

  const activeLongTermMemories = useMemo(() => {
    return longTermMemories[selectedMemoryAgentId] || longTermMemories["conrad-recruitment"];
  }, [selectedMemoryAgentId, longTermMemories]);

  return (
    <div className="flex flex-col flex-1 gap-6">
      
      {/* IAM Protocol Matrix view */}
      {activeSubTab === 'iam' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Attribute-Based Access Control (ABAC) Matrix</h2>
              <p className="text-xs text-slate-400">Strictly governs human staff and digital employee permission scopes to prevent database leaks or unrequested actions.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
              IAM Certified
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs bg-[#070A13] border border-slate-900 rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-[#0c111f] border-b border-slate-900 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                  <th className="p-4">Enterprise Node</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Allowed Database Scopes</th>
                  <th className="p-4">Authorized Access Rights</th>
                  <th className="p-4 text-right">Certification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-900/60">
                {iamMatrix.map((item, idx) => (
                  <tr key={idx} className="hover:bg-[#0d1222] transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-white block">{item.node}</span>
                    </td>
                    <td className="p-4 text-slate-300 font-medium">{item.role}</td>
                    <td className="p-4 text-slate-400">{item.scope}</td>
                    <td className="p-4">
                      <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                        {item.access}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border",
                        item.status === "CERTIFIED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                      )}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cognitive Traces (Cognitive Traces / decision timelines) */}
      {activeSubTab === 'traces' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Cognitive Traces Audit Ledger</h2>
              <p className="text-xs text-slate-400">Step-by-step decision audit of all digital employee operations, tools used, and model variables.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
              Auditing Active
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            {/* Scrollable list of executions */}
            <div className="flex-1 overflow-y-auto max-h-[440px] border border-slate-900 rounded-2xl bg-[#070A13] divide-y divide-slate-900/60">
              {executions.map((exec) => (
                <div 
                  key={exec.id}
                  onClick={() => setSelectedExec(exec)}
                  className={cn("p-4 flex items-center justify-between cursor-pointer transition-colors", 
                    selectedExec?.id === exec.id ? "bg-indigo-600/10 border-l-4 border-l-indigo-500" : "hover:bg-slate-900/40"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{exec.agentId}</span>
                      <span className="text-[9px] font-mono text-slate-500">#{exec.id}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">Decision: {exec.decision || "Skill conduction passed successfully"}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 justify-end">
                      <Clock size={10} /> {new Date(exec.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={cn("text-[9px] font-bold uppercase mt-0.5 block", 
                      exec.status === 'success' ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {exec.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Cognitive execution trace audit card */}
            <div className="w-full xl:w-[480px] bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[440px]">
              {selectedExec ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="border-b border-slate-900 pb-3 flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Decision audit trace</span>
                      <h4 className="text-xs font-black text-white">{selectedExec.agentId}</h4>
                    </div>
                    <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                      selectedExec.status === 'success' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {selectedExec.status}
                    </span>
                  </div>

                  {/* 10 Step Pipeline audit layout */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Cognitive Decision Pipeline (Audit Trail)</span>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-900/60 text-[10px] space-y-1.5 font-mono text-slate-400 max-h-48 overflow-y-auto">
                      <div>1. <span className="text-indigo-400">[Intake]</span> Real-time Firestore event triggers callback.</div>
                      <div>2. <span className="text-indigo-400">[ABAC Verification]</span> verified agent permissions node.</div>
                      <div>3. <span className="text-indigo-400">[Context Assemble]</span> Context buffer generated (Prompt version: {selectedExec.promptVersion || "v2.1.4"}).</div>
                      <div>4. <span className="text-indigo-400">[RAG Retrieve]</span> Searched semantic long-term memory. 3 associations loaded.</div>
                      <div>5. <span className="text-indigo-400">[Execution]</span> Invoked Model: {selectedExec.model || "Gemini 2.5 Flash"}.</div>
                      {selectedExec.toolsUsed && selectedExec.toolsUsed.map((t, i) => (
                        <div key={i}>6.{i+1} <span className="text-emerald-400">[Tool Call]</span> Executed function: {t}.</div>
                      ))}
                      <div>7. <span className="text-indigo-400">[Constraint Verification]</span> Output checked against absolute guidelines.</div>
                      <div>8. <span className="text-indigo-400">[Grounded Decision]</span> Confidence rating: {(selectedExec.confidence || 0.96) * 100}%. Action compiled.</div>
                      <div>9. <span className="text-indigo-400">[Firestore sync]</span> Decision record committed to single source of truth.</div>
                      <div>10. <span className="text-indigo-400">[Audit Complete]</span> trace saved. Latency: {selectedExec.duration} ms. Cost: ${selectedExec.cost?.toFixed(5) || "0.00142"}.</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] bg-slate-950 p-2 rounded-xl border border-slate-900/60">
                    <div>
                      <span className="text-slate-500 uppercase block font-bold">Model tokens used</span>
                      <span className="text-white font-bold">{selectedExec.tokens || 1420} tokens</span>
                    </div>
                    <div>
                      <span className="text-slate-500 uppercase block font-bold">Trace Latency</span>
                      <span className="text-white font-bold">{selectedExec.duration} ms</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Workflow size={32} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select Trace to Audit</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits direct model variables, token usage, cost indices and step-by-step tool executions.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* AI Memory Explorer */}
      {activeSubTab === 'memory_explorer' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">AI Memory Explorer</h2>
              <p className="text-xs text-slate-400">Query and audit short-term active contexts, semantic long-term memories and grounding sources for each digital employee.</p>
            </div>
            
            {/* Agent Select Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Select Agent:</span>
              <select
                value={selectedMemoryAgentId}
                onChange={(e) => setSelectedMemoryAgentId(e.target.value)}
                className="bg-[#070A13] border border-slate-900 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none cursor-pointer"
              >
                <option value="conrad-recruitment">Conrad Conductor (AI)</option>
                <option value="gtm-office">Siri GTM (AI)</option>
                <option value="vendor-office">Vance Vendor (AI)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 max-h-[460px] overflow-y-auto pr-2">
            
            {/* Left side: Short term context buffer and prompt config */}
            <div className="space-y-4">
              <div className="bg-[#070A13] border border-slate-900 rounded-2xl p-5 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <span className="text-xs font-bold text-white block">Active Short-Term Context Buffer</span>
                  <span className="text-[8px] font-mono text-slate-500 bg-slate-950 px-2 py-0.5 rounded">Prompt version: v2.1.4</span>
                </div>

                <pre className="text-[10px] font-mono leading-relaxed bg-slate-950 p-4 rounded-xl border border-slate-900/80 text-slate-300 max-h-[200px] overflow-y-auto whitespace-pre-wrap select-text">
                  {activeShortTermBuffer}
                </pre>
              </div>

              {/* Confidence Gauges card */}
              <div className="bg-[#070A13] border border-slate-900 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-white block">Cognitive Confidence metrics</span>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-900 text-center space-y-1">
                    <span className="text-[11px] font-black text-emerald-400 block">98.2%</span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold block">Grounding Ratio</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-900 text-center space-y-1">
                    <span className="text-[11px] font-black text-indigo-400 block">100.0%</span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold block">Contraint Adherence</span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-900 text-center space-y-1">
                    <span className="text-[11px] font-black text-emerald-400 block">Low</span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold block">Hallucination Risk</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Long term memory index and grounding reference sources */}
            <div className="space-y-4">
              <div className="bg-[#070A13] border border-slate-900 rounded-2xl p-5 space-y-4">
                <span className="text-xs font-bold text-white block border-b border-slate-900 pb-3">Retrieved Semantic Long-Term Memories</span>
                
                <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
                  {activeLongTermMemories.map((mem, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-900 text-[11px] flex justify-between items-start gap-4">
                      <p className="text-slate-300 leading-snug">{mem.memory}</p>
                      <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                        w: {mem.weight}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grounded Knowledge Sources list */}
              <div className="bg-[#070A13] border border-slate-900 rounded-2xl p-5 space-y-3">
                <span className="text-xs font-bold text-white block">Authorized Grounding Knowledge Sources</span>
                
                <div className="flex flex-wrap gap-2">
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-full">
                    Enterprise Firestore Schema Blueprint
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-full">
                    ABAC Rule Ledger
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-full">
                    Oecosystem Candidate Registry
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-950 border border-slate-900 px-2.5 py-1 rounded-full">
                    Partner Trust Index Algorithm
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Simulation Lab view */}
      {activeSubTab === 'simulation' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Autonomous Simulation Lab</h2>
              <p className="text-xs text-slate-400">Trigger simulated conduction passes, audit playground prompt responses, and test real-time SLA rules safely.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
              Simulation Lab Online
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            <div className="flex-1 bg-[#070A13] border border-slate-900 rounded-2xl p-6 space-y-4">
              <span className="text-xs font-bold text-white block">Playground Conduction Trigger</span>
              <textarea
                value={simulationPrompt}
                onChange={(e) => setSimulationPrompt(e.target.value)}
                placeholder="Enter prompt instruction or select trigger configuration..."
                className="w-full h-36 rounded-xl bg-slate-950 border border-slate-900 p-4 text-xs font-mono text-slate-300 outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600 resize-none"
              />
              <button
                onClick={onRunSimulation}
                disabled={isSimulating || !simulationPrompt.trim()}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all shadow flex items-center justify-center gap-2"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Running Simulation...
                  </>
                ) : (
                  <>
                    <Play size={14} />
                    Run Conduction Pass
                  </>
                )}
              </button>
            </div>

            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[320px]">
              <div className="space-y-4 flex-1 flex flex-col">
                <span className="text-xs font-bold text-white block border-b border-slate-900 pb-2">Simulation Outputs</span>
                
                <div className="flex-1 overflow-y-auto max-h-[220px] space-y-3">
                  {simulationResult ? (
                    <div className="space-y-3">
                      <div className="flex justify-between text-[10px] font-mono border-b border-slate-900/60 pb-1.5">
                        <span className="text-slate-500 font-bold">Simulation:</span>
                        <span className="text-emerald-400 font-black">SUCCESS</span>
                      </div>
                      <pre className="text-[10px] font-mono bg-slate-950 p-4 rounded-xl text-slate-300 overflow-x-auto">
                        {JSON.stringify(simulationResult, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-600 space-y-2">
                      <Terminal size={32} className="text-slate-700" />
                      <p className="text-xs font-bold uppercase tracking-wider">No output yet</p>
                      <p className="text-[10px] text-slate-600">Enter simulation parameters and run conduction pass to verify telemetry response.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
