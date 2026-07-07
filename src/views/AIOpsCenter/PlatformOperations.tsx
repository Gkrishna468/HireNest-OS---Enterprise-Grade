// src/views/AIOpsCenter/PlatformOperations.tsx
import React, { useState, useMemo } from "react";
import { 
  Wifi, 
  Workflow, 
  Clock, 
  Lock, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  History,
  Bot,
  User,
  DollarSign,
  TrendingUp,
  Cpu
} from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { BusinessEvent, PlatformActivity } from "./AIOpsTypes";

interface PlatformOperationsProps {
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  eventsFeed: BusinessEvent[];
  selectedEvent: BusinessEvent | null;
  setSelectedEvent: (evt: BusinessEvent | null) => void;
  eventFilter: string;
  setEventFilter: (filter: string) => void;
  filteredEvents: BusinessEvent[];
}

export default function PlatformOperations({
  activeSubTab,
  setActiveSubTab,
  eventsFeed,
  selectedEvent,
  setSelectedEvent,
  eventFilter,
  setEventFilter,
  filteredEvents
}: PlatformOperationsProps) {
  
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'AI' | 'HUMAN' | 'SLA' | 'FINANCE'>('ALL');
  const [selectedTimelineItem, setSelectedTimelineItem] = useState<PlatformActivity | null>(null);

  const integrationsStatus = useMemo(() => [
    { name: "CRM Workspace", status: "Nominal", latency: 42, uptime: "99.98%", lastFailure: "June 28, 14:22" },
    { name: "OS Workspace", status: "Nominal", latency: 21, uptime: "99.99%", lastFailure: "Never" },
    { name: "Vendor Portal", status: "Nominal", latency: 64, uptime: "99.85%", lastFailure: "July 01, 09:12" },
    { name: "Client Portal", status: "Nominal", latency: 48, uptime: "99.92%", lastFailure: "June 30, 18:44" },
    { name: "Firestore (SSOT)", status: "Nominal", latency: 12, uptime: "100.00%", lastFailure: "Never" },
    { name: "Event Bus Broker", status: "Nominal", latency: 4, uptime: "99.99%", lastFailure: "Never" },
    { name: "AI Gateway Proxy", status: "Nominal", latency: 180, uptime: "99.95%", lastFailure: "July 03, 11:04" },
    { name: "Gemini Model API", status: "Nominal", latency: 420, uptime: "99.91%", lastFailure: "June 25, 08:31" },
    { name: "Email Gateway", status: "Nominal", latency: 152, uptime: "99.70%", lastFailure: "June 22, 10:00" },
    { name: "WhatsApp Hub API", status: "Nominal", latency: 95, uptime: "99.80%", lastFailure: "June 19, 15:52" },
    { name: "Google Calendar Sync", status: "Nominal", latency: 130, uptime: "99.90%", lastFailure: "Never" },
    { name: "Cloud Storage Bucket", status: "Nominal", latency: 32, uptime: "100.00%", lastFailure: "Never" },
  ], []);

  // Pristine chronological platform timeline feed
  const timelineData = useMemo<PlatformActivity[]>(() => [
    {
      id: "act-01",
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      actor: "Conrad Conductor (AI)",
      action: "Executed conduction pipeline and parsed 14 resume PDFs. Score index updated.",
      type: "AI",
      status: "success",
      payload: { processed: 14, files: ["resume_jdoe.pdf", "resume_smit.pdf"], matchIndex: "idx-2291" }
    },
    {
      id: "act-02",
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      actor: "Bruce Wayne (Human)",
      action: "Transferred requirement ownership of 'Lead Cloud Platform Architect' to Peter Parker.",
      type: "HUMAN",
      status: "info",
      payload: { reqId: "req-091", prevOwner: "Bruce Wayne", newOwner: "Peter Parker" }
    },
    {
      id: "act-03",
      timestamp: new Date(Date.now() - 32 * 60000).toISOString(),
      actor: "Cleo CS Officer (AI)",
      action: "SLA Alert triggered: Staff Go/Kubernetes developer response latency exceeded 20 hours.",
      type: "SLA",
      status: "warning",
      payload: { reqId: "req-092", elapsedHours: 20, limitHours: 12, escalatedTo: "Bruce Wayne" }
    },
    {
      id: "act-04",
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      actor: "Max Optimizer (AI)",
      action: "Completed ecosystem semantic bench matching scan. Dispatched 3 candidate match invites.",
      type: "AI",
      status: "success",
      payload: { scannedBenches: 14, matchesFound: 3, invitationsSent: ["apex-staffing", "tech-allies"] }
    },
    {
      id: "act-05",
      timestamp: new Date(Date.now() - 120 * 60000).toISOString(),
      actor: "Finance OS (System)",
      action: "Successfully raised placement fee invoice for $22,500. Sent to Initech billing.",
      type: "FINANCE",
      status: "success",
      payload: { invoiceId: "inv-98122", amount: 22500, feeRate: "15%", status: "PAID" }
    },
    {
      id: "act-06",
      timestamp: new Date(Date.now() - 180 * 60000).toISOString(),
      actor: "Diana Prince (Human)",
      action: "SLA Override applied: Manually approved candidate submittal on GlobalFinance requirement.",
      type: "HUMAN",
      status: "info",
      payload: { reqId: "req-094", candidateId: "cand-112", approvedAt: "2026-07-06 10:45 AM" }
    },
    {
      id: "act-07",
      timestamp: new Date(Date.now() - 240 * 60000).toISOString(),
      actor: "UOP Gateway (System)",
      action: "SLA Violation escalates: VP Strategic Search breached submittal deadline. Direct CEO intervention triggered.",
      type: "SLA",
      status: "critical",
      payload: { reqId: "req-094", breachType: "ZERO_SUBMITTALS", limitDays: 3, escalationLevel: 3 }
    }
  ], []);

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'ALL') return timelineData;
    return timelineData.filter(item => item.type === timelineFilter);
  }, [timelineFilter, timelineData]);

  return (
    <div className="flex flex-col flex-1 gap-6">
      {/* Platform connectivity view */}
      {activeSubTab === 'connectivity' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Platform Connectivity Dashboard</h2>
              <p className="text-xs text-slate-400">Live operational monitor of HireNest integration handshakes and infrastructure channels.</p>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-bold">
              Heartbeats: Operational
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 overflow-y-auto max-h-[480px] pr-2">
            {integrationsStatus.map((item, index) => (
              <div 
                key={index} 
                className="p-4 rounded-2xl bg-[#070A13] border border-slate-900/80 hover:border-slate-800 transition-all flex flex-col justify-between"
              >
                <div className="flex justify-between items-start">
                  <span className="text-xs font-black text-white leading-tight">{item.name}</span>
                  <span className="text-[9px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {item.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-900/60">
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Latency</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{item.latency} ms</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-500 uppercase block font-bold">Uptime Ratio</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{item.uptime || "99.9%"}</span>
                  </div>
                </div>
                <div className="mt-2 text-[9px] text-slate-500">
                  <span className="font-bold">Last failure:</span> {item.lastFailure}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Event stream view */}
      {activeSubTab === 'events' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-900 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Ecosystem Event Bus Monitor</h2>
              <p className="text-xs text-slate-400">Live feed of global business operations events triggering recruitment automation loops.</p>
            </div>
            
            {/* Event Type Filters */}
            <div className="flex flex-wrap gap-1.5">
              {["ALL", "REQUIREMENT_CREATED", "CANDIDATE_MATCHED", "SUBMISSION_SENT", "INTERVIEW_SCHEDULED"].map((type) => (
                <button
                  key={type}
                  onClick={() => setEventFilter(type)}
                  className={cn("px-2.5 py-1 rounded-xl text-[9px] font-bold uppercase transition-all border", 
                    eventFilter === type 
                      ? "bg-indigo-600 border-indigo-500 text-white shadow" 
                      : "bg-[#070A13] text-slate-400 border-slate-900 hover:text-white hover:bg-slate-900/60"
                  )}
                >
                  {type.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            {/* Event Stream list */}
            <div className="flex-1 overflow-y-auto max-h-[420px] border border-slate-900/80 rounded-2xl bg-[#070A13] divide-y divide-slate-900/60">
              {filteredEvents.map((evt) => (
                <div 
                  key={evt.id}
                  onClick={() => setSelectedEvent(evt)}
                  className={cn("p-4 flex items-center justify-between cursor-pointer transition-colors", 
                    selectedEvent?.id === evt.id ? "bg-indigo-600/10 border-l-4 border-l-indigo-500" : "hover:bg-slate-900/40"
                  )}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-white">{evt.type}</span>
                      <span className="text-[9px] font-mono text-slate-500">#{evt.id}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">Triggered by: {evt.origin}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 justify-end">
                      <Clock size={10} /> {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-emerald-400 mt-0.5 block">NOMINAL</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Event Payload Details */}
            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
              {selectedEvent ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="border-b border-slate-900 pb-3 flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Real-time Payload Auditor</span>
                      <h4 className="text-xs font-black text-white">{selectedEvent.type}</h4>
                    </div>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
                      NOMINAL
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Raw Payload JSON</span>
                    <pre className="text-[10px] font-mono bg-slate-950 p-4 rounded-xl text-slate-300 overflow-x-auto max-h-[220px]">
                      {JSON.stringify(selectedEvent.payload, null, 2)}
                    </pre>
                  </div>
                  <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-3 flex items-center gap-2">
                    <Lock size={12} className="text-indigo-400" /> Authorized & synced with Firestore SSOT.
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Workflow size={32} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select event record to audit</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits direct input trigger metrics across client interfaces.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Platform Activity Timeline */}
      {activeSubTab === 'activity_timeline' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-slate-900 pb-4 gap-4">
            <div>
              <h2 className="text-lg font-black text-white">Platform Activity Timeline</h2>
              <p className="text-xs text-slate-400">Unified, chronological ledger of all platform-wide operational changes and events.</p>
            </div>

            {/* Timeline filters */}
            <div className="flex flex-wrap gap-1.5">
              {(["ALL", "AI", "HUMAN", "SLA", "FINANCE"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setTimelineFilter(type)}
                  className={cn("px-3 py-1 rounded-xl text-[9px] font-bold uppercase border transition-all",
                    timelineFilter === type
                      ? "bg-indigo-600 border-indigo-500 text-white shadow"
                      : "bg-[#070A13] text-slate-400 border-slate-900 hover:text-white hover:bg-slate-900/60"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 flex flex-col xl:flex-row gap-6">
            {/* Scrollable chronological Timeline list */}
            <div className="flex-1 overflow-y-auto max-h-[440px] pr-2 space-y-4 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-900/80">
              {filteredTimeline.map((item) => {
                const isAi = item.type === 'AI';
                const isHuman = item.type === 'HUMAN';
                const isSla = item.type === 'SLA';
                const isFinance = item.type === 'FINANCE';

                return (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedTimelineItem(item)}
                    className={cn("pl-12 relative cursor-pointer group transition-all")}
                  >
                    {/* Floating circular icon marker */}
                    <div className={cn("absolute left-3 top-1 p-1.5 rounded-full border z-10 transition-colors shadow-md",
                      item.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500" :
                      item.status === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400 group-hover:bg-amber-500 animate-pulse" :
                      item.status === 'critical' ? "bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover:bg-rose-500" :
                      "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500",
                      "group-hover:text-white"
                    )}>
                      {isAi && <Bot size={11} />}
                      {isHuman && <User size={11} />}
                      {isSla && <AlertTriangle size={11} />}
                      {isFinance && <DollarSign size={11} />}
                      {!isAi && !isHuman && !isSla && !isFinance && <History size={11} />}
                    </div>

                    <div className={cn("p-4 rounded-2xl bg-[#070A13] border border-slate-900/80 hover:border-slate-800 transition-all space-y-2",
                      selectedTimelineItem?.id === item.id ? "border-indigo-500/40 bg-indigo-500/5" : ""
                    )}>
                      <div className="flex justify-between items-start gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-white">{item.actor}</span>
                            <span className={cn("text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
                              isAi ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400" :
                              isHuman ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                              isSla ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                              isFinance ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                              "bg-slate-500/10 border-slate-500/20 text-slate-400"
                            )}>
                              {item.type}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 leading-snug">{item.action}</p>
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Timeline Detail Payload Panel */}
            <div className="w-full xl:w-96 bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[350px]">
              {selectedTimelineItem ? (
                <div className="space-y-4 flex-1 flex flex-col">
                  <div className="border-b border-slate-900 pb-3 flex justify-between items-start">
                    <div>
                      <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Unified Audit Log details</span>
                      <h4 className="text-xs font-black text-white">{selectedTimelineItem.actor}</h4>
                    </div>
                    <span className={cn("text-[9px] font-bold uppercase px-2 py-0.5 rounded",
                      selectedTimelineItem.status === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                      selectedTimelineItem.status === 'warning' ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                      selectedTimelineItem.status === 'critical' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" :
                      "bg-slate-500/10 border-slate-500/20 text-slate-400"
                    )}>
                      {selectedTimelineItem.status}
                    </span>
                  </div>
                  <div className="space-y-2 flex-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Context / payload parameters</span>
                    <pre className="text-[10px] font-mono bg-slate-950 p-4 rounded-xl text-slate-300 overflow-x-auto max-h-[220px]">
                      {JSON.stringify(selectedTimelineItem.payload, null, 2)}
                    </pre>
                  </div>
                  <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-3 flex items-center gap-2">
                    <Lock size={12} className="text-indigo-400" /> Grounded operational telemetry record.
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <History size={32} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select record to inspect details</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits direct input parameters and state records of selected activity.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
