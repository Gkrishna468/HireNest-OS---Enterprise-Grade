import { useState, useEffect } from "react";
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  CheckCircle,
  Target,
  Search,
  PlusCircle,
  CheckSquare,
} from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";
import { ProgressTracker } from "../../components/ProgressTracker";
import { ActivityFeed } from "../../components/ActivityFeed";
import { auth, db } from "../../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export default function HiringManagerWorkspace({
  userName,
  orgId,
  metrics,
}: {
  userName: string;
  orgId?: string;
  metrics?: any;
}) {
  const [interviews, setInterviews] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    if (!auth.currentUser || !orgId) return;
    
    // We fetch interviews assigned to this client
    const qAll = query(
      collection(db, "interviews"),
      where("clientId", "==", orgId)
    );
    
    const unsub = onSnapshot(qAll, snap => {
      if (!active) return;
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setInterviews(data);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [metrics]);

  const requestsPending = interviews.filter(i => i.status === 'REQUESTED').length;
  const availabilityPending = interviews.filter(i => i.status === 'AVAILABILITY_PENDING').length;
  const scheduledCount = interviews.filter(i => i.status === 'SCHEDULED' || i.status === 'INTERVIEW_ROUND_1').length;
  const feedbackPending = interviews.filter(i => i.status === 'FEEDBACK_PENDING').length;
  const decisionPending = interviews.filter(i => i.status === 'DECISION_PENDING').length;

  return (
    <div className="flex-1 bg-slate-50 flex flex-col min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between relative z-10 gap-6">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-slate-900 mb-2">
              Client Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Welcome, <strong className="text-indigo-600">{userName}</strong> |
              Here is your hiring pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <ProgressTracker role="client" />

          <div className="space-y-8">
            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <PlusCircle size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Create Requirement
                    </h4>
                    <p className="text-xs text-slate-500">Open a new job</p>
                  </div>
                </button>
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <Users size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Review Submissions
                    </h4>
                    <p className="text-xs text-slate-500">
                      Review floats from vendors
                    </p>
                  </div>
                </button>
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <CheckSquare size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Provide Feedback
                    </h4>
                    <p className="text-xs text-slate-500">
                      Complete interview scores
                    </p>
                  </div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Pillar: Today's Work */}
              <div className="lg:col-span-2 space-y-6">

                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Interview Operations
                  </h3>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-slate-300 transition-colors cursor-pointer group">
                     {requestsPending > 0 && <span className="absolute top-0 right-0 w-2 h-full bg-slate-300" />}
                     <h4 className="font-semibold text-slate-900 text-sm mb-1">Requested</h4>
                     <p className="text-2xl font-light text-slate-900">{requestsPending}</p>
                     <p className="text-[10px] text-slate-500 uppercase mt-2 tracking-wider">With Vendor</p>
                  </div>
                  
                  <div className="bg-white border border-indigo-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer group">
                     {scheduledCount > 0 && <span className="absolute top-0 right-0 w-2 h-full bg-indigo-500" />}
                     <h4 className="font-semibold text-slate-900 text-sm mb-1">Scheduled</h4>
                     <p className="text-2xl font-light text-slate-900">{scheduledCount}</p>
                     <p className="text-[10px] text-slate-500 uppercase mt-2 tracking-wider">Upcoming</p>
                  </div>

                  <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm hover:border-amber-300 transition-colors cursor-pointer relative overflow-hidden group">
                     {feedbackPending > 0 && <span className="absolute top-0 right-0 w-2 h-full bg-amber-500" />}
                     <h4 className="font-semibold text-slate-900 text-sm mb-1">Awaiting Feedback</h4>
                     <p className="text-2xl font-light text-slate-900">{feedbackPending}</p>
                     <p className="text-[10px] text-slate-500 uppercase mt-2 tracking-wider">Your Action Required</p>
                  </div>

                  <div className="bg-white border border-emerald-200 rounded-xl p-4 shadow-sm hover:border-emerald-300 transition-colors cursor-pointer relative overflow-hidden group">
                     {decisionPending > 0 && <span className="absolute top-0 right-0 w-2 h-full bg-emerald-500" />}
                     <h4 className="font-semibold text-slate-900 text-sm mb-1">Decisions Pending</h4>
                     <p className="text-2xl font-light text-slate-900">{decisionPending}</p>
                     <p className="text-[10px] text-slate-500 uppercase mt-2 tracking-wider">Ready to Hire</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Hiring Operations
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-orange-50 text-orange-600 p-2 rounded-lg">
                        <Briefcase size={18} />
                      </div>
                      <span className="text-2xl font-light text-slate-900">
                        {metrics?.totalJobs || 0}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Active Requirements
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Open jobs assigned to vendors
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
                        <Users size={18} />
                      </div>
                      <span className="text-2xl font-light text-slate-900">
                        {metrics?.totalCandidates || 0}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Pending Review
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Candidates awaiting your decision
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg">
                        <Calendar size={18} />
                      </div>
                      <span className="text-2xl font-light text-slate-900">
                        {metrics?.interviewsToday || 0}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Interviews Scheduled
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Upcoming candidate meetings
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                        <CheckCircle size={18} />
                      </div>
                      <span className="text-2xl font-light text-slate-900">
                        {metrics?.placements || 0}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Active Offers & Hires
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Successful placements
                    </p>
                  </div>
                </div>

                {(metrics?.totalJobs === 0 && metrics?.totalCandidates === 0) && (
                  <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                     <Briefcase className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
                     <h3 className="text-lg font-bold text-indigo-900 mb-2">No active requirements yet</h3>
                     <p className="text-sm text-indigo-700/80 mb-6">Create a job requirement to start receiving candidate submissions.</p>
                     <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                        Create Requirement
                     </button>
                  </div>
                )}
              </div>

              {/* Right Column: Pipeline Health */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Pipeline Health
                </h3>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <Target size={16} />
                      <span className="text-sm font-semibold">
                        Time to Hire
                      </span>
                    </div>
                    <div className="text-3xl font-light text-slate-900">
                      {metrics?.timeToHireDays || 0} Days
                    </div>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      Average over last 30 days
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <Users size={16} />
                      <span className="text-sm font-semibold">
                        Offer Acceptance Rate
                      </span>
                    </div>
                    <div className="text-3xl font-light text-slate-900">
                      {metrics?.offerAcceptanceRate || 0}%
                    </div>
                  </div>
                </div>

                <ActivityFeed recipients={["GLOBAL_CLIENT", "GLOBAL_ADMIN"]} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
