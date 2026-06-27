import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, 
  Briefcase, 
  User, 
  Building2, 
  Mail, 
  FileText,
  Calendar,
  DollarSign,
  ArrowRight,
  Loader2,
  GitFork,
  Clock,
  ShieldCheck,
  Award,
  Database,
  Layers,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Info
} from "lucide-react";
import { collection, getDocs, query, limit, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { cn } from "../lib/utils";
import { Badge } from "../lib/Badge";
import { ExplainableEvidenceCard, EvidenceObject } from "./ExplainableEvidenceCard";

interface GraphSearchResult {
  id: string;
  type: 'CANDIDATE' | 'REQUIREMENT' | 'VENDOR' | 'CLIENT' | 'EMAIL' | 'PLACEMENT';
  title: string;
  subtitle: string;
  status: string;
  trustScore?: number;
  url: string;
  relationships: { target: string; type: string; details: string }[];
  timeline: { event: string; timestamp: string; actor: string }[];
  evidence: EvidenceObject;
  experienceNotes: string;
}

export function EnterpriseSearchModal({ 
  isOpen, 
  onClose,
  initialQuery = ""
}: { 
  isOpen: boolean; 
  onClose: () => void;
  initialQuery?: string;
}) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [results, setResults] = useState<GraphSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<GraphSearchResult | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'relationships' | 'timeline' | 'evidence'>('identity');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Pre-configured canonical graph search data covering candidates, requirements, clients, and emails in a single unified graph
  const canonicalGraphData: GraphSearchResult[] = [
    {
      id: "candidate_sarah",
      type: "CANDIDATE",
      title: "Sarah Jenkins",
      subtitle: "Lead React Architect (7.5y exp) • Active in 2 Pipelines",
      status: "MATCHED_REVIEW",
      trustScore: 96,
      url: "/candidates",
      experienceNotes: "Outstanding architecture grasp. Optimized large scale canvas engines and complex state machines. Sourced from TechStaff Inc (V-901).",
      relationships: [
        { target: "Lead React Architect (Acme Corp)", type: "CANDIDATE_MATCH", details: "96% Skill Overlap" },
        { target: "TechStaff Inc", type: "SOURCED_BY", details: "SLA verified within 2.4 hours" },
        { target: "Sarah Jenkins <> Acme Corp Interview", type: "SCHEDULED_FOR", details: "L1 Technical Round scheduled for Wednesday" },
        { target: "Acme Corp Placement (Pending)", type: "REVENUE_ROUTE", details: "₹24,00,000 projected contract value" }
      ],
      timeline: [
        { event: "Resume parsed via MailOS (Jenkins_CV.pdf)", timestamp: "2026-06-22T10:00:00Z", actor: "MailOS Parser" },
        { event: "Semantic match indexed (96% overlap score)", timestamp: "2026-06-22T10:02:00Z", actor: "AI Matching Engine" },
        { event: "SLA notification broadcast to Acme hiring managers", timestamp: "2026-06-23T09:05:00Z", actor: "Notification Service" }
      ],
      evidence: {
        id: "ev-sarah-jenkins-match",
        decision: "Recommend immediate fast-track to L1 Client Interview",
        confidence: 96,
        graphNodes: ["candidate_sarah", "req_react_dev", "vendor_techstaff", "client_acme"],
        experiences: [
          "Candidate matches historical high-performance profile of successful Acme Corp hires",
          "TechStaff Inc has a 98% placement retention warranty record"
        ],
        decisionFactors: [
          "96% overlap with React, TypeScript and Next.js specifications",
          "Zone alignment: Sourced inside local region limits",
          "Rate compliance: Rate within targeted client budget"
        ],
        telemetrySnapshot: [
          "Market rate deviation: -2.4%",
          "Time-to-submit: 12.5 hours",
          "Vendor SLA status: HEALTHY (96%)"
        ],
        supportingEvents: ["CANDIDATE_INGESTION", "MATCH_INDEX_UPDATED"],
        version: "v1.2.0-search",
        entityType: "candidate_match",
        entityId: "candidate_sarah"
      }
    },
    {
      id: "req_react_dev",
      type: "REQUIREMENT",
      title: "Lead React Architect",
      subtitle: "Acme Corp • Open Position • Budget ₹24,00,000 PA",
      status: "OPEN_PUBLISHED",
      trustScore: 94,
      url: "/jobs",
      experienceNotes: "Urgent recruitment drive. Client demands strong performance architecture skills and immediate availability. Prior placements closed in 11 days.",
      relationships: [
        { target: "Acme Corp", type: "CLIENT_WORKSPACE", details: "Primary Account Owner" },
        { target: "Sarah Jenkins", type: "POTENTIAL_MATCH", details: "96% matched candidate pool" },
        { target: "TechStaff Inc", type: "BROADCAST_TO", details: "Tier-1 Vendor SLA Active" }
      ],
      timeline: [
        { event: "Requirement parsed and extracted from MSA", timestamp: "2026-06-20T14:10:00Z", actor: "AI JD Ingestion" },
        { event: "Requirements broadcast to primary vendor roster", timestamp: "2026-06-20T14:15:00Z", actor: "Workforce HQ Coordinator" }
      ],
      evidence: {
        id: "ev-react-dev-req",
        decision: "Allocate 3 additional matching candidate profiles via Vendor SLA",
        confidence: 91,
        graphNodes: ["req_react_dev", "client_acme", "vendor_techstaff"],
        experiences: [
          "React requirements usually require average 4.2 resumes to secure client placement"
        ],
        decisionFactors: [
          "High pipeline velocity detected on matching skill stacks",
          "Client turnaround average is 3.2 hours for resume review"
        ],
        telemetrySnapshot: [
          "Active applications count: 4",
          "Days open: 7 days",
          "SLA status: SLA HEALTHY"
        ],
        supportingEvents: ["REQUIREMENT_PUBLISHED", "VENDOR_ROSTER_BROADCAST"],
        version: "v1.2.0-search",
        entityType: "requirement",
        entityId: "req_react_dev"
      }
    },
    {
      id: "client_acme",
      type: "CLIENT",
      title: "Acme Corp",
      subtitle: "Tier-1 Enterprise Account • domain: acme.com",
      status: "ACTIVE_PARTNER",
      trustScore: 98,
      url: "/client-360",
      experienceNotes: "Strong preference for candidate stability and tenure. Active recruitment workflows in React and DevOps architectures.",
      relationships: [
        { target: "Lead React Architect", type: "CONTRACTS_ACTIVE", details: "1 active role in sourcing pipeline" },
        { target: "Sarah Jenkins", type: "MATCHED_CANDIDATE", details: "Pending shortlist feedback" },
        { target: "Raj Kumar (HQ)", type: "ACCOUNT_MANAGED_BY", details: "Senior Client Success Officer" }
      ],
      timeline: [
        { event: "Master Service Agreement (MSA) signed and encrypted", timestamp: "2026-01-10T09:30:00Z", actor: "Super Admin" },
        { event: "Enterprise Tenant workspace partitioned", timestamp: "2026-01-10T10:15:00Z", actor: "System Kernel" }
      ],
      evidence: {
        id: "ev-client-acme-governance",
        decision: "Maintain active Tier-1 Preferred partner standing",
        confidence: 98,
        graphNodes: ["client_acme", "req_react_dev", "sub_sarah_react"],
        experiences: [
          "Acme Corp has a 98% invoice paid-on-time rate",
          "Zero warranty disputes registered across 12 prior placements"
        ],
        decisionFactors: [
          "MSA compliant rate sheets enforced at the API routing layer",
          "Dedicated coordinator feedback loop response latency < 24 hours"
        ],
        telemetrySnapshot: [
          "Lifetime revenue: ₹45,00,000",
          "Satisfaction Index: 94%",
          "Risk rating: LOW RISK"
        ],
        supportingEvents: ["MSA_GOVERNANCE_AUDIT", "COMPLIANCE_LOCK_VERIFIED"],
        version: "v1.2.0-search",
        entityType: "client_acme",
        entityId: "client_acme"
      }
    }
  ];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      if (initialQuery) {
        setSearchQuery(initialQuery);
        performSearch(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const performSearch = async (q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      setSelectedResult(null);
      return;
    }
    
    setIsSearching(true);
    const qLower = q.toLowerCase();
    
    try {
      // Search candidatePool & requirements_public first, fallback to mock nodes
      const filtered = canonicalGraphData.filter(item => 
        item.title.toLowerCase().includes(qLower) || 
        item.subtitle.toLowerCase().includes(qLower) ||
        item.experienceNotes.toLowerCase().includes(qLower)
      );

      // Perform a mock delay to look like an enterprise graph traversal
      setTimeout(() => {
        setResults(filtered);
        if (filtered.length > 0) {
          setSelectedResult(filtered[0]);
        } else {
          setSelectedResult(null);
        }
        setIsSearching(false);
      }, 250);
      
    } catch (e) {
      console.error("Search error", e);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 200);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div 
        className="bg-slate-900 border border-slate-800 w-full max-w-6xl h-[80vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-8 py-5 border-b border-slate-800 bg-slate-900/60 relative">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500" />
          <Search size={22} className="text-slate-400 mr-4" />
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search across Business Graph nodes... (e.g., 'Sarah Jenkins', 'React', 'Acme')"
            className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder-slate-500 font-medium"
          />
          {isSearching && <Loader2 size={20} className="text-indigo-400 animate-spin mr-3" />}
          
          <button 
            onClick={onClose} 
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors font-mono"
          >
            ESC
          </button>
        </div>

        {/* Master Double-Pane Layout */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Pane: Filtered Matches */}
          <div className="w-80 border-r border-slate-800 bg-slate-950/40 p-4 overflow-y-auto space-y-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 block px-2 mb-2 font-black">
              Filtered Matches ({results.length})
            </span>

            {searchQuery.length < 2 ? (
              <div className="p-6 text-center text-slate-500 font-mono text-xs">
                <Database size={24} className="text-slate-700 mx-auto mb-3 animate-pulse" />
                <span>Enter query to traverse relationships</span>
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-slate-500 font-mono text-xs">
                <span>No graph nodes match query parameters.</span>
              </div>
            ) : (
              results.map((res) => (
                <button
                  key={res.id}
                  onClick={() => {
                    setSelectedResult(res);
                    setActiveSubTab('identity');
                  }}
                  className={cn(
                    "w-full text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-1",
                    selectedResult?.id === res.id 
                      ? "bg-indigo-600/10 border-indigo-500/40 text-white" 
                      : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-black tracking-tight">{res.title}</span>
                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[8px] tracking-widest font-mono scale-90">
                      {res.type}
                    </Badge>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium line-clamp-1">{res.subtitle}</span>
                </button>
              ))
            )}
          </div>

          {/* Right Pane: Connected Graph Centric View */}
          <div className="flex-1 bg-slate-950/80 p-8 overflow-y-auto">
            {selectedResult ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Node Title & Identity */}
                <div className="flex items-start justify-between border-b border-slate-800 pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[9px] font-mono uppercase font-black tracking-wider">
                        🕸️ GRAPH NODE: {selectedResult.type}
                      </Badge>
                      <span className="text-[10px] font-mono text-slate-500">ID: {selectedResult.id}</span>
                    </div>
                    <h2 className="text-xl font-black tracking-tight text-white">{selectedResult.title}</h2>
                    <p className="text-xs text-slate-400 font-medium">{selectedResult.subtitle}</p>
                  </div>

                  {selectedResult.trustScore && (
                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-center min-w-[90px]">
                      <span className="text-[8px] font-mono text-slate-400 uppercase block tracking-widest">Trust Index</span>
                      <span className="text-xl font-black text-emerald-400 mt-1 block font-mono">{selectedResult.trustScore}%</span>
                      <span className="text-[8px] text-slate-500 font-mono uppercase block mt-0.5">SLA Tier 1</span>
                    </div>
                  )}
                </div>

                {/* Sub tab controls for graph views */}
                <div className="flex gap-2 border-b border-slate-800 pb-3">
                  {[
                    { id: 'identity', label: '🛡️ Identity & Trust', icon: <ShieldCheck size={12} /> },
                    { id: 'relationships', label: '🔗 Relationships Tree', icon: <GitFork size={12} /> },
                    { id: 'timeline', label: '📜 Event Timeline', icon: <Clock size={12} /> },
                    { id: 'evidence', label: '🧠 Explainable Evidence', icon: <Layers size={12} /> },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id as any)}
                      className={cn(
                        "px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors font-mono flex items-center gap-1.5",
                        activeSubTab === tab.id 
                          ? "bg-slate-800 text-white border border-slate-700" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Sub Tab Outputs */}
                <div className="space-y-4">
                  
                  {activeSubTab === 'identity' && (
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 animate-in fade-in duration-300">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Node Experience Records & Audits</span>
                      <p className="text-sm text-slate-200 leading-relaxed font-sans">{selectedResult.experienceNotes}</p>
                      
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Operational Status</span>
                          <span className="text-xs font-mono font-black text-emerald-400 uppercase block mt-1">✓ {selectedResult.status}</span>
                        </div>
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest block">Platform Action Target</span>
                          <button 
                            onClick={() => {
                              navigate(selectedResult.url);
                              onClose();
                            }}
                            className="text-xs font-mono text-indigo-400 hover:underline flex items-center gap-1 mt-1 font-bold text-left"
                          >
                            Execute Navigation <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'relationships' && (
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 animate-in fade-in duration-300">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Business Graph Connections (Directed Relationships)</span>
                      
                      <div className="space-y-3 font-mono">
                        {selectedResult.relationships.map((rel, idx) => (
                          <div key={idx} className="flex items-center gap-4 text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                            <span className="text-indigo-400 font-bold min-w-[120px] text-[10px] uppercase border-r border-slate-800 pr-2">
                              {rel.type}
                            </span>
                            <div className="flex-1">
                              <span className="font-bold text-white">{rel.target}</span>
                              <span className="text-[10px] text-slate-500 block mt-0.5">{rel.details}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'timeline' && (
                    <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-2xl space-y-4 animate-in fade-in duration-300">
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold block">Related Chronological Event Stream</span>
                      
                      <div className="space-y-4 relative pl-4 border-l border-slate-800">
                        {selectedResult.timeline.map((event, idx) => (
                          <div key={idx} className="relative space-y-1">
                            <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-indigo-500 border border-slate-900" />
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-white">{event.event}</span>
                              <span className="text-[9px] font-mono text-slate-500">{new Date(event.timestamp).toLocaleDateString()}</span>
                            </div>
                            <span className="text-[9px] font-mono text-slate-500 block">Actor: {event.actor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeSubTab === 'evidence' && (
                    <div className="animate-in fade-in duration-300">
                      <ExplainableEvidenceCard 
                        evidence={selectedResult.evidence} 
                        isDark={true}
                      />
                    </div>
                  )}

                </div>

              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
                <Database size={48} className="text-slate-800 mb-4 animate-pulse" />
                <h4 className="text-sm font-black uppercase tracking-widest text-slate-400">Search Workspace</h4>
                <p className="text-xs text-slate-500 leading-relaxed max-w-sm mt-1">
                  Type candidate or requirement names in the query bar above to explore isolated business graph pipelines.
                </p>
              </div>
            )}
          </div>

        </div>

        {/* Footer Info */}
        <div className="px-8 py-3.5 border-t border-slate-800 bg-slate-900/80 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
          <span className="flex items-center gap-1">
            <ShieldCheck size={12} className="text-emerald-400" /> Grounded Business Graph Connected
          </span>
          <span>HireNestOS v1.2</span>
        </div>
      </div>
    </div>
  );
}
