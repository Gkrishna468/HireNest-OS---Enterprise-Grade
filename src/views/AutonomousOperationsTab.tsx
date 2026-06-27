import React, { useState, useEffect } from "react";
import { 
  Zap, 
  PlayCircle, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Cpu, 
  ArrowRight, 
  Settings2,
  Play,
  Pause,
  RotateCw,
  Power,
  RefreshCw,
  Terminal,
  Check,
  Server,
  Mail,
  Shield,
  Layers,
  Bot,
  Sparkles,
  Send,
  Trash2,
  HelpCircle,
  Gauge,
  User,
  Activity,
  Sliders,
  Search,
  Filter,
  CheckSquare,
  AlertCircle
} from "lucide-react";
import { collection, query, limit, getDocs } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { cn } from "../lib/utils";

// Define strict types for our robust office state
interface OfficeRuntimeState {
  id: string;
  name: string;
  description: string;
  status: 'RUNNING' | 'PAUSED' | 'STOPPED' | 'PROCESSING';
  state: string;
  queueCount: number;
  workers: number;
  currentJob: string;
  startedAt: string;
  lastHeartbeatSec: number;
  avgRuntimeMs: number;
  failuresToday: number;
  retriesToday: number;
  // Live execution telemetry
  currentExecution?: {
    requirement: string;
    candidate: string;
    step: string;
    progress: number; // percentage
    estimatedFinishSec: number;
  };
  // Internal reasoning logs for debugging
  conversations: {
    time: string;
    log: string;
  }[];
}

