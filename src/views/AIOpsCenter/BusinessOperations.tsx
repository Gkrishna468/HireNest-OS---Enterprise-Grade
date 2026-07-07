// src/views/AIOpsCenter/BusinessOperations.tsx
import React from "react";
import { 
  Eye, 
  ChevronRight, 
  Clock, 
  ShieldAlert, 
  Info,
  Sliders,
  UserCheck
} from "lucide-react";
import { cn } from "../../lib/utils";
import { RequirementOwnership } from "./AIOpsTypes";

interface BusinessOperationsProps {
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  selectedReq: RequirementOwnership | null;
  setSelectedReq: (req: RequirementOwnership | null) => void;
  fallbackRequirements: RequirementOwnership[];
}

export default function BusinessOperations({
  activeSubTab,
  selectedReq,
  setSelectedReq,
  fallbackRequirements
}: BusinessOperationsProps) {
  
  // Clean presentation-based static detail map for each requirement
  const reqDetailsMap: Record<string, { techStack: string[]; compensation: string; priority: "HIGH" | "MEDIUM" | "CRITICAL"; timezone: string }> = {
    "req-091": {
      techStack: ["Kubernetes", "Golang", "Docker", "AWS"],
      compensation: "$150k - $175k Base",
      priority: "CRITICAL",
      timezone: "EST (New York)"
    },
    "req-092": {
      techStack: ["TypeScript", "Next.js", "TailwindCSS", "Node.js"],
      compensation: "$130k - $150k Base",
      priority: "HIGH",
      timezone: "PST (San Francisco)"
    },
    "req-093": {
      techStack: ["Python", "PyTorch", "FastAPI", "PostgreSQL"],
      compensation: "$180k - $210k Base",
      priority: "CRITICAL",
      timezone: "EST (Boston)"
    },
    "req-094": {
      techStack: ["Java", "Spring Boot", "Microservices", "GCP"],
      compensation: "$140k - $165k Base",
      priority: "MEDIUM",
      timezone: "CST (Chicago)"
    }
  };

  const currentDetails = selectedReq ? (reqDetailsMap[selectedReq.id] || {
    techStack: ["General Engineering"],
    compensation: "Market Rate",
    priority: "MEDIUM",
    timezone: "Global"
  }) : null;

  return (
    <div className="flex flex-col flex-1 gap-6">
      
      {/* Requirement Observatory tab */}
      {activeSubTab === 'observatory' && (
        <div className="space-y-6 flex-1 flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-900 pb-4">
            <div>
              <h2 className="text-lg font-black text-white">Requirement Observatory</h2>
              <p className="text-xs text-slate-400">Complete presentation registry tracking ownership, strategic SLA health, and recruiter alignments.</p>
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

            {/* Requirement Detail observatory drawer */}
            <div className="w-full xl:w-[450px] bg-[#070A13] border border-slate-900 rounded-2xl p-5 flex flex-col justify-between min-h-[500px]">
              {selectedReq && currentDetails ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  {/* Observatory header */}
                  <div className="border-b border-slate-900 pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Observatory Registry Detail</span>
                        <h4 className="text-sm font-black text-white">{selectedReq.title}</h4>
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

                  {/* Operational Alignment Profile */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Operational Profile</span>
                    <div className="bg-[#0b101d] border border-slate-900/80 p-4 rounded-xl space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <UserCheck size={13} className="text-indigo-400" /> Primary BDM
                        </span>
                        <span className="font-bold text-white">{selectedReq.bdm}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <UserCheck size={13} className="text-indigo-400" /> Lead Recruiter
                        </span>
                        <span className="font-bold text-white">{selectedReq.recruiter}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Clock size={13} className="text-indigo-400" /> Target Timezone
                        </span>
                        <span className="font-bold text-slate-300">{currentDetails.timezone}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <Sliders size={13} className="text-indigo-400" /> Compensation Band
                        </span>
                        <span className="font-bold text-emerald-400">{currentDetails.compensation}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 flex items-center gap-1.5">
                          <ShieldAlert size={13} className="text-indigo-400" /> SLA Priority
                        </span>
                        <span className={cn("font-bold text-xs", 
                          currentDetails.priority === 'CRITICAL' ? "text-rose-400" : "text-amber-400"
                        )}>{currentDetails.priority}</span>
                      </div>
                    </div>
                  </div>

                  {/* Required Technologies Scope */}
                  <div className="space-y-3">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Technology Stack Scope</span>
                    <div className="flex flex-wrap gap-2">
                      {currentDetails.techStack.map((tech) => (
                        <span 
                          key={tech} 
                          className="text-[10px] font-mono px-2.5 py-1 bg-slate-900 border border-slate-800 text-slate-300 rounded-lg font-medium"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Informational Guidance */}
                  <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl flex items-start gap-2.5">
                    <Info size={14} className="text-indigo-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      SLA states and events for this requirement are managed continuously by the global <span className="text-indigo-300 font-semibold">Workflow Orchestrator</span> platform domain service. Match scorecards and recruiter overrides are handled in the <span className="text-indigo-300 font-semibold">Decision Intelligence</span> service layer.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-6 text-slate-500 space-y-2">
                  <Eye size={36} className="text-slate-600" />
                  <p className="text-xs font-bold uppercase tracking-wider">Select Requirement to Observe</p>
                  <p className="text-[10px] text-slate-500 max-w-[200px]">Audits direct responsibility mappings, pipeline statuses, technical stack scope, and SLA priority tiers.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
