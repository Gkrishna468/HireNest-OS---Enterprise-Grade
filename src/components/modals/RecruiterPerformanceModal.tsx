import React from "react";
import { X, Award, TrendingUp, Users, Briefcase, FileText, CheckCircle2, Clock, ShieldCheck, Building2, ExternalLink } from "lucide-react";
import { Button } from "../../lib/Button";
import { Badge } from "../../lib/Badge";
import { recruiterVendorMappingService, RecruiterPerformanceMetrics } from "../../services/recruiterVendorMappingService";

interface Props {
  recruiterId: string;
  recruiterName?: string;
  onClose: () => void;
  isVendorFacing?: boolean; // If true, display sanitized vendor-facing version
}

export const RecruiterPerformanceModal: React.FC<Props> = ({
  recruiterId,
  recruiterName = "Rahul Sharma",
  onClose,
  isVendorFacing = false
}) => {
  const metrics: RecruiterPerformanceMetrics = recruiterVendorMappingService.getRecruiterPerformance(recruiterId, recruiterName);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden my-8 text-slate-900 dark:text-white">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black uppercase tracking-tight">
                {isVendorFacing ? "HireNest Recruiter Performance" : "Recruiter Performance Intelligence"}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {metrics.recruiterName} • {metrics.recruiterRole}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          
          {/* Top Score Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-950 border border-indigo-500/30 rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4">
            <div>
              <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest block mb-1">
                Overall SLA & Quality Index
              </span>
              <div className="text-3xl font-black text-emerald-400 flex items-center gap-2">
                {metrics.slaCompliancePercent}%
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  SLA Compliant
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Avg Response</span>
                <span className="text-lg font-bold text-amber-300">{metrics.avgVendorResponseHours} hrs</span>
              </div>
              <div className="text-center">
                <span className="text-[10px] font-mono text-slate-400 block uppercase">Sub Quality</span>
                <span className="text-lg font-bold text-indigo-300">{metrics.submissionQualityPercent}%</span>
              </div>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">
                Requirements
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {metrics.activeRequirements}
              </span>
              <span className="text-[10px] text-slate-400 block">{metrics.requirementsOwned} total owned</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">
                Submissions
              </span>
              <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {metrics.candidatesSubmitted}
              </span>
              <span className="text-[10px] text-slate-400 block">{metrics.shortlisted} shortlisted</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">
                Interviews
              </span>
              <span className="text-xl font-bold text-amber-500">
                {metrics.interviews}
              </span>
              <span className="text-[10px] text-slate-400 block">{metrics.offers} offers extended</span>
            </div>

            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl space-y-1">
              <span className="text-slate-500 dark:text-slate-400 text-[10px] uppercase font-mono block">
                Placements
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {metrics.placements}
              </span>
              <span className="text-[10px] text-emerald-500 block">Closed joined</span>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Pipeline Conversion Funnel
            </h3>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Submission → Interview</span>
                <span className="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">
                  {metrics.submissionToInterviewRate}%
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Interview → Offer</span>
                <span className="text-lg font-extrabold text-amber-500">
                  {metrics.interviewToOfferRate}%
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Offer → Joining</span>
                <span className="text-lg font-extrabold text-emerald-500">
                  {metrics.offerToJoiningRate}%
                </span>
              </div>
            </div>
          </div>

          {/* Assigned Vendor Network (Exposed only for HQ/Recruiter view) */}
          {!isVendorFacing && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-500" /> Assigned Vendor Network Performance
              </h3>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-[10px] uppercase">
                    <tr>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Open Reqs</th>
                      <th className="p-3">Submissions</th>
                      <th className="p-3">Placements</th>
                      <th className="p-3">SLA Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">ABC Technologies</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">12</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">38</td>
                      <td className="p-3 font-bold text-emerald-600">4</td>
                      <td className="p-3 font-mono font-bold text-indigo-600">91%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">XYZ Solutions</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">8</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">21</td>
                      <td className="p-3 font-bold text-emerald-600">3</td>
                      <td className="p-3 font-mono font-bold text-indigo-600">84%</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-200">Apex Global</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">5</td>
                      <td className="p-3 text-slate-600 dark:text-slate-400">17</td>
                      <td className="p-3 font-bold text-emerald-600">2</td>
                      <td className="p-3 font-mono font-bold text-indigo-600">88%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Verified by HireNest Audit Ledger
            </span>
            <span className="font-mono text-indigo-500">Live Recruiter Scorecard</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button size="sm" onClick={onClose} className="bg-slate-900 text-white hover:bg-slate-800 text-xs px-5">
            Close Scorecard
          </Button>
        </div>
      </div>
    </div>
  );
};
