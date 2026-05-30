import { useState, useEffect } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { Link } from "react-router-dom";

export function ProgressTracker({ role }: { role: string | null }) {
  const [tasks, setTasks] = useState<{ id: string; label: string; completed: boolean; link: string }[]>([]);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Only parse if actually present to avoid constant rerenders
    const localDismiss = localStorage.getItem(`progress_tracker_dismissed_${role}`);
    if (localDismiss === "true") {
      setIsDismissed(true);
    }
  }, [role]);

  useEffect(() => {
    // We mock completion dynamically based on local storage flags.
    // In a real app, this would be computed by querying Firestore (e.g. counts > 0).
    const isClient = role === 'client' || role?.startsWith('client_');
    const isVendor = role === 'vendor' || role?.startsWith('vendor_') || role === 'independent_vendor';
    const isRecruiter = role === 'recruiter' || role === 'independent_recruiter' || role === 'freelancer_recruiter';

    const checkFlag = (key: string) => localStorage.getItem(key) === "true";

    if (isClient) {
      setTasks([
        { id: "profile", label: "Complete Profile", completed: checkFlag("onboarding_complete_client"), link: "/" },
        { id: "req", label: "Create Requirement", completed: checkFlag("has_created_req"), link: "/jobs" },
        { id: "review", label: "Review Candidates", completed: checkFlag("has_reviewed_cand"), link: "/candidates" },
        { id: "schedule", label: "Schedule Interviews", completed: checkFlag("has_scheduled_int"), link: "/deal-rooms" },
      ]);
    } else if (isVendor) {
      setTasks([
        { id: "profile", label: "Complete Profile", completed: checkFlag("onboarding_complete_vendor"), link: "/" },
        { id: "bench", label: "Upload Bench Candidates", completed: checkFlag("has_uploaded_bench"), link: "/candidates" },
        { id: "submit", label: "Submit Resource", completed: checkFlag("has_submitted_cand"), link: "/jobs" },
        { id: "placement", label: "Track Placement", completed: checkFlag("has_placement"), link: "/deal-rooms" },
      ]);
    } else if (isRecruiter) {
      setTasks([
        { id: "profile", label: "Complete Profile", completed: checkFlag("onboarding_complete_recruiter"), link: "/" },
        { id: "reqs", label: "View Requirements", completed: checkFlag("has_viewed_reqs"), link: "/jobs" },
        { id: "submit", label: "Submit First Candidate", completed: checkFlag("has_submitted_cand"), link: "/candidates" },
        { id: "interview", label: "Schedule First Interview", completed: checkFlag("has_scheduled_int"), link: "/deal-rooms" },
        { id: "placement", label: "Complete First Placement", completed: checkFlag("has_placement"), link: "/deal-rooms" },
      ]);
    } else {
      setTasks([]);
    }
  }, [role]);

  if (isDismissed || tasks.length === 0) return null;

  const completedCount = tasks.filter((t) => t.completed).length;
  const progressPercent = Math.round((completedCount / tasks.length) * 100);

  if (progressPercent === 100 && !localStorage.getItem(`progress_tracker_dismissed_${role}`)) {
    // Auto-dismiss once 100% complete
    setTimeout(() => {
      setIsDismissed(true);
      localStorage.setItem(`progress_tracker_dismissed_${role}`, "true");
    }, 5000);
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex-1">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">Getting Started</h3>
              <p className="text-xs text-slate-500 mt-1">Complete these tasks to activate your network features.</p>
            </div>
            <span className="text-xl font-light text-indigo-600">{progressPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mb-2 overflow-hidden">
            <div className="bg-indigo-600 h-1.5 rounded-full transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 pl-0 md:pl-6 md:border-l border-slate-100">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              {task.completed ? (
                <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
              ) : (
                <Circle size={16} className="text-slate-300 shrink-0" />
              )}
              <Link to={task.link} className={`text-[11px] font-medium transition-colors ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700 hover:text-indigo-600'}`}>
                {task.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
