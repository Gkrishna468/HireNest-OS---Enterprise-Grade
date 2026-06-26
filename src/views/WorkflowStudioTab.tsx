import React, { useState, useEffect } from "react";
import { 
  Network,
  Plus,
  Play,
  Save,
  Trash2,
  Bot,
  Zap,
  ArrowRight,
  GitMerge,
  GitBranch,
  CheckCircle2
} from "lucide-react";
import { collection, getDocs, onSnapshot, query } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";
import { checkIsAdmin } from "../lib/permissions";

export default function WorkflowStudioTab({ userRole }: { userRole: string }) {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);

  // Mock data for initial view
  const demoWorkflows = [
    {
        id: 'wf-1',
        name: 'End-to-End Requirement Fulfillment',
        trigger: 'REQUIREMENT_CREATED',
        status: 'ACTIVE',
        steps: [
            { id: 's1', type: 'AGENT', agentId: 'matching-engine', name: 'AI Matches Candidates' },
            { id: 's2', type: 'AGENT', agentId: 'vendor-broadcast', name: 'Notify Vendors' },
            { id: 's3', type: 'APPROVAL', name: 'Human Reviews Submissions' },
            { id: 's4', type: 'AGENT', agentId: 'interview-scheduler', name: 'Schedule Interviews' }
        ]
    },
    {
        id: 'wf-2',
        name: 'Vendor Onboarding',
        trigger: 'VENDOR_REGISTERED',
        status: 'DRAFT',
        steps: [
            { id: 's1', type: 'AGENT', agentId: 'compliance-checker', name: 'Check Compliance' },
            { id: 's2', type: 'APPROVAL', name: 'Approval Required' },
            { id: 's3', type: 'AGENT', agentId: 'welcome-email', name: 'Send Welcome Packet' }
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

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                  <Network className="text-indigo-600" /> Workflow Studio
              </h2>
              <p className="text-xs text-slate-500 mt-1">Design & Automate Standard Operating Procedures</p>
          </div>
          <div className="p-4 border-b border-slate-200">
              <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                  <Plus size={16} /> New Workflow
              </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {demoWorkflows.map(wf => (
                  <button 
                    key={wf.id}
                    onClick={() => setSelectedWorkflow(wf)}
                    className={cn(
                        "w-full text-left p-4 rounded-xl border transition-all duration-200",
                        selectedWorkflow?.id === wf.id 
                            ? "bg-indigo-50 border-indigo-200 shadow-sm" 
                            : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                    )}
                  >
                      <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-slate-800 text-sm leading-tight">{wf.name}</h4>
                          <span className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border",
                              wf.status === 'ACTIVE' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200"
                          )}>
                              {wf.status}
                          </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-1 rounded">
                          <Zap size={10} className="text-amber-500" /> On: {wf.trigger}
                      </div>
                  </button>
              ))}
          </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col bg-slate-50/50 relative">
          {selectedWorkflow ? (
              <>
                  <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shadow-sm z-10 relative">
                      <div>
                          <h3 className="text-xl font-black text-slate-800">{selectedWorkflow.name}</h3>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                              <Zap size={14} className="text-amber-500" /> Trigger: <span className="font-bold text-slate-700">{selectedWorkflow.trigger}</span>
                          </div>
                      </div>
                      <div className="flex gap-2">
                          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-slate-50">
                              <Play size={16} /> Test
                          </button>
                          <button className="px-4 py-2 bg-indigo-600 border border-transparent text-white rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-indigo-700">
                              <Save size={16} /> Save Workflow
                          </button>
                      </div>
                  </div>

                  {/* Nodes Canvas */}
                  <div className="flex-1 overflow-auto p-12 relative" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                      
                      <div className="max-w-2xl mx-auto">
                          {/* Trigger Node */}
                          <div className="bg-white border-2 border-slate-800 rounded-xl p-5 shadow-sm mb-8 w-80 relative left-1/2 -translate-x-1/2 z-10">
                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1">
                                  <Zap size={12} className="text-amber-500" /> Event Trigger
                              </div>
                              <div className="font-bold text-slate-800 text-sm">
                                  {selectedWorkflow.trigger}
                              </div>
                          </div>

                          {selectedWorkflow.steps.map((step: any, idx: number) => (
                              <React.Fragment key={step.id}>
                                  {/* Connecting Line */}
                                  <div className="w-0.5 h-12 bg-indigo-200 mx-auto -my-1 relative z-0">
                                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-400"></div>
                                  </div>

                                  {/* Step Node */}
                                  <div className={cn(
                                      "bg-white border-2 rounded-xl p-5 shadow-sm mb-8 w-80 relative left-1/2 -translate-x-1/2 z-10 transition-transform hover:-translate-y-1 hover:shadow-md cursor-pointer",
                                      step.type === 'APPROVAL' ? "border-amber-400" : "border-indigo-400"
                                  )}>
                                      <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm">
                                          {idx + 1}
                                      </div>
                                      
                                      <div className={cn(
                                          "text-[10px] font-bold uppercase tracking-widest mb-2 flex items-center gap-1",
                                          step.type === 'APPROVAL' ? "text-amber-600" : "text-indigo-600"
                                      )}>
                                          {step.type === 'AGENT' ? <Bot size={12} /> : <CheckCircle2 size={12} />}
                                          {step.type}
                                      </div>
                                      
                                      <div className="font-bold text-slate-800 text-sm mb-1">
                                          {step.name}
                                      </div>
                                      
                                      {step.agentId && (
                                          <div className="text-xs text-slate-500 font-mono">
                                              {step.agentId}
                                          </div>
                                      )}
                                      
                                      {/* Node Actions */}
                                      <div className="absolute right-3 top-3 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                                          <button className="text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                                      </div>
                                  </div>
                              </React.Fragment>
                          ))}
                          
                          {/* Add Step Button */}
                          <div className="w-0.5 h-12 bg-slate-200 mx-auto -my-1 relative z-0"></div>
                          <button className="bg-white border border-dashed border-slate-300 rounded-xl p-4 w-80 relative left-1/2 -translate-x-1/2 z-10 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-slate-500 font-bold text-sm shadow-sm group">
                              <Plus size={16} className="group-hover:scale-110 transition-transform" /> Add Step
                          </button>

                      </div>

                  </div>
              </>
          ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                  <Network size={48} className="mb-4 text-slate-300" />
                  <p className="font-bold text-slate-500">Select a workflow to edit</p>
                  <p className="text-sm mt-1">Or create a new one to automate an SOP.</p>
              </div>
          )}
      </div>
    </div>
  );
}
