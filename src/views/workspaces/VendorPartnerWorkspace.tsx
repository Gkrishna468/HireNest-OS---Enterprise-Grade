import { useState } from "react";
import {
  Briefcase,
  Users,
  Calendar,
  Clock,
  DollarSign,
  Target,
  Search,
  UserPlus,
  FileText,
  Sparkles,
} from "lucide-react";
import CandidateSubmissionModal from "../../components/CandidateSubmissionModal";
import { ProgressTracker } from "../../components/ProgressTracker";
import { ActivityFeed } from "../../components/ActivityFeed";

export default function VendorPartnerWorkspace({
  vendorName,
  metrics,
}: {
  vendorName: string;
  metrics?: any;
}) {
  const [submittingReq, setSubmittingReq] = useState<{
    id: string;
    title: string;
  } | null>(null);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col min-h-screen text-slate-900 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between relative z-10 gap-6">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-slate-900 mb-2">
              Vendor Dashboard
            </h1>
            <p className="text-sm text-slate-500">
              Agency: <strong className="text-indigo-600">{vendorName}</strong>{" "}
              | Here is your placement pipeline.
            </p>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          <ProgressTracker role="vendor" />

          <div className="space-y-8">
            {/* Quick Actions */}
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
                Quick Actions
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <button
                  onClick={() =>
                    setSubmittingReq({
                      id: "quick-submit",
                      title: "Quick Submission",
                    })
                  }
                  className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left"
                >
                  <div className="bg-indigo-50 text-indigo-600 p-3 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <UserPlus size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Submit Candidate
                    </h4>
                    <p className="text-xs text-slate-500">
                      Float your bench candidates
                    </p>
                  </div>
                </button>
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-emerald-50 text-emerald-600 p-3 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <Search size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Search Open Jobs
                    </h4>
                    <p className="text-xs text-slate-500">
                      Browse allocated requirements
                    </p>
                  </div>
                </button>
                <button className="bg-white hover:bg-slate-50 transition-colors border border-slate-200 p-4 rounded-xl flex items-center gap-4 group shadow-sm text-left">
                  <div className="bg-blue-50 text-blue-600 p-3 rounded-lg group-hover:bg-blue-100 transition-colors">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Submit Invoice
                    </h4>
                    <p className="text-xs text-slate-500">
                      Request payment for placements
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
                    Active Operations
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
                      Allocated Requirements
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Open jobs available for you
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
                      Bench Candidates
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Ready for submission
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
                      Updates on your float candidates
                    </p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors cursor-pointer">
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                        <Target size={18} />
                      </div>
                      <span className="text-2xl font-light text-slate-900">
                        {metrics?.placements || 0}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm">
                      Active Placements
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Successful hires
                    </p>
                  </div>
                </div>

                {(metrics?.totalCandidates === 0 && metrics?.totalJobs === 0) && (
                  <div className="mt-8 bg-indigo-50 border border-indigo-100 rounded-2xl p-8 text-center max-w-2xl mx-auto">
                     <Users className="w-12 h-12 text-indigo-300 mx-auto mb-4" />
                     <h3 className="text-lg font-bold text-indigo-900 mb-2">No candidates mapped yet</h3>
                     <p className="text-sm text-indigo-700/80 mb-6">Upload resumes to your bench or use AI Matching to get started.</p>
                     <button className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl transition-colors">
                        Upload Candidates
                     </button>
                  </div>
                )}
              </div>

              {/* Right Column: Financials */}
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Financial Pipeline
                </h3>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
                  <div>
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <DollarSign size={16} />
                      <span className="text-sm font-semibold">
                        Projected Revenue
                      </span>
                    </div>
                    <div className="text-3xl font-light text-slate-900">
                      ₹{((metrics?.revenue || 0) / 1000).toFixed(1)}K
                    </div>
                    <p className="text-xs text-emerald-600 font-medium mt-1">
                      Based on active placements
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                    <div className="flex items-center gap-3 text-slate-600 mb-2">
                      <Clock size={16} />
                      <span className="text-sm font-semibold">
                        Pending Payments
                      </span>
                    </div>
                    <div className="text-3xl font-light text-slate-900">₹0</div>
                  </div>
                </div>

                <ActivityFeed recipients={["GLOBAL_VENDOR"]} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {submittingReq && (
        <CandidateSubmissionModal
          reqId={submittingReq.id}
          reqTitle={submittingReq.title}
          onClose={() => setSubmittingReq(null)}
        />
      )}
    </div>
  );
}
