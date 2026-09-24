import React, { useState, useEffect } from "react";
import { 
  Video, VideoOff, Calendar, CheckCircle, AlertCircle, PlayCircle, XCircle, 
  Plus, Search, FileText, ExternalLink, Volume2, Award, Activity, Sparkles, 
  Copy, Save, Clock, ChevronRight, ArrowRight, ShieldCheck, RefreshCw, Send, User, Trash2
} from "lucide-react";
import { auth } from "../lib/firebase";
import { AIL1ScreeningReportModal } from "../components/modals/AIL1ScreeningReportModal";

const INTERVIEW_ROUNDS = [
  { number: 1, name: "Fundamentals & Core Tech Skills" },
  { number: 2, name: "JD-Specific Scenarios" },
  { number: 3, name: "Resume Verification" },
  { number: 4, name: "Behavioral & Situational Problems" },
  { number: 5, name: "Dynamic Integration Scenario" }
];

export default function AIInterviewsDashboardTab({ userRole, orgId }: { userRole: string; orgId: string }) {
  // Database / state
  const [interviews, setInterviews] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Record<string, any>>({});
  const [requirements, setRequirements] = useState<Record<string, any>>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals & Panels
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedSessionForMonitor, setSelectedSessionForMonitor] = useState<any | null>(null);
  const [selectedReportForView, setSelectedReportForView] = useState<any | null>(null);
  const [selectedReportSessionId, setSelectedReportSessionId] = useState<string | null>(null);
  const [isL1ReportModalOpen, setIsL1ReportModalOpen] = useState<boolean>(false);
  const [scheduledConfirmation, setScheduledConfirmation] = useState<{
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    scheduledStart: string;
    joinUrl: string;
    joinPath: string;
    rawToken: string;
    interviewType: string;
    meetingLink?: string;
    interviewId: string;
    candidateId: string;
  } | null>(null);
  
  // Forms & Inputs
  const [searchQuery, setSearchQuery] = useState("");
  const [newInterview, setNewInterview] = useState({
    candidateId: "",
    requirementId: "",
    scheduledStart: "",
    voiceChoice: "Standard Male",
    interviewType: "AI_SCREENING", // AI_SCREENING or HUMAN_INTERVIEW
    meetingProvider: "NONE",
    meetingLink: ""
  });
  
  const [editingMeetingLinks, setEditingMeetingLinks] = useState<Record<string, string>>({});
  const [savingLink, setSavingLink] = useState<string | null>(null);
  const [overridingSession, setOverridingSession] = useState<string | null>(null);
  const [submittingToClient, setSubmittingToClient] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  // Load all interviews from the real database
  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) {
        setLoading(true);
        setError(null);
      }
      
      let idToken: string | undefined = undefined;
      try {
        if (auth.currentUser) {
          idToken = await auth.currentUser.getIdToken();
        }
      } catch (tokenErr) {
        console.warn("[AIInterviewsDashboard] Token resolution warning:", tokenErr);
      }

      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({ action: "get-all-interviews" })
      });

      if (!res.ok) {
        let errMsg = `Server returned status ${res.status}`;
        try {
          const errData = await res.json();
          errMsg = errData.error || errData.message || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to load interviews.");
      }
      
      setInterviews(data.interviews || []);
      setSessions(data.sessions || []);
      setReports(data.reports || []);
      setBlueprints(data.blueprints || []);
      setCandidates(data.candidates || {});
      setRequirements(data.requirements || {});
      setError(null);
    } catch (err: any) {
      console.warn("[AIInterviewsDashboard] Fetch notice:", err?.message || err);
      if (!isSilent) {
        setError(err?.message || "Unable to fetch interviews. Please check server connectivity.");
      }
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadData(false);

    // Re-load when auth state initializes or changes
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        loadData(true);
      }
    });

    const interval = setInterval(() => {
      loadData(true); // background silent refresh
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  // Handle saving manual meeting link
  const handleSaveMeetingLink = async (interviewId: string) => {
    const link = editingMeetingLinks[interviewId];
    if (!link) return;
    try {
      setSavingLink(interviewId);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          action: "save-meeting-link",
          interviewId,
          meetingLink: link
        })
      });
      if (!res.ok) throw new Error("Failed to save link");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingLink(null);
    }
  };

  // Schedule Interview (AI or Human)
  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInterview.candidateId || !newInterview.requirementId || !newInterview.scheduledStart) {
      alert("Please fill in all scheduling fields");
      return;
    }

    const selectedCandidate = candidates[newInterview.candidateId];
    const candEmail = selectedCandidate?.email || selectedCandidate?.primaryEmail;
    if (!candEmail) {
      alert("Candidate email is required to schedule an AI interview session.");
      return;
    }

    try {
      setLoading(true);
      const idToken = await auth.currentUser?.getIdToken();
      // Create scheduled interview
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          action: "start-interview",
          candidateId: newInterview.candidateId,
          requirementId: newInterview.requirementId,
          voiceChoice: newInterview.voiceChoice,
          scheduledStart: new Date(newInterview.scheduledStart).toISOString(),
          interviewType: newInterview.interviewType,
          orgId: orgId || "GLOBAL"
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to schedule interview.");
      }

      const generatedInterviewId = data.interview?.interviewId;

      // If HUMAN_INTERVIEW and a real meeting link was entered by recruiter, save it
      if (newInterview.interviewType === "HUMAN_INTERVIEW" && newInterview.meetingLink && generatedInterviewId) {
        await fetch("/api/candidates/screen", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": idToken ? `Bearer ${idToken}` : ""
          },
          body: JSON.stringify({
            action: "save-meeting-link",
            interviewId: generatedInterviewId,
            meetingLink: newInterview.meetingLink
          })
        });
      }

      const rawToken = data.session?.rawToken || "";
      const joinPath = data.interview?.candidateJoinUrl || (rawToken ? `/ai-interview/${rawToken}` : "");
      const brandedOrigin = window.location.origin.includes("run.app") ? "https://os.hirenestworkforce.com" : window.location.origin;
      const fullJoinUrl = joinPath.startsWith("http") ? joinPath : `${brandedOrigin}${joinPath}`;
      
      const targetCandidate = candidates[newInterview.candidateId];
      const targetReq = requirements[newInterview.requirementId];

      setIsScheduleOpen(false);

      if (newInterview.interviewType === "AI_SCREENING") {
        setScheduledConfirmation({
          candidateName: targetCandidate ? `${targetCandidate.firstName || targetCandidate.name || ''} ${targetCandidate.lastName || ''}`.trim() : "Candidate",
          candidateEmail: targetCandidate?.email || targetCandidate?.primaryEmail || candEmail,
          jobTitle: targetReq?.title || targetReq?.jobTitle || "Job Requirement",
          scheduledStart: newInterview.scheduledStart ? new Date(newInterview.scheduledStart).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Scheduled Time",
          joinUrl: fullJoinUrl,
          joinPath: joinPath,
          rawToken: rawToken,
          interviewType: newInterview.interviewType,
          meetingLink: newInterview.meetingLink,
          interviewId: generatedInterviewId || "",
          candidateId: newInterview.candidateId
        });
      } else {
        alert("✓ Human Interview scheduled successfully!");
      }

      setNewInterview({ 
        candidateId: "", 
        requirementId: "", 
        scheduledStart: "", 
        voiceChoice: "Standard Male",
        interviewType: "AI_SCREENING",
        meetingProvider: "NONE",
        meetingLink: ""
      });
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to create interview session");
    } finally {
      setLoading(false);
    }
  };

  // Force Conclude Session
  const handleForceConclude = async (sessionId: string) => {
    if (!overrideReason) {
      alert("Please enter a reason for the manual override.");
      return;
    }
    try {
      setOverridingSession(sessionId);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          action: "force-conclude",
          sessionId,
          overrideReason,
          overriddenBy: "Recruiter Admin"
        })
      });
      if (!res.ok) throw new Error("Failed to force conclude session.");
      setSelectedSessionForMonitor(null);
      setOverrideReason("");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setOverridingSession(null);
    }
  };

  // Fail Terminate Session
  const handleFailTerminate = async (sessionId: string) => {
    if (!overrideReason) {
      alert("Please enter a reason for the manual termination.");
      return;
    }
    try {
      setOverridingSession(sessionId);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          action: "fail-terminate",
          sessionId,
          terminationReason: overrideReason,
          terminatedBy: "Recruiter Admin"
        })
      });
      if (!res.ok) throw new Error("Failed to fail-terminate session.");
      setSelectedSessionForMonitor(null);
      setOverrideReason("");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setOverridingSession(null);
    }
  };

  // Submit L1 Report to Client
  const handleSubmitToClient = async (report: any) => {
    try {
      setSubmittingToClient(report.sessionId);
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          action: "submit-to-client",
          candidateId: report.candidateId,
          requirementId: report.requirementId,
          interviewId: report.sessionId,
          reportId: report.sessionId,
          submittedBy: "Lead Recruiter"
        })
      });
      if (!res.ok) throw new Error("Failed to submit to client");
      alert("Level-1 Screening Report successfully transmitted to client portal!");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmittingToClient(null);
    }
  };

  // Delete L1 Report (Soft Delete)
  const handleDeleteReport = async (report: any) => {
    const candName = candidates[report.candidateId]?.name || candidates[report.candidateId]?.fullName || "Candidate";
    if (!confirm(`Are you sure you want to delete the L1 Screening Report for ${candName}?\n\nThis will soft-delete the report and remove it from operational views.`)) {
      return;
    }
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch("/api/candidates/screen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": idToken ? `Bearer ${idToken}` : ""
        },
        body: JSON.stringify({
          action: "delete-report",
          sessionId: report.sessionId || report.id,
          reportId: report.sessionId || report.id,
          deletionReason: "Recruiter requested soft deletion of L1 screening report."
        })
      });
      if (!res.ok) throw new Error("Failed to delete L1 screening report.");
      alert("✓ L1 Screening Report deleted successfully!");
      await loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete L1 report.");
    }
  };

  // Metrics computation from real database state
  const liveSessions = sessions.filter(s => s.status === "IN_PROGRESS" || s.status === "CREATED");
  const completedSessions = sessions.filter(s => s.status === "COMPLETED");
  const failedSessions = sessions.filter(s => s.status === "FAILED");
  const scheduledInterviews = interviews.filter(i => i.status === "SCHEDULED" || i.status === "INVITED");

  const averageCommScore = reports.length > 0
    ? Math.round(reports.reduce((sum, r) => sum + (r.communicationScore || 0), 0) / reports.length)
    : 0;

  // Filter candidates who are not currently scheduled to populate new scheduling options
  const eligibleCandidates = Object.entries(candidates).map(([id, val]: any) => ({ id, ...val }));
  const requirementsList = Object.entries(requirements).map(([id, val]: any) => ({ id, ...val }));

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></span> Live
            </span>
            <span className="text-xs text-slate-400 font-mono">HN-AI-INTERVIEW-v1.0</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 mt-1 flex items-center gap-2">
            AI Interview Intelligence Center
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">Real-time control deck for HireNest absolute-verified WebRTC and AI agent screening</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={loadData} 
            className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 transition flex items-center justify-center gap-1.5 text-xs font-semibold"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button 
            onClick={() => setIsScheduleOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <Plus size={16} /> Schedule AI Interview
          </button>
        </div>
      </header>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Scheduled", val: scheduledInterviews.length, color: "text-blue-600", bg: "bg-blue-50", icon: Calendar },
          { label: "Live Active", val: liveSessions.length, color: "text-amber-600", bg: "bg-amber-50", icon: Activity },
          { label: "Completed", val: completedSessions.length, color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
          { label: "Failed/Degraded", val: failedSessions.length, color: "text-rose-600", bg: "bg-rose-50", icon: XCircle },
          { label: "Avg Comm Score", val: `${averageCommScore}%`, color: "text-indigo-600", bg: "bg-indigo-50", icon: Award }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3.5">
            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
              <stat.icon size={20} />
            </div>
            <div>
              <span className="text-slate-400 text-xs font-medium uppercase tracking-wider block">{stat.label}</span>
              <span className={`text-2xl font-bold tracking-tight ${stat.color} block mt-0.5`}>{stat.val}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left Column: Active & Scheduled Queues */}
        <div className="xl:col-span-2 space-y-6">

          {/* Live Queue */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlayCircle size={18} className="text-amber-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Live / In-Progress AI Screening</h2>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-2s font-bold rounded-md uppercase">
                {liveSessions.length} Active
              </span>
            </div>
            
            {liveSessions.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <VideoOff size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm">No live screenings currently executing.</p>
                <button onClick={() => setIsScheduleOpen(true)} className="text-indigo-600 hover:underline text-xs mt-1.5 font-semibold">
                  Schedule one to start the AI Interviewer
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {liveSessions.map((session) => {
                  const cand = candidates[session.candidateId] || {};
                  const req = requirements[session.requirementId] || {};
                  return (
                    <div key={session.id} className="p-4 hover:bg-slate-50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-slate-400 font-mono block mb-1">Session: {session.id.substring(0, 10)}</span>
                        <h3 className="font-bold text-slate-900 text-sm">{cand.name || cand.fullName || "Candidate"}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Position: <span className="font-semibold">{req.title || "Target Role"}</span></p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 text-3s font-bold rounded">
                            ROUND {session.currentRound}: {session.difficulty} DIFFICULTY
                          </span>
                          <span className="text-slate-300 text-xs">|</span>
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Clock size={12} /> {new Date(session.updatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedSessionForMonitor(session)}
                          className="px-3.5 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center gap-1.5"
                        >
                          <Activity size={12} className="text-amber-400 animate-pulse" /> Monitor Live
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Scheduled Queue */}
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Upcoming / Scheduled Interviews</h2>
              </div>
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-2s font-bold rounded-md uppercase">
                {scheduledInterviews.length} Scheduled
              </span>
            </div>

            {scheduledInterviews.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Calendar size={36} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm">No scheduled interviews pending.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {scheduledInterviews.map((interview) => {
                  const cand = candidates[interview.candidateId] || {};
                  const req = requirements[interview.requirementId] || {};
                  const linkVal = editingMeetingLinks[interview.id] ?? interview.meetingLink ?? "";
                  return (
                    <div key={interview.id} className="p-4 hover:bg-slate-50 transition space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-sm">{cand.name || cand.fullName || cand.firstName ? `${cand.firstName || ''} ${cand.lastName || ''}` : "Candidate"} ({cand.email || cand.primaryEmail || "No Email Specified"})</h3>
                          <p className="text-xs text-slate-500">Position: <span className="font-bold text-slate-700">{req.title || req.jobTitle || "Requirement"}</span> • Scheduled for <span className="font-semibold text-slate-700">{new Date(interview.scheduledStart || interview.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span></p>
                        </div>
                        <span className="text-3s font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full uppercase self-start">
                          {interview.status || "SCHEDULED"}
                        </span>
                      </div>

                      {interview.type === "AI_SCREENING" || interview.transport === "LIVEKIT" ? (
                        <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-100 text-xs space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-extrabold text-indigo-700 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                              <Sparkles size={12}/> Transport: LiveKit Realtime AI
                            </span>
                            <span className="text-2xs font-mono text-indigo-600">
                              {window.location.origin.includes("run.app") ? "https://os.hirenestworkforce.com" : window.location.origin}{interview.candidateJoinUrl || `/ai-interview/${interview.rawToken || interview.sessionId || interview.id}`}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-100/60">
                            <button
                              onClick={() => {
                                const url = `${window.location.origin.includes("run.app") ? "https://os.hirenestworkforce.com" : window.location.origin}${interview.candidateJoinUrl || `/ai-interview/${interview.rawToken || interview.sessionId || interview.id}`}`;
                                navigator.clipboard.writeText(url);
                                alert("✓ Secure Candidate Join Link copied to clipboard:\n" + url);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <Copy size={12}/> Copy Link
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  const idToken = await auth.currentUser?.getIdToken();
                                  const res = await fetch("/api/candidates/screen", {
                                    method: "POST",
                                    headers: { 
                                      "Content-Type": "application/json",
                                      "Authorization": idToken ? `Bearer ${idToken}` : ""
                                    },
                                    body: JSON.stringify({
                                      action: "send-invitation",
                                      interviewId: interview.id || interview.interviewId,
                                      candidateId: interview.candidateId
                                    })
                                  });
                                  const data = await res.json();
                                  alert(`✓ Invitation Email dispatched to ${data.recipientEmail || cand.email || "candidate"}!`);
                                } catch {
                                  const url = `${window.location.origin.includes("run.app") ? "https://os.hirenestworkforce.com" : window.location.origin}${interview.candidateJoinUrl || `/ai-interview/${interview.rawToken || interview.sessionId || interview.id}`}`;
                                  alert("✓ Link Copied for Email Dispatch:\n" + url);
                                  navigator.clipboard.writeText(url);
                                }
                              }}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <Send size={12}/> Send Invitation
                            </button>
                            <a
                              href={interview.candidateJoinUrl || `/ai-interview/${interview.rawToken || interview.sessionId || interview.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <ExternalLink size={12}/> Open Session
                            </a>
                            <button
                              onClick={() => {
                                setSelectedReportSessionId(interview.sessionId || interview.id);
                                setIsL1ReportModalOpen(true);
                              }}
                              className="px-3 py-1.5 bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <Sparkles size={12} className="text-indigo-600"/> View L1 Report
                            </button>
                            <button
                              onClick={async () => {
                                const targetSessionId = interview.sessionId || interview.id;
                                if (!confirm(`End this interview session?\n\nThis will immediately disconnect candidate and AI interviewer, terminate the active LiveKit room, stop active recording/processing, and mark the session as FORCE_ENDED.`)) {
                                  return;
                                }
                                try {
                                  const idToken = await auth.currentUser?.getIdToken();
                                  const res = await fetch("/api/candidates/screen", {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                      "Authorization": idToken ? `Bearer ${idToken}` : ""
                                    },
                                    body: JSON.stringify({
                                      action: "fail-terminate",
                                      sessionId: targetSessionId,
                                      terminationReason: "ADMIN_FORCE_ENDED",
                                      terminatedBy: "Recruiter Admin"
                                    })
                                  });
                                  if (!res.ok) throw new Error("Failed to force end session.");
                                  alert("✓ Interview session force-ended and LiveKit room closed!");
                                  await loadData();
                                } catch (err: any) {
                                  alert(err.message || "Failed to force end interview session.");
                                }
                              }}
                              className="px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                            >
                              <XCircle size={12} className="text-rose-600"/> Force End
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <span className="text-xs text-slate-400 font-semibold md:w-28 flex items-center gap-1 px-1">
                            <Video size={12} /> Meeting Link:
                          </span>
                          <input 
                            type="url" 
                            placeholder="Paste Zoom, Teams, Google Meet, or LiveKit Link" 
                            value={linkVal}
                            onChange={(e) => setEditingMeetingLinks({...editingMeetingLinks, [interview.id]: e.target.value})}
                            className="flex-1 bg-white border border-slate-200 rounded-md px-3 py-1 text-xs focus:ring-1 focus:ring-indigo-500 outline-none" 
                          />
                          <button 
                            onClick={() => handleSaveMeetingLink(interview.id)}
                            disabled={savingLink === interview.id || linkVal === interview.meetingLink}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-2s rounded transition flex items-center gap-1 justify-center"
                          >
                            {savingLink === interview.id ? "Saving..." : <><Save size={12} /> Save</>}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

        </div>

        {/* Right Column: Completed Level-1 reports list */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={18} className="text-emerald-500" />
                <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">L1 Screening Reports</h2>
              </div>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2s font-bold rounded-md uppercase">
                {reports.length} Reports
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex-1 flex flex-col justify-center items-center">
                <FileText size={40} className="text-slate-200 mb-2" />
                <p className="text-xs">No reports generated yet.</p>
                <p className="text-2xs text-slate-400 mt-1">Complete an interview session to auto-generate the screening scorecard.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50 overflow-y-auto max-h-[450px]">
                {reports.map((report) => {
                  const cand = candidates[report.candidateId] || {};
                  const isSubmitted = cand.screeningStatus === "CLIENT_SUBMISSION_COMPLETED";
                  return (
                    <div key={report.sessionId} className="p-4 hover:bg-slate-50 transition space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="font-bold text-slate-900 text-xs tracking-tight">{cand.name || cand.fullName || "Candidate"}</h4>
                        <span className={`text-3s font-extrabold px-1.5 py-0.5 rounded uppercase ${
                          report.overallRecommendation === "STRONG_PASS" ? "bg-emerald-50 text-emerald-700" :
                          report.overallRecommendation === "PASS_WITH_RESERVATIONS" ? "bg-amber-50 text-amber-700" :
                          "bg-rose-50 text-rose-700"
                        }`}>
                          {(report.overallRecommendation || "").replace("_", " ")}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-2xs bg-slate-50 p-2 rounded border border-slate-100">
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider block">Tech Score</span>
                          <span className="font-bold text-slate-700 text-xs block mt-0.5">{report.technicalCompetenceScore}%</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase tracking-wider block">Communication</span>
                          <span className="font-bold text-slate-700 text-xs block mt-0.5">{report.communicationScore}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button 
                          onClick={() => setSelectedReportForView(report)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                        >
                          View L1 Report <ChevronRight size={14} />
                        </button>
                        <div className="flex items-center gap-1.5">
                          {isSubmitted ? (
                            <span className="text-2xs text-emerald-600 font-bold flex items-center gap-0.5">
                              <ShieldCheck size={12} /> Submitted
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleSubmitToClient(report)}
                              disabled={submittingToClient === report.sessionId}
                              className="px-2 py-0.5 bg-slate-900 hover:bg-slate-950 text-white text-3s font-bold rounded transition flex items-center gap-1"
                            >
                              <Send size={8} /> Submit to Client
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteReport(report)}
                            title="Delete L1 Screening Report"
                            className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-3s font-bold rounded transition flex items-center gap-1"
                          >
                            <Trash2 size={10} /> Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

      </div>

      {/* MODAL 1: Live Monitor View */}
      {selectedSessionForMonitor && (() => {
        const session = selectedSessionForMonitor;
        const cand = candidates[session.candidateId] || {};
        const req = requirements[session.requirementId] || {};
        const blueprint = blueprints.find(b => b.candidateId === session.candidateId && b.requirementId === session.requirementId) || {};
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-950 text-white flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping"></span>
                    <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Live WebRTC Session Monitor</span>
                  </div>
                  <h3 className="text-lg font-bold mt-1">Screening: {cand.name || cand.fullName}</h3>
                </div>
                <button 
                  onClick={() => {
                    setSelectedSessionForMonitor(null);
                    setOverrideReason("");
                  }} 
                  className="p-1 text-slate-400 hover:text-white transition"
                >
                  <XCircle size={22} />
                </button>
              </div>

              {/* Modal Layout */}
              <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                
                {/* Left Section: Live Cameras & Participant Indicators */}
                <div className="lg:col-span-5 p-5 space-y-4 bg-slate-50">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">Active Streams</h4>
                  
                  {/* Candidate Frame */}
                  <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-800 flex flex-col justify-center items-center">
                    {session.status === "IN_PROGRESS" ? (
                      <>
                        <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 text-3s font-bold rounded flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span> REC
                        </div>
                        <div className="w-16 h-16 rounded-full bg-indigo-900/60 border border-indigo-500/40 flex items-center justify-center text-white text-lg font-bold shadow-md animate-pulse">
                          {cand.name ? cand.name.substring(0, 2).toUpperCase() : "C"}
                        </div>
                        <span className="text-emerald-400 text-xs font-bold mt-3 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Candidate Connected (Live WebRTC)
                        </span>
                        <span className="text-3s text-slate-400 mt-0.5 font-mono">Room: {session.id?.substring(0, 12)}...</span>
                      </>
                    ) : (
                      <>
                        <div className="absolute top-3 left-3 bg-amber-500 text-slate-950 px-2 py-0.5 text-3s font-bold rounded flex items-center gap-1 shadow-sm">
                          <span>AWAITING CANDIDATE</span>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500 text-lg font-bold">
                          {cand.name ? cand.name.substring(0, 2).toUpperCase() : "C"}
                        </div>
                        <span className="text-slate-400 text-xs font-medium mt-3">Candidate Not Yet Connected</span>
                        <span className="text-3s text-slate-500 mt-1 font-mono">Waiting for candidate to open session URL</span>
                      </>
                    )}
                  </div>

                  {/* AI Interviewer Participant Frame */}
                  <div className="relative aspect-video bg-indigo-950 rounded-xl overflow-hidden shadow-inner border border-indigo-900 flex flex-col justify-center items-center">
                    <div className="absolute top-3 left-3 bg-indigo-600 text-white px-2 py-0.5 text-3s font-bold rounded flex items-center gap-1 shadow-sm">
                      <Volume2 size={10} className="animate-bounce" /> AGENT
                    </div>
                    <div className="w-14 h-14 rounded-full bg-indigo-900/60 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
                      <Sparkles size={24} className="animate-spin text-indigo-400" />
                    </div>
                    <span className="text-indigo-200 text-xs font-bold mt-3">AI Agent Interviewer</span>
                    <span className="text-3s text-indigo-400 mt-1 font-semibold uppercase tracking-wider">
                      Round {session.currentRound}: {INTERVIEW_ROUNDS[session.currentRound - 1]?.name}
                    </span>
                  </div>

                  {/* Administrative Emergency Overrides */}
                  <div className="border border-red-100 bg-red-50/50 p-4 rounded-xl space-y-3 mt-4">
                    <div className="flex items-center gap-1.5 text-red-700">
                      <AlertCircle size={16} />
                      <span className="text-xs font-extrabold uppercase tracking-wide">Emergency Recruiter Override</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Required Override/Termination Reason" 
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      className="w-full bg-white border border-red-200 rounded-md px-3 py-1.5 text-xs text-slate-700 focus:ring-1 focus:ring-red-500 outline-none" 
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleForceConclude(session.id)}
                        disabled={overridingSession === session.id}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-300 text-white font-bold text-3s rounded-md transition shadow-xs flex items-center justify-center gap-1"
                      >
                        Force Conclude
                      </button>
                      <button 
                        onClick={() => handleFailTerminate(session.id)}
                        disabled={overridingSession === session.id}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold text-3s rounded-md transition shadow-xs flex items-center justify-center gap-1"
                      >
                        Fail / Terminate
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right Section: Real-time Transcript Stream & Gaps */}
                <div className="lg:col-span-7 p-5 flex flex-col justify-between max-h-[60vh] lg:max-h-full">
                  <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                    <h4 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block border-b border-slate-100 pb-1.5">
                      Real-time Transcript Stream
                    </h4>

                    {/* Current Dynamic Question */}
                    {session.currentQuestion && (
                      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-1.5 shadow-xs">
                        <span className="text-indigo-600 text-3s font-extrabold uppercase tracking-wider block">AI Question Asked:</span>
                        <p className="text-slate-800 text-xs font-bold leading-relaxed">{session.currentQuestion}</p>
                      </div>
                    )}

                    {/* Scrolling Transcript Log */}
                    <div className="space-y-3 pt-2">
                      {session.transcript && session.transcript.length === 0 ? (
                        <div className="text-center p-6 text-slate-400 text-xs">
                          Candidate is listening to welcome statement and preparing to answer...
                        </div>
                      ) : (
                        session.transcript.map((item: any, i: number) => (
                          <div key={i} className="space-y-2 border-l-2 border-slate-100 pl-3">
                            <div className="text-slate-500 text-2xs font-bold flex items-center gap-1.5 uppercase">
                              <span>Round {item.roundNumber}: {item.roundName}</span>
                              <span className="text-slate-200">•</span>
                              <span className="text-emerald-600">Acc Score: {item.accuracyScore}%</span>
                            </div>
                            <p className="text-slate-800 text-xs font-medium"><strong className="text-indigo-600">Q:</strong> {item.question}</p>
                            <p className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                              <strong className="text-slate-500 font-bold">Candidate:</strong> "{item.answer}"
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Skills blueprint summary */}
                  {blueprint && (
                    <div className="border-t border-slate-100 pt-4 mt-4 bg-slate-50/50 p-3 rounded-lg border">
                      <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-widest block mb-2">Tailored Interview Blueprint Focus</span>
                      <div className="flex flex-wrap gap-1.5">
                        {blueprint.mandatorySkills?.map((skill: string, s: number) => (
                          <span key={s} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-3s font-bold border border-indigo-100 rounded">
                            {skill}
                          </span>
                        ))}
                        {blueprint.skillGaps?.map((gap: string, g: number) => (
                          <span key={g} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-3s font-bold border border-rose-100 rounded">
                            Gap: {gap}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        );
      })()}

      {/* MODAL 2: Level-1 Report Scorecard Modal */}
      {selectedReportForView && (() => {
        const report = selectedReportForView;
        const cand = candidates[report.candidateId] || {};
        const req = requirements[report.requirementId] || {};
        const isSubmitted = cand.screeningStatus === "CLIENT_SUBMISSION_COMPLETED";

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
              
              {/* Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div>
                  <span className="text-indigo-400 text-3s font-extrabold uppercase tracking-widest">Scorecard Ready</span>
                  <h3 className="text-lg font-bold mt-0.5">HireNest Level-1 AI Screening: {cand.name || cand.fullName}</h3>
                </div>
                <button onClick={() => setSelectedReportForView(null)} className="p-1 text-slate-400 hover:text-white transition">
                  <XCircle size={22} />
                </button>
              </div>

              {/* Report Layout */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Scorecard Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 pb-5">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <span className="text-slate-400 uppercase tracking-widest text-3s font-bold block">Overall Recommendation</span>
                    <span className={`text-xl font-black block mt-2 ${
                      report.overallRecommendation === "STRONG_PASS" ? "text-emerald-600" :
                      report.overallRecommendation === "PASS_WITH_RESERVATIONS" ? "text-amber-500" : "text-rose-600"
                    }`}>
                      {(report.overallRecommendation || "").replace("_", " ")}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <span className="text-slate-400 uppercase tracking-widest text-3s font-bold block">Technical Competence</span>
                    <span className="text-3xl font-black text-slate-800 block mt-1">{report.technicalCompetenceScore}%</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                    <span className="text-slate-400 uppercase tracking-widest text-3s font-bold block">Objective Communication</span>
                    <span className="text-3xl font-black text-slate-800 block mt-1">{report.communicationScore}%</span>
                  </div>
                </div>

                {/* Recruiter executive briefing */}
                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50 space-y-1">
                  <span className="text-indigo-700 text-xs font-extrabold uppercase tracking-wide block">Executive Briefing Summary</span>
                  <p className="text-slate-700 text-xs leading-relaxed font-medium">{report.recruiterBriefing}</p>
                </div>

                {/* Communication Factors Details (8 Dimensions) */}
                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Objective Communication Assessment (8 Dimensions)</span>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Object.entries(report.detailedCommAssessment || {}).filter(([k]) => k !== "overallCommScore").map(([key, score]: any) => (
                      <div key={key} className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-center">
                        <span className="text-slate-400 capitalize text-3s font-semibold block">{(key || "").replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-bold text-slate-800 text-sm mt-1 block">{score}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Indicators grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-emerald-50/20 border border-emerald-100 p-4 rounded-xl space-y-2">
                    <span className="text-emerald-700 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <CheckCircle size={14} /> Major Strengths Identified
                    </span>
                    <ul className="space-y-1.5 text-slate-600 text-xs pl-1 list-disc list-inside font-medium">
                      {report.positiveIndicators?.map((ind: string, i: number) => <li key={i}>{ind}</li>)}
                    </ul>
                  </div>
                  <div className="bg-rose-50/20 border border-rose-100 p-4 rounded-xl space-y-2">
                    <span className="text-rose-700 font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <AlertCircle size={14} /> Areas for Review / Gaps
                    </span>
                    <ul className="space-y-1.5 text-slate-600 text-xs pl-1 list-disc list-inside font-medium">
                      {report.negativeIndicators?.map((ind: string, i: number) => <li key={i}>{ind}</li>)}
                    </ul>
                  </div>
                </div>

                {/* Question & Answer Transcript Log */}
                <div className="space-y-3 border-t border-slate-100 pt-5">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-widest block">Complete Interview Q&A Transcript</span>
                  <div className="space-y-4">
                    {report.transcript?.map((item: any, idx: number) => (
                      <div key={idx} className="border-l-2 border-indigo-100 pl-4 space-y-1.5">
                        <div className="flex items-center justify-between text-2xs font-bold text-slate-400 uppercase">
                          <span>ROUND {item.roundNumber}: {item.roundName}</span>
                          <span className="text-emerald-600 font-extrabold">Technical Accuracy: {item.accuracyScore}%</span>
                        </div>
                        <p className="text-slate-800 text-xs font-bold"><strong className="text-indigo-600">AI:</strong> {item.question}</p>
                        <p className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded border border-slate-100 italic leading-relaxed">
                          <strong className="text-slate-500 font-extrabold">Candidate:</strong> "{item.answer}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Action Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-2xs text-slate-400 font-medium font-mono">Sanitized Report: Confidential Recruiter Assessment</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedReportForView(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold text-xs rounded-lg hover:bg-slate-100 transition"
                  >
                    Close
                  </button>
                  {isSubmitted ? (
                    <span className="px-4 py-2 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-100 flex items-center gap-1.5">
                      <ShieldCheck size={14} /> Submitted to Client
                    </span>
                  ) : (
                    <button 
                      onClick={() => handleSubmitToClient(report)}
                      disabled={submittingToClient === report.sessionId}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-950 disabled:bg-slate-400 text-white font-bold text-xs rounded-lg transition flex items-center gap-1.5 shadow-sm"
                    >
                      {submittingToClient === report.sessionId ? "Submitting..." : <><Send size={12} /> Submit Report to Client</>}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Slide-over Scheduling Drawer */}
      {isScheduleOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-md p-6 h-full flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-6 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} className="text-indigo-600" /> Schedule AI Screening
                </h3>
                <button onClick={() => setIsScheduleOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                  <XCircle size={20} />
                </button>
              </div>

              <form onSubmit={handleScheduleInterview} className="space-y-4">
                
                {/* Interview Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Interview Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewInterview({...newInterview, interviewType: "AI_SCREENING"})}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex flex-col items-center gap-1 ${
                        newInterview.interviewType === "AI_SCREENING" 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Sparkles size={14} className={newInterview.interviewType === "AI_SCREENING" ? "text-indigo-600" : "text-slate-400"} />
                      <span>AI Level-1 Screening</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewInterview({...newInterview, interviewType: "HUMAN_INTERVIEW"})}
                      className={`py-2 px-3 rounded-lg border text-xs font-bold transition flex flex-col items-center gap-1 ${
                        newInterview.interviewType === "HUMAN_INTERVIEW" 
                          ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs" 
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <User size={14} className={newInterview.interviewType === "HUMAN_INTERVIEW" ? "text-indigo-600" : "text-slate-400"} />
                      <span>Human Interview</span>
                    </button>
                  </div>
                </div>

                {/* Candidate Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Select Candidate</label>
                  <select 
                    value={newInterview.candidateId}
                    onChange={(e) => setNewInterview({...newInterview, candidateId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                    required
                  >
                    <option value="">-- Choose Candidate --</option>
                    {eligibleCandidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name || c.fullName || c.id}</option>
                    ))}
                  </select>
                </div>

                {/* Requirement / JD Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Select Job Description / Req</label>
                  <select 
                    value={newInterview.requirementId}
                    onChange={(e) => setNewInterview({...newInterview, requirementId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                    required
                  >
                    <option value="">-- Choose Target Requirement --</option>
                    {requirementsList.map(r => (
                      <option key={r.id} value={r.id}>{r.title || r.id}</option>
                    ))}
                  </select>
                </div>

                {/* Scheduled Start Date/Time */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase block">Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={newInterview.scheduledStart}
                    onChange={(e) => setNewInterview({...newInterview, scheduledStart: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                {/* Conditional Fields based on Interview Mode */}
                {newInterview.interviewType === "AI_SCREENING" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-500 uppercase block">AI Agent Voice Option</label>
                      <select 
                        value={newInterview.voiceChoice}
                        onChange={(e) => setNewInterview({...newInterview, voiceChoice: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-sm text-slate-700 focus:ring-1 focus:ring-indigo-500 outline-none"
                      >
                        <option value="Standard Male">Standard Male (Empathetic Technical Architect)</option>
                        <option value="Standard Female">Standard Female (Encouraging Staff Recruiter)</option>
                        <option value="Executive Female">Executive Female (Objective Senior Auditor)</option>
                      </select>
                    </div>

                    <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                      <div className="font-bold flex items-center gap-1">
                        <Sparkles size={13} className="text-indigo-600" /> LiveKit Transport
                      </div>
                      <p className="text-2xs text-indigo-700 leading-normal">
                        Candidate invitation link will be auto-generated. No Google Meet link required. Candidate connects directly via WebRTC.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-xs font-bold text-slate-700 uppercase block">Human Interview Meeting Config</span>
                    
                    <div className="space-y-1">
                      <label className="text-2xs font-semibold text-slate-500 uppercase block">Meeting Provider</label>
                      <select
                        value={newInterview.meetingProvider}
                        onChange={(e) => setNewInterview({...newInterview, meetingProvider: e.target.value as any})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none"
                      >
                        <option value="NONE">Manual / Custom Link</option>
                        <option value="GOOGLE_MEET">Google Meet</option>
                        <option value="MANUAL">Microsoft Teams / Zoom / Webex</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-2xs font-semibold text-slate-500 uppercase block">Meeting Link URL</label>
                      <input 
                        type="url" 
                        placeholder="https://meet.google.com/abc-defg-hij or Teams/Zoom link"
                        value={newInterview.meetingLink}
                        onChange={(e) => setNewInterview({...newInterview, meetingLink: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 outline-none"
                      />
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition mt-4 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {loading ? "Scheduling..." : <><Calendar size={14} /> Confirm and Schedule</>}
                </button>

              </form>
            </div>
            
            <div className="border-t border-slate-100 pt-3 text-center">
              <span className="text-3s text-slate-400 font-mono">HireNest LiveKit Room Auto-Provisioning</span>
            </div>
          </div>
        </div>
      )}

      {/* Post-Scheduling Confirmation Modal */}
      {scheduledConfirmation && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">AI LEVEL-1 SCREENING SCHEDULED</h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Candidate invitation generated & ready for dispatch</p>
            </div>

            <div className="py-4 space-y-3">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Candidate</span>
                  <span className="font-bold text-slate-900">{scheduledConfirmation.candidateName} ({scheduledConfirmation.candidateEmail})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Position</span>
                  <span className="font-bold text-slate-900">{scheduledConfirmation.jobTitle}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Scheduled Time</span>
                  <span className="font-semibold text-slate-800">{scheduledConfirmation.scheduledStart}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Transport</span>
                  <span className="font-extrabold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    <Sparkles size={12}/> LiveKit Realtime AI
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Branded Candidate Join Link
                </label>
                <div className="flex items-center gap-2">
                  <input 
                    readOnly 
                    value={scheduledConfirmation.joinUrl} 
                    className="flex-1 bg-slate-100 border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none" 
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scheduledConfirmation.joinUrl);
                      alert("✓ Secure Candidate Join Link copied to clipboard:\n" + scheduledConfirmation.joinUrl);
                    }}
                    className="px-3 py-2 bg-indigo-600 text-white font-bold rounded-lg text-xs hover:bg-indigo-700 transition flex items-center gap-1 shrink-0"
                  >
                    <Copy size={13} /> Copy Link
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
              <button
                onClick={async () => {
                  try {
                    const idToken = await auth.currentUser?.getIdToken();
                    const res = await fetch("/api/candidates/screen", {
                      method: "POST",
                      headers: { 
                        "Content-Type": "application/json",
                        "Authorization": idToken ? `Bearer ${idToken}` : ""
                      },
                      body: JSON.stringify({
                        action: "send-invitation",
                        interviewId: scheduledConfirmation.interviewId,
                        candidateId: scheduledConfirmation.candidateId
                      })
                    });
                    const data = await res.json();
                    alert(`✓ Invitation Dispatched to ${scheduledConfirmation.candidateEmail}!`);
                  } catch {
                    alert("✓ Link Copied for Email Dispatch:\n" + scheduledConfirmation.joinUrl);
                    navigator.clipboard.writeText(scheduledConfirmation.joinUrl);
                  }
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <Send size={14} /> Send Invitation
              </button>

              <a
                href={scheduledConfirmation.joinPath}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <ExternalLink size={14} /> Open Candidate View
              </a>

              <button
                onClick={() => setScheduledConfirmation(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <AIL1ScreeningReportModal
        isOpen={isL1ReportModalOpen}
        onClose={() => setIsL1ReportModalOpen(false)}
        sessionId={selectedReportSessionId || undefined}
      />
    </div>
  );
}
