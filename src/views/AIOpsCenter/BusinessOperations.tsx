// src/views/AIOpsCenter/BusinessOperations.tsx
import React, { useState, useMemo } from "react";
import { 
  Eye, 
  TrendingUp, 
  ChevronRight, 
  Users, 
  Clock, 
  CheckCircle2, 
  Play, 
  Settings, 
  ShieldAlert, 
  Info,
  Sliders,
  Mail,
  SlidersHorizontal,
  Workflow,
  Sparkles,
  Award
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { RequirementOwnership } from "./AIOpsTypes";

interface BusinessOperationsProps {
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  selectedReq: RequirementOwnership | null;
  setSelectedReq: (req: RequirementOwnership | null) => void;
  fallbackRequirements: RequirementOwnership[];
  chartData: any[];
}

export default function BusinessOperations({
  activeSubTab,
  setActiveSubTab,
  selectedReq,
  setSelectedReq,
  fallbackRequirements,
  chartData
}: BusinessOperationsProps) {
  
  // Requirement Digital Twin state settings
  const [benchPartnerSharing, setBenchPartnerSharing] = useState<Record<string, boolean>>({
    "req-091": true,
    "req-092": false,
    "req-093": true,
    "req-094": false
  });

  const [slaEscalations, setSlaEscalations] = useState<Record<string, boolean>>({
    "req-091": true,
    "req-092": true,
    "req-093": false,
    "req-094": true
  });

  // Dynamic Pipeline counts for each requirement to render Digital Twin stages
  const pipelineCounts = useMemo<Record<string, { sourced: number; matched: number; submitted: number; interviewing: number; offered: number }>>(() => ({
    "req-091": { sourced: 24, matched: 12, submitted: 4, interviewing: 2, offered: 1 },
    "req-092": { sourced: 18, matched: 6, submitted: 2, interviewing: 1, offered: 0 },
    "req-093": { sourced: 32, matched: 14, submitted: 5, interviewing: 3, offered: 2 },
    "req-094": { sourced: 8, matched: 2, submitted: 0, interviewing: 0, offered: 0 }
  }), []);

  // Communication & audit history logs for requirement digital twins
  const digitalTwinCommLogs = useMemo<Record<string, { timestamp: string; channel: 'EMAIL' | 'SMS' | 'SLACK' | 'SYSTEM'; detail: string; status: string }[]>>(() => ({
    "req-091": [
      { timestamp: "10 mins ago", channel: "EMAIL", detail: "Automated candidate submission brief sent to Initech HR portal.", status: "DELIVERED" },
      { timestamp: "32 mins ago", channel: "SLACK", detail: "Alert dispatched to Bruce Wayne: Conrad matched candidate Jane Doe with 96% match confidence.", status: "SENT" },
      { timestamp: "1 hour ago", channel: "SYSTEM", detail: "Max Optimizer scanned cross-tenant benches; matched 3 strategic profiles.", status: "COMPLETED" },
      { timestamp: "2 hours ago", channel: "EMAIL", detail: "Autonomous calendar sync triggered; interview slot options compiled for client.", status: "DELIVERED" }
    ],
    "req-092": [
      { timestamp: "3 mins ago", channel: "SLACK", detail: "SLA Alert escalated to BDM Tony Stark: Recruiter response delay exceeded 12 hours.", status: "ESCALATED" },
      { timestamp: "12 hours ago", channel: "SMS", detail: "SLA SLA Reminder alert pushed to Partner Manager Clark Kent.", status: "SENT" },
      { timestamp: "20 hours ago", channel: "SYSTEM", detail: "Cleo CS registered Initech client workspace SLA tracking warning.", status: "WARNING" }
    ],
    "req-093": [
      { timestamp: "1 hour ago", channel: "EMAIL", detail: "Candidate interview feedback summary compiled and pushed to Diana Prince.", status: "DELIVERED" },
      { timestamp: "1 day ago", channel: "SYSTEM", detail: "Autonomous placement ledger transaction initialized by Founder Liaison.", status: "COMPLETED" }
    ],
    "req-094": [
      { timestamp: "4 hours ago", channel: "SLACK", detail: "SLA Breach critical ticket created and routed to VP Strategic Operations.", status: "ESCALATED" },
      { timestamp: "1 day ago", channel: "SMS", detail: "Escalation notification dispatched to recruiter Steve Rogers.", status: "SENT" }
    ]
  }), []);

  const handleToggleSharing = (id: string) => {
    setBenchPartnerSharing(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggleSla = (id: string) => {
    setSlaEscalations(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="flex flex-col flex-1 gap-6">
      
      {/* Requirement Observatory tab */}
      {activeSubTab === 'observatory' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Requirement Observatory</h2>
              <p className="text-xs text-slate-400">Complete digital twin record tracking ownership, strategic routing, active pipelines and communications.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
              Observatory Active
            </span>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            {/* Active requirements observer list */}
            <div className="flex-1 overflow-x-auto">
              <table className="w-full text-left text-xs bg-[#070A13] border border-slate-900 rounded-2xl overflow-hidden">
                <thead>
                  <tr className="bg-[#0c111f] border-b border-slate-900 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="p-4">Requirement Details</th>
                    <th className="p-4">Primary BDM</th>
                    <th className="p-4">Assigned Recruiter</th>
                    <th className="p-4">SLA status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60">
                  {fallbackRequirements.map((req) => (
                    <tr 
                      key={req.id}
                      onClick={() => setSelectedReq(req)}
                      className={cn("hover:bg-[#0d1222] transition-colors cursor-pointer", 
                        selectedReq?.id === req.id ? "bg-indigo-600/5" : ""
                      )}
                    >
                      <td className="p-4">
                        <span className="font-bold text-white block">{req.title}</span>
                        <span className="text-[10px] text-slate-500">{req.client} • {req.id}</span>
                      </td>
                      <td className="p-4 font-medium text-slate-300">{req.bdm}</td>
                      <td className="p-4 font-medium text-slate-300">{req.recruiter}</td>
                      <td className="p-4">
                        <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border", 
                          req.slaStatus === 'healthy' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                          req.slaStatus === 'warning' ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" :
                          "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}>
                          {req.slaStatus}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <ChevronRight size={14} className="inline text-slate-500 group-hover:text-white" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Requirement Digital Twin visualizer drawer */}
            <div className="w-full xl:w-[450px] bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[500px]">
              {selectedReq ? (
                <div className="space-y-5 flex-1 flex flex-col">
                  {/* Digital Twin header */}
                  <div className="border-b border-slate-900 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Requirement Digital Twin</span>
                        <h4 className="text-xs font-black text-white">{selectedReq.title}</h4>
                        <p className="text-[10px] text-slate-500">{selectedReq.client} • #{selectedReq.id}</p>
                      </div>
                      <span className={cn("text-[9px] font-bold uppercase px-2.5 py-0.5 border rounded-full",
                        selectedReq.slaStatus === 'healthy' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                        selectedReq.slaStatus === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-400"
                      )}>
                        {selectedReq.slaStatus}
                      </span>
                    </div>
                  </div>

                  {/* Visual Sourcing Pipeline Nodes */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Active Pipeline Nodes</span>
                    <div className="grid grid-cols-5 gap-1 text-center relative pt-4">
                      {/* Completion bar background */}
                      <div className="absolute top-1 left-[10%] right-[10%] h-0.5 bg-slate-900 z-0"></div>
                      
                      {/* Active nodes */}
                      {[
                        { label: "Sourced", key: "sourced" as const, color: "text-indigo-400" },
                        { label: "Matched", key: "matched" as const, color: "text-indigo-400" },
                        { label: "Submitted", key: "submitted" as const, color: "text-emerald-400" },
                        { label: "Interview", key: "interviewing" as const, color: "text-amber-400" },
                        { label: "Offered", key: "offered" as const, color: "text-emerald-400" }
                      ].map((node, index) => {
                        const count = pipelineCounts[selectedReq.id]?.[node.key] || 0;
                        const isCompleted = count > 0;
                        return (
                          <div key={node.label} className="relative z-10 flex flex-col items-center">
                            <div className={cn("h-3 w-3 rounded-full border flex items-center justify-center transition-colors mb-1",
                              isCompleted ? "bg-indigo-500 border-indigo-400" : "bg-slate-950 border-slate-900"
                            )}></div>
                            <span className="text-[11px] font-black text-white">{count}</span>
                            <span className="text-[8px] text-slate-500 font-bold uppercase block mt-0.5">{node.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Strategic Routing Rules Panel */}
                  <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-900/80">
                    <div className="flex items-center gap-1.5 border-b border-slate-900 pb-2">
                      <Sliders size={12} className="text-indigo-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Strategic Sourcing Rules</span>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold text-slate-300 block">Ecosystem Bench Sharing</span>
                          <span className="text-[8px] text-slate-500 leading-tight block">Match cross-tenant partner benches semantically</span>
                        </div>
                        <button
                          onClick={() => handleToggleSharing(selectedReq.id)}
                          className={cn("w-9 h-5 rounded-full p-0.5 transition-all outline-none",
                            benchPartnerSharing[selectedReq.id] ? "bg-indigo-600 text-right" : "bg-slate-900 text-left"
                          )}
                        >
                          <div className={cn("h-4 w-4 bg-white rounded-full shadow-md transition-all",
                            benchPartnerSharing[selectedReq.id] ? "translate-x-4" : "translate-x-0"
                          )}></div>
                        </button>
                      </div>

                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[10px] font-bold text-slate-300 block">SLA Auto-Escalation</span>
                          <span className="text-[8px] text-slate-500 leading-tight block">Slack alert BDM & Managers on candidate latency</span>
                        </div>
                        <button
                          onClick={() => handleToggleSla(selectedReq.id)}
                          className={cn("w-9 h-5 rounded-full p-0.5 transition-all outline-none",
                            slaEscalations[selectedReq.id] ? "bg-indigo-600 text-right" : "bg-slate-900 text-left"
                          )}
                        >
                          <div className={cn("h-4 w-4 bg-white rounded-full shadow-md transition-all",
                            slaEscalations[selectedReq.id] ? "translate-x-4" : "translate-x-0"
                          )}></div>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Communication History Feed */}
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Communication Logs</span>
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {digitalTwinCommLogs[selectedReq.id]?.map((log, idx) => (
                        <div key={idx} className="text-[10px] bg-slate-950 border border-slate-900 p-2.5 rounded-xl flex items-start gap-2.5">
                          <span className={cn("text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-md",
                            log.channel === 'EMAIL' ? "bg-blue-500/10 text-blue-400" :
                            log.channel === 'SMS' ? "bg-purple-500/10 text-purple-400" :
                            log.channel === 'SLACK' ? "bg-pink-500/10 text-pink-400" :
                            "bg-indigo-500/10 text-indigo-400"
                          )}>
                            {log.channel}
                          </span>
                          <div className="flex-1 space-y-0.5">
                            <p className="text-slate-300 leading-snug">{log.detail}</p>
                            <span className="text-[8px] text-slate-500 block">{log.timestamp} • Status: {log.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Eye size={36} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select Requirement to View Digital Twin</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits direct responsibility mappings, pipeline stages, auto routing toggles, and communications history logs.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Performance & ROI subtab */}
      {activeSubTab === 'business_sla' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Ecosystem Performance & ROI Dashboard</h2>
              <p className="text-xs text-slate-400">Analyze direct operational savings, automated hours, and placement metrics.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Recharts Performance Curve */}
            <div className="lg:col-span-2 bg-[#070A13] border border-slate-900/80 rounded-2xl p-5 space-y-4">
              <span className="text-xs font-bold text-white block">Ecosystem Hourly Sourcing Metrics</span>
              <div className="h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748B" fontSize={10} />
                    <YAxis stroke="#64748B" fontSize={10} />
                    <Tooltip contentStyle={{ backgroundColor: "#0B0F19", borderColor: "#1E293B" }} />
                    <Area type="monotone" dataKey="hoursSaved" stroke="#10B981" fillOpacity={1} fill="url(#colorHours)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Operational ROI Ledger */}
            <div className="bg-[#070A13] border border-slate-900/80 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Placement Velocity Metrics</span>
                <p className="text-[10px] text-slate-500 mt-1">Ecosystem reduces average submittal delays from 48 hours to 15 seconds.</p>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/60 border border-slate-900 rounded-xl">
                  <span className="text-xs text-slate-300">Deterministic Intake Speed</span>
                  <span className="text-[10px] font-bold text-indigo-400">0.03 seconds</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/60 border border-slate-900 rounded-xl">
                  <span className="text-xs text-slate-300">Semantic Matching Latency</span>
                  <span className="text-[10px] font-bold text-indigo-400">1,120 ms</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-[#0B0F19]/60 border border-slate-900 rounded-xl">
                  <span className="text-xs text-slate-300">Recruiter Hours Saved (Weekly)</span>
                  <span className="text-[10px] font-bold text-indigo-400">167 hours</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-3">
                <span className="font-bold">Calculated ROI:</span> 11.2x operational efficiency.
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
