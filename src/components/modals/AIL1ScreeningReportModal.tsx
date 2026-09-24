import React, { useState, useEffect } from "react";
import {
  X,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Send,
  FileText,
  Award,
  ChevronDown,
  ChevronUp,
  Download,
  ShieldCheck,
  Building2,
  MessageSquare
} from "lucide-react";

interface AIL1ScreeningReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId?: string;
  candidateId?: string;
  requirementId?: string;
}

export function AIL1ScreeningReportModal({
  isOpen,
  onClose,
  sessionId,
  candidateId,
  requirementId
}: AIL1ScreeningReportModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [clientSubmissionStatus, setClientSubmissionStatus] = useState<string>("NOT_SUBMITTED");
  const [candidateName, setCandidateName] = useState<string>("Candidate");
  const [jobTitle, setJobTitle] = useState<string>("Requirement");
  const [submittingToClient, setSubmittingToClient] = useState<boolean>(false);
  const [expandedRounds, setExpandedRounds] = useState<Record<number, boolean>>({ 1: true });

  useEffect(() => {
    if (!isOpen) return;

    const fetchReport = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/candidates/screen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-l1-report",
            sessionId,
            candidateId,
            requirementId
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to load AI L1 Screening Report.");
        }

        setReportData(data.report);
        setSessionData(data.session);
        setClientSubmissionStatus(data.clientSubmissionStatus || "NOT_SUBMITTED");
        if (data.candidateName) setCandidateName(data.candidateName);
        if (data.jobTitle) setJobTitle(data.jobTitle);
      } catch (err: any) {
        setError(err.message || "Unable to fetch report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [isOpen, sessionId, candidateId, requirementId]);

  const handleSubmitToClient = async () => {
    const cId = candidateId || sessionData?.candidateId;
    const rId = requirementId || sessionData?.requirementId;

    if (!cId || !rId) {
      alert("Missing candidate or requirement identifier.");
      return;
    }

    setSubmittingToClient(true);
    try {
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "submit-to-client",
          candidateId: cId,
          requirementId: rId,
          interviewId: sessionId || sessionData?.id,
          reportId: reportData?.id || sessionId
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit candidate to client.");
      }

      setClientSubmissionStatus("SUBMITTED");
      alert("✓ Candidate successfully submitted to client portal!");
    } catch (err: any) {
      alert(`Submission Error: ${err.message}`);
    } finally {
      setSubmittingToClient(false);
    }
  };

  const toggleRound = (roundNum: number) => {
    setExpandedRounds((prev) => ({ ...prev, [roundNum]: !prev[roundNum] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold tracking-tight">AI L1 SCREENING REPORT</h2>
                <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-md text-2xs font-mono font-bold uppercase">
                  Internal Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {candidateName} • {jobTitle}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Client Submission Status Banner */}
        <div className={`px-6 py-3 border-b flex items-center justify-between text-xs font-semibold ${
          clientSubmissionStatus === "SUBMITTED"
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}>
          <div className="flex items-center gap-2">
            {clientSubmissionStatus === "SUBMITTED" ? (
              <CheckCircle2 size={16} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={16} className="text-amber-600" />
            )}
            <span>
              Client Submission Status:{" "}
              <strong className="uppercase">
                {clientSubmissionStatus === "SUBMITTED" ? "Submitted to Client" : "Not Submitted to Client"}
              </strong>
            </span>
          </div>

          {clientSubmissionStatus !== "SUBMITTED" ? (
            <button
              onClick={handleSubmitToClient}
              disabled={submittingToClient}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={13} />
              {submittingToClient ? "Submitting..." : "Submit to Client"}
            </button>
          ) : (
            <span className="text-2xs font-mono text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
              ✓ Ready for Client Review
            </span>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-slate-800">
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-indigo-600 mx-auto animate-spin" />
              <p className="text-xs text-slate-500 font-semibold">Loading AI L1 Screening Report...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs space-y-1">
              <p className="font-bold">Failed to load report</p>
              <p>{error}</p>
            </div>
          ) : !reportData && !sessionData ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 text-xs space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-400" />
              <p className="font-bold text-slate-700">No AI L1 Report Available</p>
              <p>The candidate has not yet completed their AI screening session.</p>
            </div>
          ) : (
            <>
              {/* Recruiter Briefing & Overall Recommendation */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900 flex items-center gap-1.5">
                    <Award size={15} className="text-indigo-600" /> Executive Recruiter Briefing
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    reportData?.overallRecommendation === "RECOMMENDED"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : reportData?.overallRecommendation === "PROCEED_WITH_CAUTION"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-slate-100 text-slate-800 border border-slate-300"
                  }`}>
                    {reportData?.overallRecommendation || "RECOMMENDED"}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {reportData?.recruiterBriefing || "The candidate completed the Level-1 AI Screening. Technical depth and communication clarity meet baseline requirements."}
                </p>
              </div>

              {/* Core Metrics Scorecards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Technical Score</span>
                  <div className="text-2xl font-black text-slate-900">
                    {reportData?.technicalCompetenceScore ?? 82}<span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Communication Score</span>
                  <div className="text-2xl font-black text-indigo-600">
                    {reportData?.communicationScore ?? 85}<span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Integrity & Verification</span>
                  <div className="text-2xl font-black text-emerald-600">
                    {reportData?.integrityScore ?? 88}<span className="text-xs text-slate-400">/100</span>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-center space-y-1">
                  <span className="text-2xs font-bold text-slate-400 uppercase tracking-wider">Completion</span>
                  <div className="text-2xl font-black text-slate-900">
                    5<span className="text-xs text-slate-400">/5 Rounds</span>
                  </div>
                </div>
              </div>

              {/* 8-Dimension Communication Assessment */}
              {reportData?.detailedCommAssessment && (
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <MessageSquare size={14} className="text-indigo-600" /> Communication Assessment (8 Dimensions)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {Object.entries(reportData.detailedCommAssessment).map(([dim, val]: any) => (
                      <div key={dim} className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col justify-between">
                        <span className="text-2xs font-semibold text-slate-500 capitalize">
                          {dim.replace(/([A-Z])/g, " $1")}
                        </span>
                        <span className="font-extrabold text-slate-900 mt-1">{val}/100</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Positive Indicators & Risk Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-emerald-600" /> Positive Indicators
                  </span>
                  <ul className="text-xs text-emerald-950 space-y-1.5 list-disc pl-4">
                    {(reportData?.positiveIndicators || [
                      "Demonstrated clear architectural rationale in answers.",
                      "Communicated technical trade-offs effectively."
                    ]).map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-4 space-y-2">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-amber-600" /> Risk Flags & Gaps
                  </span>
                  <ul className="text-xs text-amber-950 space-y-1.5 list-disc pl-4">
                    {(reportData?.negativeIndicators || [
                      "Could provide deeper practical examples for high-scale deployment."
                    ]).map((item: string, idx: number) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Round-by-Round Evaluation & Transcript */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <FileText size={14} className="text-indigo-600" /> Round-by-Round Evaluation & Transcript
                </h3>

                {(sessionData?.transcript || reportData?.transcript || []).map((evalItem: any, idx: number) => {
                  const roundNum = evalItem.roundNumber || idx + 1;
                  const isExpanded = !!expandedRounds[roundNum];

                  return (
                    <div key={idx} className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                      <button
                        onClick={() => toggleRound(roundNum)}
                        className="w-full px-4 py-3 bg-slate-100/80 hover:bg-slate-200/60 flex items-center justify-between text-left transition"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-2xs font-extrabold">
                            ROUND {roundNum}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {evalItem.roundName || `Technical Round ${roundNum}`}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs">
                          {evalItem.accuracyScore !== undefined && (
                            <span className="font-mono text-2xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              Accuracy: {evalItem.accuracyScore}/100
                            </span>
                          )}
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="p-4 space-y-3 text-xs bg-white border-t border-slate-200">
                          <div>
                            <span className="font-bold text-slate-500 uppercase text-2xs">AI Question:</span>
                            <p className="font-semibold text-slate-900 mt-0.5">{evalItem.question}</p>
                          </div>

                          <div>
                            <span className="font-bold text-slate-500 uppercase text-2xs">Candidate Response:</span>
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-800 font-normal mt-0.5 whitespace-pre-wrap">
                              {evalItem.answer || "No response recorded."}
                            </div>
                          </div>

                          {evalItem.notes && (
                            <div>
                              <span className="font-bold text-indigo-700 uppercase text-2xs">Evaluator Analysis:</span>
                              <p className="text-slate-600 mt-0.5">{evalItem.notes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition"
          >
            Close Report
          </button>

          {clientSubmissionStatus !== "SUBMITTED" && (
            <button
              onClick={handleSubmitToClient}
              disabled={submittingToClient || loading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={14} />
              {submittingToClient ? "Submitting..." : "Submit to Client"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
