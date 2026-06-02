import React from "react";
import { Badge } from "../lib/Badge";
import {
  Clock,
  MapPin,
  ListChecks,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  Quote,
  Banknote,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "motion/react";

interface JDIntelligenceProps {
  job: any;
}

export const JDIntelligence: React.FC<JDIntelligenceProps> = ({ job }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <div className="space-y-6">
      {/* Executive Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
          <FileText size={200} />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-indigo-500 hover:bg-indigo-600 text-white border-none text-[10px] uppercase font-black tracking-widest px-3 py-1">
                  {job.status}
                </Badge>
                <span className="text-[10px] font-mono text-indigo-300 uppercase tracking-widest font-bold">
                  Ref: {job.id.slice(0, 8)}
                </span>
              </div>
              <h1 className="text-3xl font-black tracking-tight leading-tight uppercase">
                {job.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 mt-8">
            {(job.budget?.amount || job.clientTargetBudget) > 0 && (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-sm">
                <Banknote className="text-indigo-400" size={18} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                    Budget
                  </p>
                  <p className="text-sm font-bold">
                    {job.budget?.currency || "INR"}{" "}
                    {job.budget?.amount || job.clientTargetBudget}{" "}
                    {job.budget?.period || "LPA"}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-sm">
              <Clock className="text-indigo-400" size={18} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  Experience
                </p>
                <p className="text-sm font-bold">
                  {job.experience || `${job.minExp}+ YRS`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-sm">
              <MapPin className="text-indigo-400" size={18} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  Location
                </p>
                <p className="text-sm font-bold">{job.location || "Remote"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl backdrop-blur-sm">
              <ListChecks className="text-indigo-400" size={18} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  Priority Skills
                </p>
                <p className="text-sm font-bold">
                  {(job.mandatorySkills || []).length} Mandatory
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recruiter Copilot AI Insights */}
      <div className="bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Sparkles size={100} className="text-indigo-600" />
        </div>
        <div className="relative z-10">
           <h3 className="text-[11px] font-black uppercase tracking-widest text-indigo-800 mb-6 flex items-center gap-2">
              <Sparkles size={16} /> Recruiter Copilot Intelligence
           </h3>
           <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm text-center">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fill Probability</div>
                 <div className="text-2xl font-black text-emerald-600">{job.insights?.fillProbability || "82%"}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm text-center">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Avg Closure Time</div>
                 <div className="text-xl font-black text-slate-800 mt-1">{job.insights?.closureTime || "14 Days"}</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-indigo-50 shadow-sm text-center">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Internal Matches</div>
                 <div className="text-xl font-black text-indigo-600 mt-1">{job.insights?.internalMatches || "8"} Candidates</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-rose-50 shadow-sm text-center flex flex-col justify-center items-center">
                 <div className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1">Identified Risk</div>
                 <div className="text-xs font-bold text-rose-700 leading-tight">{job.insights?.risk || "Niche Skill Shortage"}</div>
              </div>
           </div>
           
           <div className="mt-4 bg-white p-4 rounded-xl border border-indigo-50 shadow-sm flex items-center gap-4">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Likely Vendors</div>
              <div className="flex flex-wrap gap-2">
                 {(job.insights?.likelyVendors || ["Worknexa", "ABC Staffing", "XYZ Solutions"]).map((v: string, i: number) => (
                    <Badge key={i} className="bg-indigo-50 text-indigo-700 border-indigo-100">{v}</Badge>
                 ))}
              </div>
           </div>
        </div>
      </div>

      {/* Summary & Intelligence */}
      {job.summary && (
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-white p-8 rounded-3xl border border-slate-100 flex gap-6">
            <div className="shrink-0 h-12 w-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Quote size={24} />
            </div>
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">
                Executive Briefing
              </h3>
              <p className="text-lg font-medium text-slate-800 leading-relaxed italic">
                "{job.summary}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grid: Skills & Responsibilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Mandatory Skills */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
              <div className="h-1 w-4 bg-emerald-500 rounded-full" />
              Mandatory Engineering Stack
            </h3>
            <div className="flex flex-wrap gap-2">
              {(job.mandatorySkills || job.skills || []).map((s: string) => (
                <div
                  key={s}
                  className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-black uppercase tracking-tight"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>

          {/* Preferred Skills */}
          {(job.preferredSkills || []).length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                <div className="h-1 w-4 bg-amber-500 rounded-full" />
                Differentiating Skills
              </h3>
              <div className="flex flex-wrap gap-2">
                {job.preferredSkills.map((s: string) => (
                  <div
                    key={s}
                    className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-xl text-xs font-black uppercase tracking-tight"
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <div className="h-1 w-4 bg-indigo-500 rounded-full" />
            Core Mission & Responsibilities
          </h3>
          <ul className="space-y-4">
            {(job.responsibilities || []).map((r: string, i: number) => (
              <li key={i} className="flex gap-4 group">
                <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors shrink-0">
                  {i + 1}
                </div>
                <p className="text-sm font-medium text-slate-600 leading-relaxed group-hover:text-slate-900 transition-colors">
                  {r}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Full JD Extraction */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-8 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors border-b border-slate-50"
        >
          <div className="flex items-center gap-3">
            <FileText size={18} className="text-slate-400" />
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
              Comprehensive Intelligence Data (JD Full Profile)
            </span>
          </div>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="p-8 prose prose-slate prose-sm max-w-none">
                {job.jdFullProfile ? (
                  <div className="markdown-body">
                    <ReactMarkdown>{job.jdFullProfile}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-slate-500 italic font-medium">
                    No structured markdown profile available for this legacy
                    requirement. Re-running the AI Sync will generate this view.
                  </p>
                )}
                <div className="mt-8 pt-8 border-t border-slate-100">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                    Original RAW Document Trace
                  </h4>
                  <pre className="p-6 bg-slate-50 rounded-2xl text-[11px] text-slate-500 whitespace-pre-wrap font-mono leading-relaxed border border-slate-100 max-h-96 overflow-y-auto">
                    {job.description}
                  </pre>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