export default function AutonomousOperationsTab({ userRole }: { userRole: string }) {
  const isAdmin = ["admin", "super_admin", "hq_admin", "ops_admin"].includes(userRole);

  const [activeTab, setActiveTab] = useState<'control' | 'approvals' | 'rules' | 'logs'>('control');
  const [automationRules, setAutomationRules] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);

  // Workforce OS Master Toggles
  const [workforceRunning, setWorkforceRunning] = useState(true);
  const [autopilotMode, setAutopilotMode] = useState<'manual' | 'assisted' | 'autonomous'>('autonomous');
  const [preflightPass, setPreflightPass] = useState(true);
  const [preflightLogs, setPreflightLogs] = useState<string[]>([]);
  const [showPreflightModal, setShowPreflightModal] = useState(false);

  // Emergency Rail Mute Switches
  const [eventBusStopped, setEventBusStopped] = useState(false);
  const [mailosPaused, setMailosPaused] = useState(false);
  const [matchingDisabled, setMatchingDisabled] = useState(false);
  const [geminiDisabled, setGeminiDisabled] = useState(false);

  // Queue Visualization Data Breakdowns
  const [queueBreakdown, setQueueBreakdown] = useState({
    email: 8,
    resumeParsing: 6,
    matching: 12,
    submission: 9,
    interview: 5,
    offer: 2,
    finance: 1
  });

  // Worker Pools Utilization
  const [workerUtilization, setWorkerUtilization] = useState({
    recruitment: 82,
    vendor: 49,
    finance: 21,
    coo: 36
  });

  // Schedulers Visibility
  const [schedulers, setSchedulers] = useState([
    { name: "Marketplace Scan", interval: "Every 15 min", nextRun: "11:45", lastRun: "11:30", duration: "4s", status: "NOMINAL" },
    { name: "AI COO Audit", interval: "Every 1 hour", nextRun: "12:00", lastRun: "11:00", duration: "14s", status: "NOMINAL" },
    { name: "Learning Engine", interval: "Nightly (02:00)", nextRun: "02:00", lastRun: "Yesterday", duration: "48s", status: "NOMINAL" },
    { name: "Heartbeat Monitor", interval: "Every 10 sec", nextRun: "11:31:10", lastRun: "11:31:00", duration: "0.2s", status: "NOMINAL" },
    { name: "SLA Monitor", interval: "Every 5 min", nextRun: "11:35", lastRun: "11:30", duration: "2.1s", status: "NOMINAL" },
    { name: "Business Graph Validation", interval: "Hourly", nextRun: "12:00", lastRun: "11:00", duration: "1.8s", status: "NOMINAL" }
  ]);

  // AI COO Strategic Recommendation Queue
  const [cooRecommendations, setCooRecommendations] = useState([
    {
      id: "rec-1",
      priority: "HIGH",
      recommendation: "Increase Vendor Broadcast",
      reason: "No candidate submissions received after 18 hrs for REQ-2026-109 (Senior Java Developer)",
      impact: "+₹12L expected revenue",
      confidence: 94,
      status: "PENDING" // PENDING, APPROVED, IGNORED, MODIFIED
    },
    {
      id: "rec-2",
      priority: "MEDIUM",
      recommendation: "Auto-Escalate Candidate Interview SLA",
      reason: "Client 'Globex Corp' silent for 48 hrs on candidate 'Aarav Mehta'",
      impact: "Retain placement probability & candidate satisfaction",
      confidence: 88,
      status: "PENDING"
    },
    {
      id: "rec-3",
      priority: "LOW",
      recommendation: "Optimize AI Parser Models",
      reason: "Average resume extraction confidence score dipped to 84% for French-language profiles",
      impact: "Improve extraction recall rate +6%",
      confidence: 91,
      status: "PENDING"
    }
  ]);

  // Unified Office States
  const [offices, setOffices] = useState<OfficeRuntimeState[]>([
    {
      id: 'recruitment-office',
      name: 'Recruitment Office',
      description: 'PARSES RESUMES, MAPS DISPATCH MATCHES',
      status: 'RUNNING',
      state: 'Processing Queue',
      queueCount: 23,
      workers: 4,
      currentJob: 'Matching Candidates',
      startedAt: '09:32:11',
      lastHeartbeatSec: 3,
      avgRuntimeMs: 241,
      failuresToday: 0,
      retriesToday: 2,
      currentExecution: {
        requirement: 'Senior Java Developer',
        candidate: 'Rahul Sharma',
        step: 'Matching algorithm pass 2',
        progress: 67,
        estimatedFinishSec: 8
      },
      conversations: [
        { time: '09:34:02', log: 'Requirement REQ-2026-109 has only one active submission.' },
        { time: '09:35:15', log: 'Searching talent repository for viable alternatives...' },
        { time: '09:36:30', log: 'Found 4 suitable candidates based on semantic match.' },
        { time: '09:36:58', log: 'Candidate Amit Patel filtered. Reason: Target salary mismatch.' },
        { time: '09:37:12', log: 'Broadcasting matching profiles to primary vendor lists.' }
      ]
    },
    {
      id: 'vendor-office',
      name: 'Vendor Office',
      description: 'COACHES PARTNERS, HARNESSES VENDOR BENCH',
      status: 'RUNNING',
      state: 'Verifying Submissions',
      queueCount: 12,
      workers: 3,
      currentJob: 'Coaching Partners',
      startedAt: '09:15:04',
      lastHeartbeatSec: 7,
      avgRuntimeMs: 185,
      failuresToday: 1,
      retriesToday: 1,
      currentExecution: {
        requirement: 'Cloud Solutions Architect',
        candidate: 'Priyanka Sen',
        step: 'Verifying vendor authorization',
        progress: 40,
        estimatedFinishSec: 12
      },
      conversations: [
        { time: '09:15:10', log: 'Vendor partner Zenith Systems requested update on candidate Priyanka Sen.' },
        { time: '09:16:45', log: 'Analyzing profile completeness & compliance checks.' },
        { time: '09:18:20', log: 'Initiated skill assessment questionnaire dispatch.' }
      ]
    },
    {
      id: 'client-office',
      name: 'Client Office',
      description: 'MONITORS SLAs, ENFORCES TIMELINES',
      status: 'RUNNING',
      state: 'Monitoring SLAs',
      queueCount: 5,
      workers: 2,
      currentJob: 'Generating Insights',
      startedAt: '09:00:22',
      lastHeartbeatSec: 12,
      avgRuntimeMs: 310,
      failuresToday: 0,
      retriesToday: 0,
      currentExecution: {
        requirement: 'React Native Developer',
        candidate: 'Anil Deshmukh',
        step: 'Calculating SLA response time matrix',
        progress: 90,
        estimatedFinishSec: 3
      },
      conversations: [
        { time: '09:02:11', log: 'Client feedback SLA timer expired for REQ-2026-102.' },
        { time: '09:03:00', log: 'Pushed nudge notification to hiring manager dashboard.' }
      ]
    },
    {
      id: 'founder-office',
      name: 'Finance & Founder Office',
      description: 'MONITORS INVOICES, TRACES SAVED REVENUE',
      status: 'RUNNING',
      state: 'Aggregating Financials',
      queueCount: 2,
      workers: 2,
      currentJob: 'Validating Placements',
      startedAt: '08:45:10',
      lastHeartbeatSec: 21,
      avgRuntimeMs: 420,
      failuresToday: 0,
      retriesToday: 0,
      currentExecution: {
        requirement: 'Product Manager',
        candidate: 'Siddharth Roy',
        step: 'Generating pro-forma invoice PDF',
        progress: 15,
        estimatedFinishSec: 25
      },
      conversations: [
        { time: '08:46:15', log: 'Placement approved for candidate Siddharth Roy.' },
        { time: '08:48:30', log: 'Verifying tax structures and billing addresses.' }
      ]
    },
    {
      id: 'marketplace-office',
      name: 'Marketplace Office',
      description: 'MAPS GLOBAL ECOSYSTEM DEMAND AND BENCH',
      status: 'RUNNING',
      state: 'Scanning Ecosystem',
      queueCount: 8,
      workers: 3,
      currentJob: 'Mapping Skillsets',
      startedAt: '09:20:15',
      lastHeartbeatSec: 19,
      avgRuntimeMs: 195,
      failuresToday: 0,
      retriesToday: 1,
      currentExecution: {
        requirement: 'Golang Engineer',
        candidate: 'Meera Nair',
        step: 'Ecosystem supply analysis pass',
        progress: 55,
        estimatedFinishSec: 15
      },
      conversations: [
        { time: '09:21:05', log: 'Scanning cross-tenant developer benches for skill overlap.' },
        { time: '09:22:40', log: 'Identified 12 passive developers with matching traits.' }
      ]
    },
    {
      id: 'ai-coo',
      name: 'AI COO Office',
      description: 'PERFORMS QUEUE AUDITS, DETECTS SLA BREACHES',
      status: 'RUNNING',
      state: 'Analyzing Performance',
      queueCount: 0,
      workers: 1,
      currentJob: 'Formulating Directives',
      startedAt: '09:30:00',
      lastHeartbeatSec: 5,
      avgRuntimeMs: 820,
      failuresToday: 0,
      retriesToday: 0,
      currentExecution: {
        requirement: 'System-wide Queue Audit',
        candidate: 'N/A',
        step: 'SLA breach probability assessment',
        progress: 80,
        estimatedFinishSec: 4
      },
      conversations: [
        { time: '09:31:12', log: 'Initiating hourly autonomous sanity check.' },
        { time: '09:32:00', log: 'Verified Business Graph integrity: Nominal state.' }
      ]
    }
  ]);

  // Selected office for deep dive state tracking
  const [selectedOfficeId, setSelectedOfficeId] = useState<string>('recruitment-office');

  // Find currently selected office
  const selectedOffice = offices.find(o => o.id === selectedOfficeId) || offices[0];

  // Terminal logs with system traces, filtered by tags & search query
  const [terminalLogs, setTerminalLogs] = useState<any[]>([
    { time: '09:30:00', type: 'Runtime', text: 'Workforce OS kernel build 4.2 initialized successfully.', trace: 'TR-101' },
    { time: '09:30:05', type: 'Firestore', text: 'Connected to Firestore database: default (nominal).', trace: 'TR-102' },
    { time: '09:30:12', type: 'Event Bus', text: 'Event Bus dispatch channel active. Routing 14 active topics.', trace: 'TR-103' },
    { time: '09:31:00', type: 'MailOS', text: 'MailOS Workspace API syncing candidate mailboxes. Checked 15 inboxes.', trace: 'TR-104' },
    { time: '09:32:11', type: 'Office Logs', text: '[Recruitment Office] Worker thread assigned to Rahul Sharma (REQ-2026-109).', trace: 'TR-105' },
    { time: '09:34:02', type: 'AI Decisions', text: '[Decision Engine] Formulated recruitment backup recommendation due to low submission count.', trace: 'TR-106' },
    { time: '09:35:45', type: 'Errors', text: '[MailOS] SLA reminder dispatch failed to client: Globex. Will retry in 60s.', trace: 'TR-107' },
    { time: '09:36:12', type: 'Decision Engine', text: 'Candidate Aarav Mehta match score calibrated at 94%.', trace: 'REQ-2026-109' },
    { time: '09:37:00', type: 'Runtime', text: 'Active queue depth decreased from 28 to 23 items.', trace: 'TR-908' }
  ]);

  // Filter checkboxes for the Event Log Terminal
  const [logFilters, setLogFilters] = useState<Record<string, boolean>>({
    'Event Bus': true,
    'Office Logs': true,
    'Errors': true,
    'AI Decisions': true,
    'MailOS': true,
    'Runtime': true,
    'Firestore': true,
    'Decision Engine': true
  });

  // Search input for logs
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');

  // Schedulers, heartbeats, and progress simulator to make the operating system feel truly active
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate progress counting down and ticking heartbeats
      setOffices(prev => 
        prev.map(office => {
          let updatedExec = office.currentExecution;
          if (updatedExec && office.status === 'RUNNING') {
            const nextProg = updatedExec.progress >= 100 ? 5 : updatedExec.progress + Math.floor(Math.random() * 5) + 2;
            const nextEst = updatedExec.estimatedFinishSec <= 1 ? Math.floor(Math.random() * 20) + 10 : updatedExec.estimatedFinishSec - 1;
            updatedExec = {
              ...updatedExec,
              progress: nextProg,
              estimatedFinishSec: nextEst
            };
          }
          return {
            ...office,
            lastHeartbeatSec: office.status === 'RUNNING' ? office.lastHeartbeatSec + 1 : office.lastHeartbeatSec,
            currentExecution: updatedExec
          };
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Simulator for periodically adding logs to the active terminal stdout
  useEffect(() => {
    const logInterval = setInterval(() => {
      if (!workforceRunning) return;

      const randomTypes = ['Event Bus', 'Office Logs', 'AI Decisions', 'MailOS', 'Runtime', 'Decision Engine'];
      const randomType = randomTypes[Math.floor(Math.random() * randomTypes.length)];
      
      let randomText = '';
      let randomTrace = `TR-${Math.floor(Math.random() * 900) + 100}`;

      switch (randomType) {
        case 'Event Bus':
          randomText = `Dispatched message type EVENT_PROCESSED on topic /queue/matching. Data payload valid.`;
          break;
        case 'Office Logs':
          const candidates = ['Rahul Sharma', 'Sneha Patel', 'John Doe', 'Vikram Singh', 'Aarav Mehta'];
          const officesNames = ['Recruitment Office', 'Vendor Office', 'Client Office'];
          randomText = `[${officesNames[Math.floor(Math.random() * officesNames.length)]}] Processing lifecycle state shift for candidate: ${candidates[Math.floor(Math.random() * candidates.length)]}.`;
          break;
        case 'AI Decisions':
          randomText = `AI Decision Model mapped alternative candidate profiles. Match delta verified at +3.2%.`;
          break;
        case 'MailOS':
          randomText = `Successfully delivered structured client brief follow-up. Sync token updated.`;
          break;
        case 'Runtime':
          randomText = `Scheduler completed periodic marketplace sweep. Checked 8 inbound vendor requests.`;
          break;
        case 'Decision Engine':
          randomText = `Evaluated recruiter override logs. Recruiter decision weight synchronized.`;
          break;
      }

      const timestamp = new Date().toLocaleTimeString();
      setTerminalLogs(prev => [
        ...prev.slice(-30), // keep last 30 logs for memory performance
        { time: timestamp, type: randomType, text: randomText, trace: randomTrace }
      ]);
    }, 5000);

    return () => clearInterval(logInterval);
  }, [workforceRunning]);

  // Master switch execution with Safe Execution Mode pre-flight check validation
  const triggerStartWorkforce = () => {
    // Perform automated checks
    setShowPreflightModal(true);
    setPreflightLogs([]);
    
    const checks = [
      { name: "Firestore Reachability Check", pass: true, delay: 400 },
      { name: "Event Bus Routing Verification", pass: !eventBusStopped, delay: 800 },
      { name: "MailOS OAuth Link Verification", pass: !mailosPaused, delay: 1200 },
      { name: "Business Graph Referential Constraint Scan", pass: true, delay: 1600 },
      { name: "Inbound Queue Consistency Scan", pass: true, delay: 2000 },
      { name: "Vibe Coding Security Spec Certification", pass: true, delay: 2400 },
      { name: "AI Core Gemini Model Connectivity", pass: !geminiDisabled, delay: 2800 }
    ];

    let currentLogIndex = 0;
    
    const runCheck = (index: number) => {
      if (index >= checks.length) {
        // Evaluate all preflight passes
        const allPass = !eventBusStopped && !mailosPaused && !geminiDisabled;
        setPreflightPass(allPass);
        if (allPass) {
          setTimeout(() => {
            setWorkforceRunning(true);
            setOffices(prev => prev.map(o => ({ ...o, status: 'RUNNING', lastHeartbeatSec: 0 })));
            setShowPreflightModal(false);
            addLog("System", "Safe Execution Mode: workforce started successfully after 7/7 preflight checks passed.", "TR-SAFE");
          }, 600);
        } else {
          // Failure
          addLog("Runtime", "Safe Execution Mode BLOCKED: PREFLIGHT INTEGRITY CHECKS FAILED.", "TR-BLOCK");
        }
        return;
      }

      const item = checks[index];
      setTimeout(() => {
        setPreflightLogs(prev => [
          ...prev, 
          `${item.pass ? '✓' : '✗'} ${item.name} ... ${item.pass ? 'HEALTHY' : 'FAILED'}`
        ]);
        runCheck(index + 1);
      }, item.delay - (index > 0 ? checks[index-1].delay : 0));
    };

    runCheck(0);
  };

  const toggleWorkforce = () => {
    if (workforceRunning) {
      // Halted State
      setWorkforceRunning(false);
      setOffices(prev => prev.map(o => ({ ...o, status: 'STOPPED' })));
      addLog("Runtime", "EMERGENCY HALT: Suspended all background scheduler loops and active offices.", "TR-HALT");
    } else {
      // Start with Pre-Flight checks
      triggerStartWorkforce();
    }
  };

  // Helper to add manual event logs to the terminal
  const addLog = (type: string, text: string, trace: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [
      ...prev,
      { time: timestamp, type, text, trace }
    ]);
  };

  // Strategic Decision Handlers
  const handleApproveRecommendation = (id: string, name: string) => {
    setCooRecommendations(prev => 
      prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r)
    );
    addLog("AI Decisions", `Approved strategic directive: ${name}. Enqueued workflow dispatch command.`, "TR-COO-APPR");
  };

  const handleIgnoreRecommendation = (id: string, name: string) => {
    setCooRecommendations(prev => 
      prev.map(r => r.id === id ? { ...r, status: "IGNORED" } : r)
    );
    addLog("AI Decisions", `Ignored strategic directive: ${name}.`, "TR-COO-IGN");
  };

  const handleModifyRecommendation = (id: string, name: string) => {
    setCooRecommendations(prev => 
      prev.map(r => r.id === id ? { ...r, status: "MODIFIED" } : r)
    );
    addLog("AI Decisions", `Modified strategic directive: ${name} (custom parameters applied).`, "TR-COO-MOD");
  };

  // Filter logs dynamically
  const filteredLogs = terminalLogs.filter(log => {
    const matchesFilter = logFilters[log.type] === true;
    const matchesSearch = logSearchQuery === '' || 
      log.text.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.type.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
      log.trace.toLowerCase().includes(logSearchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Capability Test States
  const [capabilityTestStates, setCapabilityTestStates] = useState<Record<string, 'idle' | 'testing' | 'success'>>({
    resume: 'idle',
    requirement: 'idle',
    matching: 'idle',
    forecasting: 'idle',
    mailos: 'idle',
    decision: 'idle'
  });

  const testCapability = async (capabilityId: string, capabilityName: string) => {
    setCapabilityTestStates(prev => ({ ...prev, [capabilityId]: 'testing' }));
    addLog("Runtime", `Running capability diagnostic validation check: ${capabilityName}...`, "TR-TEST");
    
    await new Promise(resolve => setTimeout(resolve, 1200));
    setCapabilityTestStates(prev => ({ ...prev, [capabilityId]: 'success' }));
    addLog("Runtime", `✓ Diagnostic passed: ${capabilityName} schema and interface verified as NOMINAL.`, "TR-PASS");
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Access Restricted to HireNestOS HQ
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      {/* HUD Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-6 shadow-inner relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Cpu size={180} className="text-indigo-400" />
        </div>
        <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Zap className="text-indigo-400 animate-pulse" size={26} />
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase font-mono">
                Workforce Control Center
              </h1>
              <span className="bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 font-mono text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                v2.1 Kernel
              </span>
            </div>
            <p className="text-slate-400 font-medium text-xs max-w-2xl">
              Enterprise operations and live governance console for HireNestOS. Administer schedulers, view real-time logs, execute diagnostic audits, and resolve exceptions.
            </p>
          </div>

          {/* Autopilot Strategy Card */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl flex items-center gap-4">
            <div className="space-y-1">
              <span className="text-[9px] font-bold uppercase text-slate-500 tracking-widest block font-mono">Autopilot Mode</span>
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={() => {
                    setAutopilotMode('manual');
                    addLog("Runtime", "Switched Autopilot Strategy to MANUAL. HQ authorization required for all steps.", "TR-AUTO");
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                    autopilotMode === 'manual' ? "bg-rose-500 text-white font-black" : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  )}
                >
                  Manual
                </button>
                <button 
                  onClick={() => {
                    setAutopilotMode('assisted');
                    addLog("Runtime", "Switched Autopilot Strategy to ASSISTED. Proposing recommendations.", "TR-AUTO");
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                    autopilotMode === 'assisted' ? "bg-amber-500 text-white font-black" : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  )}
                >
                  Assisted
                </button>
                <button 
                  onClick={() => {
                    setAutopilotMode('autonomous');
                    addLog("Runtime", "Switched Autopilot Strategy to AUTONOMOUS. Operating continuously within policies.", "TR-AUTO");
                  }}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                    autopilotMode === 'autonomous' ? "bg-emerald-500 text-white font-black" : "bg-slate-900 text-slate-400 hover:text-slate-200"
                  )}
                >
                  Autonomous
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8 flex-1">
        
        {/* Safe Execution Preflight Block Alert if check failed */}
        {!preflightPass && showPreflightModal && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-4 animate-in slide-in-from-top duration-300">
            <AlertCircle className="text-rose-500 shrink-0 w-6 h-6" />
            <div className="space-y-2 flex-1">
              <h4 className="font-black text-rose-800 text-sm">Cannot Start Workforce Runtime OS</h4>
              <p className="text-xs text-rose-700 font-medium">
                Business Graph Integrity, Event Bus, or MailOS check returned non-compliant status. Start operation blocked to prevent database schema drift.
              </p>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[10.5px] text-rose-400 space-y-1">
                {preflightLogs.map((log, index) => (
                  <div key={index}>{log}</div>
                ))}
              </div>
              <button 
                onClick={() => {
                  setEventBusStopped(false);
                  setMailosPaused(false);
                  setGeminiDisabled(false);
                  setPreflightPass(true);
                  setShowPreflightModal(false);
                }}
                className="mt-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg shadow-sm"
              >
                Reset Mute Switches & Retry Preflight Check
              </button>
            </div>
          </div>
        )}

        {/* Workspace Tab Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
            <button 
              onClick={() => setActiveTab('control')}
              className={cn(
                "px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", 
                activeTab === 'control' ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              <Gauge className="w-4 h-4 text-indigo-500" /> Workforce Control Center
            </button>
            <button 
              onClick={() => setActiveTab('approvals')}
              className={cn(
                "px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", 
                activeTab === 'approvals' ? "border-amber-500 text-amber-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Pending Approvals ({pendingApprovals.length})
            </button>
            <button 
              onClick={() => setActiveTab('rules')}
              className={cn(
                "px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", 
                activeTab === 'rules' ? "border-indigo-500 text-indigo-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Automation Engine
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={cn(
                "px-6 py-4 text-xs font-black uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap", 
                activeTab === 'logs' ? "border-emerald-500 text-emerald-700 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              Execution Audit
            </button>
          </div>

          <div className="p-6 flex-1">
            
            {/* WORKFORCE CONTROL TAB */}
            {activeTab === 'control' && (
              <div className="space-y-8">
                
                {/* Master Switch Panel */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Master Status & Toggle */}
                  <div className={cn(
                    "p-6 rounded-2xl border flex flex-col justify-between transition-all shadow-sm",
                    workforceRunning 
                      ? "bg-emerald-50/40 border-emerald-200" 
                      : "bg-rose-50/40 border-rose-200"
                  )}>
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block font-mono">Master State</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                          workforceRunning ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        )}>
                          <span className={cn("w-1.5 h-1.5 rounded-full", workforceRunning ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                          {workforceRunning ? "ACTIVE" : "HALTED"}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-black text-slate-800 leading-tight">
                        Enterprise Runtime OS
                      </h3>
                      <p className="text-xs text-slate-500 mt-2">
                        Halting the workforce instantly suspends all background queues, scheduled events, and cron matching jobs. Starting performs Safe preflight integrity checks.
                      </p>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <button 
                        onClick={toggleWorkforce}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl text-xs font-bold text-white shadow transition-all flex items-center justify-center gap-2",
                          workforceRunning 
                            ? "bg-rose-600 hover:bg-rose-700 shadow-rose-100" 
                            : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100"
                        )}
                      >
                        <Power size={14} />
                        <span>{workforceRunning ? "Stop Workforce" : "Start Workforce"}</span>
                      </button>

                      <button 
                        disabled={!workforceRunning}
                        onClick={() => {
                          addLog("Runtime", "HQ triggered single database-wide queue execution run.", "TR-RUN-ONCE");
                        }}
                        className="px-4 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
                        title="Process Queue Once"
                      >
                        <RotateCw size={14} />
                        <span>Run Once</span>
                      </button>
                    </div>
                  </div>

                  {/* Operational Health Status Matrix (Item 9) */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block font-mono">System Health Matrix</span>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider font-mono">Real-time status</span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 font-mono text-[11px] font-semibold text-slate-600">
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span>MailOS</span>
                          <span className={cn("text-[10px] font-bold", mailosPaused ? "text-rose-500" : "text-emerald-500")}>
                            {mailosPaused ? "● SUSPENDED" : "🟢 HEALTHY"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span>Business Graph</span>
                          <span className="text-emerald-500 text-[10px] font-bold">🟢 HEALTHY</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span>Decision Engine</span>
                          <span className="text-emerald-500 text-[10px] font-bold">🟢 HEALTHY</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span>Capability Broker</span>
                          <span className="text-emerald-500 text-[10px] font-bold">🟢 HEALTHY</span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span>Event Bus</span>
                          <span className={cn("text-[10px] font-bold", eventBusStopped ? "text-rose-500" : "text-emerald-500")}>
                            {eventBusStopped ? "● STOPPED" : "🟢 HEALTHY"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                          <span>Telemetry Hub</span>
                          <span className="text-emerald-500 text-[10px] font-bold">🟢 HEALTHY</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Firestore DB</span>
                          <span className="text-emerald-500 text-[10px] font-bold">🟢 HEALTHY</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Gemini Client</span>
                          <span className={cn("text-[10px] font-bold", geminiDisabled ? "text-rose-500" : "text-emerald-500")}>
                            {geminiDisabled ? "● MUTED" : "🟢 HEALTHY"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => addLog("Runtime", "Refreshed unified system-wide diagnostics matrix.", "TR-REFR")}
                      className="mt-4 w-full py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-lg text-[10px] font-bold transition-all"
                    >
                      Refresh Health Specs
                    </button>
                  </div>

                  {/* Operational Mute Switches */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block font-mono">Emergency Rail</span>
                        <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider font-mono">Mute switches</span>
                      </div>

                      <div className="space-y-2 text-xs font-semibold text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Stop Event Bus</span>
                          <button 
                            onClick={() => {
                              const next = !eventBusStopped;
                              setEventBusStopped(next);
                              addLog("Emergency", `Event Bus dispatcher transitioned to ${next ? 'HALTED' : 'ACTIVE'}.`, "TR-DISP");
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all",
                              eventBusStopped ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {eventBusStopped ? "STOPPED" : "NOMINAL"}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>Pause MailOS</span>
                          <button 
                            onClick={() => {
                              const next = !mailosPaused;
                              setMailosPaused(next);
                              addLog("Emergency", `MailOS worker synchronization ${next ? 'SUSPENDED' : 'ACTIVE'}.`, "TR-MAIL");
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all",
                              mailosPaused ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {mailosPaused ? "PAUSED" : "NOMINAL"}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>Disable Matching</span>
                          <button 
                            onClick={() => {
                              const next = !matchingDisabled;
                              setMatchingDisabled(next);
                              addLog("Emergency", `Match scoring engine algorithm ${next ? 'SUSPENDED' : 'ACTIVE'}.`, "TR-MATCH");
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all",
                              matchingDisabled ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {matchingDisabled ? "SUSPENDED" : "NOMINAL"}
                          </button>
                        </div>

                        <div className="flex items-center justify-between">
                          <span>Disable Gemini API</span>
                          <button 
                            onClick={() => {
                              const next = !geminiDisabled;
                              setGeminiDisabled(next);
                              addLog("Emergency", `Gemini client routing ${next ? 'DISABLED' : 'ACTIVE'}.`, "TR-GEM");
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded text-[10px] font-bold uppercase transition-all",
                              geminiDisabled ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                            )}
                          >
                            {geminiDisabled ? "DISABLED" : "NOMINAL"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Queue Visualization Breakdown & Worker Utilization Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Queue Visualization Breakdown (Item 5) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block font-mono">Queue Depth Breakdown</span>
                        <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-55 py-0.5 px-2 rounded">
                          {Object.values(queueBreakdown).reduce((a, b) => a + b, 0)} Total Tasks
                        </span>
                      </div>
                      
                      <div className="space-y-3 font-sans">
                        {[
                          { label: "Email Sync Tasks", val: queueBreakdown.email, color: "bg-blue-500", key: "email" },
                          { label: "Resume Parsing", val: queueBreakdown.resumeParsing, color: "bg-purple-500", key: "resume" },
                          { label: "Matching Queries", val: queueBreakdown.matching, color: "bg-indigo-500", key: "matching" },
                          { label: "Partner Submissions", val: queueBreakdown.submission, color: "bg-cyan-500", key: "submission" },
                          { label: "Active Interview Schedules", val: queueBreakdown.interview, color: "bg-amber-500", key: "interview" },
                          { label: "Negotiating Offers", val: queueBreakdown.offer, color: "bg-emerald-500", key: "offer" },
                          { label: "Finance & Invoicing", val: queueBreakdown.finance, color: "bg-rose-500", key: "finance" }
                        ].map((item, idx) => {
                          const total = Object.values(queueBreakdown).reduce((a, b) => a + b, 0);
                          const percentage = Math.round((item.val / total) * 100);
                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between text-xs font-semibold text-slate-700">
                                <span className="flex items-center gap-1.5">
                                  <span className={cn("w-2 h-2 rounded-full", item.color)} />
                                  {item.label}
                                </span>
                                <span className="font-mono text-slate-500">{item.val} items ({percentage}%)</span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={cn("h-full rounded-full transition-all duration-500", item.color)} style={{ width: `${percentage}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Worker Pools Utilization (Item 7) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block font-mono">Worker Pools Utilization</span>
                        <span className="text-xs font-mono font-bold text-slate-500">Multiprocessing Scales</span>
                      </div>

                      <div className="space-y-4 pt-2">
                        {[
                          { label: "Recruitment Pool", value: workerUtilization.recruitment, color: "bg-indigo-600" },
                          { label: "Vendor Outreach Pool", value: workerUtilization.vendor, color: "bg-cyan-600" },
                          { label: "Finance & Invoice Processor", value: workerUtilization.finance, color: "bg-emerald-600" },
                          { label: "AI COO Strategic Engine", value: workerUtilization.coo, color: "bg-purple-600" }
                        ].map((pool, idx) => (
                          <div key={idx} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>{pool.label}</span>
                              <span className="font-mono text-slate-600">{pool.value}% Active</span>
                            </div>
                            <div className="flex items-center gap-2 font-mono text-[10px]">
                              <span className="text-slate-400 font-bold shrink-0">CPU Pool</span>
                              <div className="flex-1 bg-slate-100 h-4 rounded overflow-hidden flex items-center relative border border-slate-150">
                                <div className={cn("h-full transition-all duration-700", pool.color)} style={{ width: `${pool.value}%` }} />
                                <span className="absolute inset-0 flex items-center justify-center text-slate-700 font-bold mix-blend-difference text-[9.5px]">
                                  {Math.round(pool.value / 10)} / 10 Workers Active
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 flex justify-between text-[10px] font-mono font-semibold text-slate-400">
                      <span>Scaling Config: AUTO-SCALE ENABLED</span>
                      <span className="text-indigo-600">Max limit: 40 threads</span>
                    </div>
                  </div>

                </div>

                {/* Main Office Fleet Row & Detail Panel Side-by-Side */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                      <Bot size={16} className="text-indigo-600" /> Active Autonomous Office Fleet
                    </h3>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">CLICK AN OFFICE TO EXAMINE EXECUTIONS</span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    
                    {/* Left 2 Columns: Office Fleet Grid */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {offices.map((office) => {
                        const isSelected = selectedOfficeId === office.id;
                        return (
                          <div 
                            key={office.id}
                            onClick={() => setSelectedOfficeId(office.id)}
                            className={cn(
                              "bg-white p-5 rounded-2xl border transition-all shadow-sm flex flex-col justify-between h-48 cursor-pointer relative",
                              isSelected ? "ring-2 ring-indigo-500 border-indigo-200 bg-indigo-50/10" : "hover:border-slate-350 border-slate-200"
                            )}
                          >
                            <div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="text-sm font-black text-slate-800">{office.name}</h4>
                                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5 tracking-wider uppercase">{office.description}</p>
                                </div>
                                <span className={cn(
                                  "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1",
                                  office.status === 'RUNNING' ? "bg-emerald-50 text-emerald-600" :
                                  office.status === 'PROCESSING' ? "bg-indigo-50 text-indigo-600 animate-pulse" :
                                  office.status === 'PAUSED' ? "bg-amber-50 text-amber-600 font-bold" :
                                  "bg-slate-100 text-slate-400"
                                )}>
                                  <span className={cn("w-1.5 h-1.5 rounded-full", office.status === 'RUNNING' ? "bg-emerald-500 animate-pulse" : office.status === 'PROCESSING' ? "bg-indigo-500" : office.status === 'PAUSED' ? "bg-amber-500" : "bg-slate-400")} />
                                  {office.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-3 mt-4 font-mono text-[10px] font-semibold text-slate-500">
                                <div>
                                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider">Queue Depth</span>
                                  <span className="text-slate-700 text-xs font-bold">{office.queueCount} items</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider">Workers</span>
                                  <span className="text-slate-700 text-xs font-bold">{office.workers} threads</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block uppercase text-[8px] tracking-wider">Heartbeat</span>
                                  <span className="text-slate-700 text-xs font-bold">
                                    {office.status === 'RUNNING' ? `${office.lastHeartbeatSec}s ago` : 'offline'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3 flex gap-2">
                              <button 
                                disabled={!workforceRunning || office.status === 'PROCESSING'}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Trigger office
                                  setOffices(prev => prev.map(o => o.id === office.id ? { ...o, status: 'PROCESSING' } : o));
                                  addLog("Dispatcher", `Triggered immediate job run for ${office.name}.`, "TR-TRIG");
                                  setTimeout(() => {
                                    setOffices(prev => prev.map(o => o.id === office.id ? { ...o, status: 'RUNNING', lastHeartbeatSec: 0, queueCount: Math.max(0, o.queueCount - 1) } : o));
                                    addLog("Runtime", `✓ Completed manual execution sequence for ${office.name}.`, "TR-DONE");
                                  }, 1500);
                                }}
                                className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 shadow-xs"
                              >
                                <Play size={10} /> Run Now
                              </button>
                              <button 
                                disabled={!workforceRunning}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOffices(prev => prev.map(o => o.id === office.id ? { ...o, status: o.status === 'PAUSED' ? 'RUNNING' : 'PAUSED' } : o));
                                }}
                                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold"
                              >
                                {office.status === 'PAUSED' ? <Play size={10} /> : <Pause size={10} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right 1 Column: Selected Office Execution & Reasoning Deep Dive Detail (Items 1, 2, 4) */}
                    <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl border border-slate-800 shadow-lg flex flex-col justify-between min-h-[400px]">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-2">
                            <Activity className="text-indigo-400 w-4 h-4 animate-pulse" />
                            <h4 className="text-xs font-black uppercase tracking-widest font-mono text-indigo-400">
                              Selected Office Runtime Spec
                            </h4>
                          </div>
                          <span className="text-[9px] font-mono text-slate-500 uppercase">Live telemetry</span>
                        </div>

                        <div>
                          <h3 className="text-base font-black text-white">{selectedOffice.name}</h3>
                          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/60 border border-indigo-900 px-2 py-0.5 rounded uppercase mt-1 inline-block">
                            State: {selectedOffice.state}
                          </span>
                        </div>

                        {/* Complete True Runtime Metrics (Item 1) */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 font-mono text-[10px] text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-850">
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Job In Queue</span>
                            <span className="text-slate-200 font-bold text-xs">{selectedOffice.queueCount} items</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Workers Pool</span>
                            <span className="text-slate-200 font-bold text-xs">{selectedOffice.workers} threads</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Last Heartbeat</span>
                            <span className="text-slate-200 font-bold text-xs">{selectedOffice.lastHeartbeatSec} sec ago</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Avg Runtime</span>
                            <span className="text-slate-200 font-bold text-xs">{selectedOffice.avgRuntimeMs} ms</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Failures Today</span>
                            <span className="text-rose-400 font-bold text-xs">{selectedOffice.failuresToday}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] text-slate-500 uppercase tracking-widest">Retries Count</span>
                            <span className="text-amber-400 font-bold text-xs">{selectedOffice.retriesToday}</span>
                          </div>
                        </div>

                        {/* Active Work Visualizer (Item 2) */}
                        {selectedOffice.currentExecution && (
                          <div className="bg-indigo-950/30 border border-indigo-900/40 p-3 rounded-lg space-y-2.5">
                            <span className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest block font-mono">Current Active Work</span>
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300">
                              <div>
                                <span className="text-slate-500 block text-[8px] uppercase">Requirement</span>
                                <span className="font-bold text-indigo-200">{selectedOffice.currentExecution.requirement}</span>
                              </div>
                              <div>
                                <span className="text-slate-500 block text-[8px] uppercase">Candidate</span>
                                <span className="font-bold text-indigo-200">{selectedOffice.currentExecution.candidate}</span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono">
                                <span className="text-slate-400 truncate">{selectedOffice.currentExecution.step}</span>
                                <span className="font-bold text-indigo-300">{selectedOffice.currentExecution.progress}%</span>
                              </div>
                              <div className="w-full bg-slate-800 h-1 rounded overflow-hidden">
                                <div className="bg-indigo-400 h-full transition-all duration-300" style={{ width: `${selectedOffice.currentExecution.progress}%` }} />
                              </div>
                            </div>

                            <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono">
                              <span>Estimated Finish:</span>
                              <span className="text-indigo-300 animate-pulse font-bold">{selectedOffice.currentExecution.estimatedFinishSec} sec</span>
                            </div>
                          </div>
                        )}

                        {/* Internal Office Conversations Reasoning Log (Item 4) */}
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Internal Reasoning Log</span>
                          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[10.5px] font-mono text-slate-300 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {selectedOffice.conversations.map((conv, idx) => (
                              <div key={idx} className="leading-relaxed">
                                <span className="text-indigo-400 mr-2 text-[9px]">{conv.time}</span>
                                <span className="text-slate-300">{conv.log}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>

                      <div className="border-t border-slate-800 pt-3 mt-4 text-[9px] font-mono text-slate-500 flex justify-between">
                        <span>Office Thread Code: C-A-1</span>
                        <span>Tenant: Global HQ</span>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Schedulers Visibility (Item 8) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-600" /> background schedulers & crons
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {schedulers.map((sch, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
                        <div className="space-y-1">
                          <h4 className="text-xs font-bold text-slate-800">{sch.name}</h4>
                          <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500">
                            <span>{sch.interval}</span>
                            <span>•</span>
                            <span className="text-slate-400">Duration: {sch.duration}</span>
                          </div>
                        </div>
                        
                        <div className="text-right space-y-1 font-mono text-[9px]">
                          <span className="text-slate-400 block">Next: {sch.nextRun}</span>
                          <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-black text-[8.5px]">
                            {sch.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI COO Recommendation Queue & Strategic Actions (Item 3) */}
                <div className="bg-indigo-50/20 border border-indigo-100 p-6 rounded-2xl space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-indigo-100 pb-4">
                    <div className="flex items-center gap-3">
                      <Sparkles className="text-indigo-600 animate-pulse" size={24} />
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-850">
                          AI COO Recommendations Queue
                        </h4>
                        <p className="text-xs text-slate-500 font-medium">
                          Strategic advisor matching real-time queue states with market conditions & revenue impact maps.
                        </p>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => {
                        addLog("AI Decisions", "Triggered live strategic sweep of all active staffing pipelines.", "TR-SWEEP");
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <Sparkles size={13} /> Sweep Pipelines
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cooRecommendations.map((rec) => (
                      <div 
                        key={rec.id} 
                        className={cn(
                          "bg-white p-5 rounded-2xl border transition-all shadow-sm flex flex-col justify-between space-y-4",
                          rec.status === 'APPROVED' ? "border-emerald-300 bg-emerald-50/10 opacity-75" :
                          rec.status === 'IGNORED' ? "border-slate-200 bg-slate-50/50 opacity-50" :
                          rec.status === 'MODIFIED' ? "border-amber-300 bg-amber-50/10 opacity-75" :
                          "border-slate-200"
                        )}
                      >
                        <div className="space-y-2.5">
                          <div className="flex justify-between items-center">
                            <span className={cn(
                              "px-2 py-0.5 rounded text-[9px] font-black tracking-wider uppercase font-mono",
                              rec.priority === 'HIGH' ? "bg-rose-100 text-rose-800" :
                              rec.priority === 'MEDIUM' ? "bg-amber-100 text-amber-800" :
                              "bg-slate-100 text-slate-600"
                            )}>
                              {rec.priority} Priority
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 font-bold">{rec.confidence}% Confidence</span>
                          </div>

                          <h4 className="text-sm font-black text-slate-800 leading-tight">
                            {rec.recommendation}
                          </h4>
                          
                          <p className="text-[11.5px] text-slate-500 leading-relaxed font-semibold">
                            {rec.reason}
                          </p>

                          <div className="bg-slate-50/80 border border-slate-100 p-2 rounded-lg font-mono text-[10.5px] text-slate-700 flex justify-between">
                            <span className="font-bold">Ecosystem Impact:</span>
                            <span className="font-black text-indigo-600">{rec.impact}</span>
                          </div>
                        </div>

                        {/* Recommendation Controls */}
                        {rec.status === 'PENDING' ? (
                          <div className="flex gap-2 border-t border-slate-100 pt-3.5">
                            <button 
                              onClick={() => handleIgnoreRecommendation(rec.id, rec.recommendation)}
                              className="flex-1 py-1.5 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-lg text-[10px] font-bold transition-all"
                            >
                              Ignore
                            </button>
                            <button 
                              onClick={() => handleModifyRecommendation(rec.id, rec.recommendation)}
                              className="px-2.5 py-1.5 hover:bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[10px] font-bold transition-all"
                            >
                              Modify
                            </button>
                            <button 
                              onClick={() => handleApproveRecommendation(rec.id, rec.recommendation)}
                              className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-bold transition-all shadow-xs"
                            >
                              Approve
                            </button>
                          </div>
                        ) : (
                          <div className="border-t border-slate-150 pt-3 text-center text-[10px] font-black uppercase tracking-wider font-mono text-slate-500">
                            Directive status: {rec.status}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Row: Diagnostic checks + Logs terminal */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Diagnostic verification tools (Verify Services) */}
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-700 flex items-center gap-2">
                          <Shield className="text-indigo-500" size={16} /> Capability Diagnostics Panel
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase font-mono">Verify Services</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'resume', name: 'Resume Parsing' },
                          { id: 'requirement', name: 'Requirement Parsing' },
                          { id: 'matching', name: 'Matching Engine' },
                          { id: 'forecasting', name: 'Forecasting Model' },
                          { id: 'mailos', name: 'MailOS Pipeline' },
                          { id: 'decision', name: 'Decision Engine' }
                        ].map((cap) => (
                          <div key={cap.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-700 block">{cap.name}</span>
                              <span className="text-[9px] text-slate-400 mt-0.5 block">Integration path</span>
                            </div>

                            <button 
                              disabled={!workforceRunning || capabilityTestStates[cap.id] === 'testing'}
                              onClick={() => testCapability(cap.id, cap.name)}
                              className={cn(
                                "px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all",
                                capabilityTestStates[cap.id] === 'success' ? "bg-emerald-100 text-emerald-800" :
                                capabilityTestStates[cap.id] === 'testing' ? "bg-indigo-100 text-indigo-800 animate-pulse" :
                                "bg-white hover:bg-slate-100 border border-slate-200 text-slate-600"
                              )}
                            >
                              {capabilityTestStates[cap.id] === 'success' ? "ACTIVE" : capabilityTestStates[cap.id] === 'testing' ? "TESTING" : "TEST"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-150 bg-slate-50 flex items-center justify-between mt-4">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">Clear Dead Letter Queue</span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Scrub poisoned messages from queue</span>
                      </div>
                      <button 
                        onClick={() => {
                          addLog("Emergency", "Scrubbed dead-letter-queue manually.", "TR-DLQ");
                        }}
                        className="bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Trash2 size={12} />
                        <span>Scrub</span>
                      </button>
                    </div>
                  </div>

                  {/* Real-time agent terminal logs with Search & Filter options (Item 6) */}
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-900 shadow-xl space-y-4 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-850 pb-3 text-slate-200">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                          <Terminal size={14} className="animate-pulse text-emerald-400" /> Unified Event Log Bus & stream
                        </span>
                        
                        {/* Search Input */}
                        <div className="relative shrink-0 w-full md:w-64">
                          <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2" />
                          <input 
                            type="text"
                            placeholder="Search Rahul, REQ-2026-109, TR-908..."
                            value={logSearchQuery}
                            onChange={(e) => setLogSearchQuery(e.target.value)}
                            className="bg-slate-900 text-[10.5px] font-mono text-slate-300 pl-8 pr-2.5 py-1 rounded border border-slate-800 focus:outline-none focus:border-emerald-500 w-full"
                          />
                        </div>
                      </div>

                      {/* Log Filters Matrix */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-2">
                        {Object.keys(logFilters).map((filterName) => (
                          <label key={filterName} className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 cursor-pointer hover:text-slate-200">
                            <input 
                              type="checkbox"
                              checked={logFilters[filterName]}
                              onChange={(e) => setLogFilters(prev => ({ ...prev, [filterName]: e.target.checked }))}
                              className="rounded bg-slate-900 border-slate-800 text-emerald-500 focus:ring-transparent w-3.5 h-3.5"
                            />
                            <span>{filterName}</span>
                          </label>
                        ))}
                      </div>

                      {/* Terminal Output */}
                      <div className="font-mono text-[11px] text-emerald-400 space-y-1.5 max-h-60 overflow-y-auto pr-2 mt-4 bg-black/40 p-4 rounded-xl border border-slate-900 h-60 select-all scrollbar-thin">
                        {filteredLogs.length === 0 ? (
                          <div className="text-slate-500 text-center font-mono py-8">
                            No logs match filter settings or query.
                          </div>
                        ) : filteredLogs.map((log, idx) => (
                          <div key={idx} className="whitespace-pre-wrap font-mono leading-relaxed">
                            <span className="text-slate-500 mr-2">[{log.time}]</span>
                            <span className="text-indigo-400 mr-2 font-bold">[{log.type}]</span>
                            <span className="text-slate-200">{log.text}</span>
                            <span className="text-slate-600 ml-2 text-[10px] float-right">Trace: {log.trace}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-3 text-[10px] font-mono text-slate-500">
                      <span>Buffered logs: {filteredLogs.length}</span>
                      <button 
                        onClick={() => setTerminalLogs([])}
                        className="text-slate-500 hover:text-slate-300 font-bold"
                      >
                        Clear terminal buffer
                      </button>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* PENDING APPROVALS TAB */}
            {activeTab === 'approvals' && (
              <div className="divide-y divide-slate-100">
                {pendingApprovals.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p>No high-priority manual approvals pending</p>
                    <p className="text-[10px] text-slate-400 font-normal normal-case">Assisted autopilot proposals display in the main Recommendations Queue.</p>
                  </div>
                ) : pendingApprovals.map(pa => (
                  <div key={pa.id} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className="mt-1">
                        <AlertTriangle className={cn("w-5 h-5", pa.severity === 'high' ? "text-rose-500" : "text-amber-500")} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{pa.rule}</span>
                          <span className="text-xs text-slate-400 font-medium flex items-center"><Clock className="w-3 h-3 mr-1" /> {pa.date}</span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-800">{pa.desc}</h4>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg">Reject</button>
                      <button className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm">Approve & Execute</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AUTOMATION ENGINE TAB */}
            {activeTab === 'rules' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule Name</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Trigger</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {automationRules.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No active custom automation policy blueprints configured</td>
                      </tr>
                    ) : automationRules.map(rule => (
                      <tr key={rule.id} className="hover:bg-slate-50">
                        <td className="py-4 px-6">
                          <div className="text-sm font-bold text-slate-800">{rule.name}</div>
                          <div className="text-[10px] font-medium text-slate-400 mt-1">{rule.type}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded inline-block">
                            {rule.trigger}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-xs font-medium text-slate-700 flex items-center">
                            <ArrowRight className="w-3 h-3 mr-1 text-indigo-400" />
                            {rule.action}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] px-2 py-1 rounded-sm font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                            {rule.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* EXECUTION AUDIT TAB */}
            {activeTab === 'logs' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rule</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Event Details</th>
                      <th className="py-3 px-6 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {executionLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No active execution logs found in Firestore</td>
                      </tr>
                    ) : executionLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50 font-mono text-[11px]">
                        <td className="py-3 px-6 text-slate-500 whitespace-nowrap">{log.date}</td>
                        <td className="py-3 px-6 font-bold text-slate-700">{log.rule}</td>
                        <td className="py-3 px-6 text-slate-600 max-w-xs truncate">{log.event}</td>
                        <td className="py-3 px-6">
                          <span className={cn(
                             "px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px]",
                             log.status === 'SUCCESS' ? "bg-emerald-100 text-emerald-700" :
                             log.status === 'PENDING_APPROVAL' ? "bg-amber-100 text-amber-700" :
                             "bg-slate-100 text-slate-600"
                          )}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
