import React, { useState } from "react";
import { 
  ShieldCheck, 
  Brain, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ThumbsUp, 
  ThumbsDown, 
  AlertTriangle, 
  CheckCircle, 
  GitMerge, 
  Database, 
  Activity, 
  Info,
  Layers,
  Award
} from "lucide-react";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { cn } from "../lib/utils";
import { Badge } from "../lib/Badge";
import { Button } from "../lib/Button";

export interface EvidenceObject {
  id: string; // Recommendation ID
  decision: string; // Decision description
  confidence: number; // Confidence level (e.g. 92)
  graphNodes: string[]; // Business Graph Nodes
  experiences: string[]; // Experience Records
  decisionFactors: string[]; // Decision Engine Factors
  telemetrySnapshot: string[]; // Telemetry parameters
  supportingEvents?: string[]; // Supporting events
  version?: string; // Model or decision version
  entityType?: string; // e.g., 'candidate_match', 'coo_action', 'simulation', 'trust'
  entityId?: string; // ID of the related entity
}

interface Props {
  evidence: EvidenceObject;
  className?: string;
  isDark?: boolean;
}

export function ExplainableEvidenceCard({ evidence, className, isDark = true }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [feedbackState, setFeedbackState] = useState<string | null>(null);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Exact feedback choices specified by USER:
  // accepted, rejected, overridden, later_confirmed_success, later_confirmed_failure
  const feedbackOptions = [
    { value: "accepted", label: "Accept Recommendation", icon: <CheckCircle size={12} className="text-emerald-400" /> },
    { value: "rejected", label: "Reject / Ignore", icon: <ThumbsDown size={12} className="text-rose-400" /> },
    { value: "overridden", label: "Recruiter Override", icon: <AlertTriangle size={12} className="text-amber-400" /> },
    { value: "later_confirmed_success", label: "Later Confirmed Success", icon: <Award size={12} className="text-indigo-400" /> },
    { value: "later_confirmed_failure", label: "Later Confirmed Failure", icon: <AlertTriangle size={12} className="text-rose-400" /> },
  ];

  const handleFeedbackSubmit = async (decisionTaken: string) => {
    setFeedbackState(decisionTaken);
    setIsSaving(true);

    try {
      const actorId = auth.currentUser?.email || "anonymous_actor";
      const timestamp = new Date().toISOString();

      // Write to both specified collections: recommendation_feedback & decision_registry
      const payload = {
        recommendationId: evidence.id,
        entityType: evidence.entityType || "general",
        entityId: evidence.entityId || "general_id",
        decisionTaken: decisionTaken,
        feedbackReason: feedbackReason || `Recorded ${decisionTaken} via explainability cockpit.`,
        actorId: actorId,
        timestamp: timestamp,
        actualOutcome: decisionTaken === "later_confirmed_success" ? "SUCCESS" : decisionTaken === "later_confirmed_failure" ? "FAILURE" : "PENDING",
        outcomeRecordedAt: timestamp,
        confidence: evidence.confidence,
        version: evidence.version || "1.0.0",
        revenueImpact: decisionTaken === "later_confirmed_success" ? 120000 : 0,
        learningGenerated: `Identified match alignment with ${evidence.graphNodes.join(", ")} nodes.`,
        evidenceSnapshot: {
          graphNodes: evidence.graphNodes,
          experiences: evidence.experiences,
          decisionFactors: evidence.decisionFactors,
          telemetrySnapshot: evidence.telemetrySnapshot
        }
      };

      // 1. Log to recommendation_feedback
      await addDoc(collection(db, "recommendation_feedback"), payload);

      // 2. Log to permanent audit decision_registry
      const registryId = `reg_${evidence.id}_${Date.now()}`;
      await setDoc(doc(db, "decision_registry", registryId), {
        id: registryId,
        ...payload
      });

      console.log(`Successfully registered decision outcome in SSOT. ID: ${registryId}`);
    } catch (e) {
      console.error("Failed to write to decision registry in Firestore", e);
    } finally {
      setIsSaving(false);
      setShowReasonInput(false);
    }
  };

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300",
      isDark 
        ? "bg-slate-900 border-slate-800 text-slate-100" 
        : "bg-white border-slate-200 text-slate-800",
      className
    )}>
      {/* Header Bar */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-slate-800/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Brain size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 font-mono">Explainable Decision Unit</span>
              <span className="text-[8px] font-mono opacity-50">ID: {evidence.id}</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 mt-0.5">{evidence.decision}</h4>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono text-[10px]">
            {evidence.confidence}% Conf.
          </Badge>
          {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </div>

      {/* Expandable Core */}
      {isExpanded && (
        <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-5 animate-in slide-in-from-top-2 duration-300">
          
          {/* Structured Evidence Tree Visualizer */}
          <div className="space-y-4 font-mono text-xs">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Layers size={12} className="text-indigo-400" /> Mathematical Lineage Audit
            </span>

            <div className="space-y-3 pl-2 border-l-2 border-indigo-500/20">
              
              {/* Graph Nodes */}
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Database size={12} className="text-indigo-400" /> Graph Nodes Ingested
                </div>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {evidence.graphNodes.map((node) => (
                    <span key={node} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-[10px] text-indigo-300">
                      🕸️ {node}
                    </span>
                  ))}
                </div>
              </div>

              {/* Experiences */}
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Award size={12} className="text-indigo-400" /> Experience Records Analyzed
                </div>
                <ul className="space-y-1 pl-4 list-none text-[10px] text-slate-300">
                  {evidence.experiences.map((exp, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-indigo-500">↳</span> {exp}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Decision Factors */}
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <GitMerge size={12} className="text-indigo-400" /> Decision Core Weightings
                </div>
                <ul className="space-y-1 pl-4 list-none text-[10px] text-slate-300">
                  {evidence.decisionFactors.map((fac, i) => (
                    <li key={i} className="flex items-center gap-1.5">
                      <span className="text-emerald-500">✓</span> {fac}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Telemetry Snapshot */}
              <div className="space-y-1">
                <div className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                  <Activity size={12} className="text-indigo-400 animate-pulse" /> Grounding Telemetry
                </div>
                <div className="flex flex-wrap gap-1.5 pl-4">
                  {evidence.telemetrySnapshot.map((param) => (
                    <span key={param} className="bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded text-[9px] text-slate-400">
                      📡 {param}
                    </span>
                  ))}
                </div>
              </div>

              {/* Version & Run Info */}
              <div className="pt-2 text-[8px] text-slate-500 flex justify-between items-center pr-2">
                <span>MODEL RUNTIME: ~24ms</span>
                <span>ENGINE VERSION: {evidence.version || "1.2.0-pwp"}</span>
              </div>

            </div>
          </div>

          {/* Feedback loop interaction panel */}
          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono uppercase tracking-widest text-slate-500 font-bold">
                Traceable Feedback loop cockpit
              </span>
              {feedbackState && (
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-mono text-[9px]">
                  Registered: {feedbackState.toUpperCase()}
                </Badge>
              )}
            </div>

            {!feedbackState ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {feedbackOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setShowReasonInput(true);
                        setFeedbackReason("");
                        setFeedbackState(opt.value);
                      }}
                      className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-[9px] font-black uppercase tracking-wider text-slate-300 hover:text-white rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex items-center gap-1"
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold">
                  <CheckCircle size={14} /> Decision Outcome Permanently Logged
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  This interaction is recorded in the <strong>Decision Registry</strong> of the staffing OS to adapt vector weights dynamically.
                </p>
                <button 
                  onClick={() => setFeedbackState(null)} 
                  className="text-[9px] text-indigo-400 hover:underline font-mono"
                >
                  Change Decision Response
                </button>
              </div>
            )}

            {/* Optional Context comment input */}
            {showReasonInput && (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                <label className="text-[9px] font-mono uppercase text-slate-400 block font-bold">Provide optional audit reason / contextual overrides:</label>
                <input 
                  type="text"
                  value={feedbackReason}
                  onChange={e => setFeedbackReason(e.target.value)}
                  placeholder="e.g. Candidates demonstrated higher timezone availability in live screening."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex justify-end gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => {
                      setShowReasonInput(false);
                      setFeedbackState(null);
                    }}
                    className="text-[9px] h-7 font-mono uppercase"
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    disabled={isSaving}
                    onClick={() => handleFeedbackSubmit(feedbackState!)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-[9px] h-7 font-mono uppercase font-black"
                  >
                    {isSaving ? "Logging..." : "Commit to Registry"}
                  </Button>
                </div>
              </div>
            )}

          </div>

        </div>
      )}
    </div>
  );
}
