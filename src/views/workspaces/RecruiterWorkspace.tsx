import { useState } from "react";
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  TrendingUp,
  DollarSign,
  Target,
  UploadCloud,
  Search,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";
import { ProgressTracker } from "../../components/ProgressTracker";
import { ActivityFeed } from "../../components/ActivityFeed";

export default function RecruiterWorkspace({
  userName,
  metrics,
}: {
  userName: string;
  metrics?: any;
}) {
  return (
    <div className="flex-1 bg-slate-50 flex flex-col min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between relative z-10 gap-6">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-slate-900 mb-2">
              Good morning, {userName}
            </h1>
            <p className="text-sm text-slate-500">
              Here is your daily action plan and pipeline summary.
            </p>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <ProgressTracker role="recruiter" />

          <div className="space-y-8">
            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Submit Candidate
                    </h4>
                    <p className="text-xs text-slate-500">
                      Add to open requirement
                    </p>
                  </div>
                </button>
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <Search size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Search Requirement
                    </h4>
                    <p className="text-xs text-slate-500">Browse active jobs</p>
                  </div>
                </button>
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <UploadCloud size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Upload Resume
                    </h4>
                    <p className="text-xs text-slate-500">
                      Parse and add to roster
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
                    Today's Work
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
                      New Requirements
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Assigned in the last 24h
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-rose-50 text-rose-600 p-2 rounded-lg">
                        <Users size={18} />
                      </div>
                      <span className="text-2xl font-light text-slate-900">
                        {metrics?.pendingSubmissions || 0}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Pending Submission
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Candidates waiting to be floated
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
                      Scheduled for today & tomorrow
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
                        <Clock size={18} />
                      </div>
                      <span className="text-2xl font-light text-slate-900">
                        {metrics?.pendingFeedback || 0}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Follow-Ups Due
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Feedback requested
                    </p>
                  </div>
                </div>

                {/* Section: Pipeline Summary */}
                <div className="pt-6">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                    Pipeline Summary
                  </h3>
                  <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row shadow-sm">
                    <div className="flex-1 p-6 text-center border-b md:border-b-0 md:border-r border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Active
                      </p>
                      <p className="text-3xl font-light text-slate-900">
                        {metrics?.activeCandidates || 0}
                      </p>
                    </div>
                    <div className="flex-1 p-6 text-center border-b md:border-b-0 md:border-r border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Interviewing
                      </p>
                      <p className="text-3xl font-light text-indigo-600">
                        {metrics?.actionQueue || 0}
                      </p>
                    </div>
                    <div className="flex-1 p-6 text-center border-b md:border-b-0 md:border-r border-slate-100">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Offered
                      </p>
                      <p className="text-3xl font-light text-amber-600">
                        {metrics?.offers || 0}
                      </p>
                    </div>
                    <div className="flex-1 p-6 text-center">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Joined
                      </p>
                      <p className="text-3xl font-light text-emerald-600">
                        {metrics?.placements || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Performance */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Performance
                </h3>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <TrendingUp size={16} />
                      <span className="text-sm font-semibold">
                        Monthly Placements
                      </span>
                    </div>
                    <div className="text-3xl font-light text-slate-900">
                      {metrics?.placements || 0}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <Target size={16} />
                      <span className="text-sm font-semibold">
                        Submission Conversion
                      </span>
                    </div>
                    <div className="text-3xl font-light text-slate-900">
                      {metrics?.conversionRate || 0}%
                    </div>
                  </div>
                </div>

                <ActivityFeed recipients={["GLOBAL_ADMIN"]} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
