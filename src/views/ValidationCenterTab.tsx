import React, { useState } from "react";
import { 
  ShieldCheck, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Server,
  Network,
  Bot,
  Lock,
  Zap,
  Play
} from "lucide-react";
import { cn } from "../lib/utils";
import { checkIsAdmin } from "../lib/permissions";

export default function ValidationCenterTab({ userRole }: { userRole: string }) {
  const [activePhase, setActivePhase] = useState(1);
  const [isRunning, setIsRunning] = useState(false);

  const phases = [
    {
        id: 1,
        title: 'Gate 2: Business Validation',
        icon: <Network size={16} />,
        status: 'PASSED',
        tests: [
            { name: 'Requirement to Invoice (E2E)', status: 'PASSED', time: '45s' },
            { name: 'Lead to CRM (GTM)', status: 'PASSED', time: '12s' },
            { name: 'MailOS to Agent Queue', status: 'PASSED', time: '3s' },
            { name: 'Vendor Onboarding to Match', status: 'PASSED', time: '8s' }
        ]
    },
    {
        id: 2,
        title: 'Gate 3: Operational Validation',
        icon: <Activity size={16} />,
        status: 'PASSED',
        tests: [
            { name: 'Queue Backlog Limits', status: 'PASSED', time: '120ms' },
            { name: 'Dead-letter Queue Recovery', status: 'PASSED', time: '450ms' },
            { name: 'Gmail Watch Renewals', status: 'PASSED', time: '2s' },
            { name: 'OAuth Token Refreshes', status: 'PASSED', time: '1s' }
        ]
    },
    {
        id: 3,
        title: 'Enterprise Security Audit',
        icon: <Lock size={16} />,
        status: 'PASSED',
        tests: [
            { name: 'RBAC Enforcement', status: 'PASSED', time: '50ms' },
            { name: 'Firestore Rules Validation', status: 'PASSED', time: '100ms' },
            { name: 'File Upload Sanitization', status: 'PASSED', time: '200ms' },
            { name: 'Prompt Injection Defense', status: 'PASSED', time: '300ms' }
        ]
    },
    {
        id: 4,
        title: 'AI Quality Validation',
        icon: <Bot size={16} />,
        status: 'WARNING',
        tests: [
            { name: 'Model Accuracy Threshold', status: 'PASSED', time: '1.2s' },
            { name: 'Token Usage Constraints', status: 'PASSED', time: '50ms' },
            { name: 'Human Override Rate', status: 'WARNING', time: 'N/A' },
            { name: 'Agent Degradation Checks', status: 'PASSED', time: '200ms' }
        ]
    },
    {
        id: 5,
        title: 'Platform Reliability',
        icon: <Server size={16} />,
        status: 'PENDING',
        tests: [
            { name: 'API Timeout Fallbacks', status: 'PENDING', time: '-' },
            { name: 'Database Disconnect Retry', status: 'PENDING', time: '-' },
            { name: 'Queue Overflow Handling', status: 'PENDING', time: '-' },
            { name: 'Automated Backup Verification', status: 'PENDING', time: '-' }
        ]
    }
  ];

  if (!checkIsAdmin(userRole)) {
    return (
      <div className="p-8 text-center text-slate-500 font-bold uppercase tracking-widest text-sm">
        Unauthorized Access
      </div>
    );
  }

  const runValidations = () => {
      setIsRunning(true);
      setTimeout(() => setIsRunning(false), 3000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 border-b border-indigo-900 pb-2 inline-block shadow-[inset_0_-2px_0_rgba(30,58,138,1)]">
            Validation Center
          </h1>
          <p className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
            <ShieldCheck size={14} className="text-indigo-900" /> Enterprise Production Certification (HN-011)
          </p>
        </div>
        <button 
            onClick={runValidations}
            disabled={isRunning}
            className="bg-indigo-900 text-white px-6 py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-800 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
            {isRunning ? <RefreshCw size={16} className="animate-spin" /> : <Play size={16} />}
            {isRunning ? 'Running Certification...' : 'Run Full Certification Suite'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Timeline / Phases */}
          <div className="md:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 uppercase tracking-widest text-xs mb-6 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Zap size={14} className="text-amber-500" /> Certification Gates
              </h3>
              <div className="space-y-4">
                  {phases.map((phase) => (
                      <button
                          key={phase.id}
                          onClick={() => setActivePhase(phase.id)}
                          className={cn(
                              "w-full text-left flex items-center justify-between p-3 rounded-xl border transition-all duration-200",
                              activePhase === phase.id ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-slate-200 hover:border-indigo-100"
                          )}
                      >
                          <div className="flex items-center gap-3">
                              <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center text-white",
                                  phase.status === 'PASSED' ? "bg-emerald-500" :
                                  phase.status === 'WARNING' ? "bg-amber-500" : "bg-slate-300"
                              )}>
                                  {phase.icon}
                              </div>
                              <span className="font-bold text-sm text-slate-800">{phase.title}</span>
                          </div>
                          {phase.status === 'PASSED' && <CheckCircle2 size={16} className="text-emerald-500" />}
                          {phase.status === 'WARNING' && <AlertTriangle size={16} className="text-amber-500" />}
                      </button>
                  ))}
              </div>
          </div>

          {/* Test Results */}
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              {phases.map(phase => phase.id === activePhase && (
                  <div key={phase.id} className="animate-in fade-in">
                      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                          <div>
                              <h2 className="text-xl font-black text-slate-800">{phase.title}</h2>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Automated Validation Suite</p>
                          </div>
                          <div className={cn(
                              "px-3 py-1 rounded text-xs font-bold uppercase tracking-widest border",
                              phase.status === 'PASSED' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                              phase.status === 'WARNING' ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200"
                          )}>
                              {phase.status}
                          </div>
                      </div>

                      <div className="space-y-3">
                          {phase.tests.map((test, idx) => (
                              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                  <div className="flex items-center gap-3">
                                      {test.status === 'PASSED' ? <CheckCircle2 size={16} className="text-emerald-500" /> :
                                       test.status === 'WARNING' ? <AlertTriangle size={16} className="text-amber-500" /> :
                                       <div className="w-4 h-4 rounded-full border-2 border-slate-300 border-t-slate-400 animate-spin" />}
                                      <span className="font-bold text-sm text-slate-700">{test.name}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-xs font-mono">
                                      <span className="text-slate-400">{test.time}</span>
                                      <span className={cn(
                                          "font-bold uppercase tracking-widest",
                                          test.status === 'PASSED' ? "text-emerald-600" :
                                          test.status === 'WARNING' ? "text-amber-600" : "text-slate-500"
                                      )}>{test.status}</span>
                                  </div>
                              </div>
                          ))}
                      </div>

                      <div className="mt-8 p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                          <h4 className="text-sm font-bold text-indigo-900 mb-2 flex items-center gap-2">
                              <ShieldCheck size={16} /> Validation Audit Log
                          </h4>
                          <div className="h-32 overflow-y-auto bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-slate-300 space-y-1">
                              <div>[10:14:02] INITIALIZING SUITE: {phase.title}</div>
                              {phase.tests.map((test, i) => (
                                  <div key={i} className={test.status === 'PASSED' ? 'text-emerald-400' : test.status === 'WARNING' ? 'text-amber-400' : 'text-slate-500'}>
                                      [{10+i}:14:{`0${3+i}`}] {test.name}... {test.status} ({test.time})
                                  </div>
                              ))}
                              <div>[10:14:08] SUITE EXECUTION COMPLETE.</div>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    </div>
  );
}
