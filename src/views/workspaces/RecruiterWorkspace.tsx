import { useState, useEffect } from "react";
import { getDynamicGreeting } from "../../lib/greetings";
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
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Bot,
  Zap,
  Activity,
  ArrowRight,
  Mail,
  UserCheck
} from "lucide-react";
import { Badge } from "../../lib/Badge";
import { Button } from "../../lib/Button";
import { db } from "../../lib/firebase";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";

export default function RecruiterWorkspace({
  userName,
  orgId,
  metrics,
}: {
  userName: string;
  orgId?: string;
  metrics?: any;
}) {
  const [activeChannels, setActiveChannels] = useState<any[]>([]);

  useEffect(() => {
    const fetchChannels = async () => {
      if (!orgId) return;
      try {
        const q = query(collection(db, "requirements_public"), where("organizationId", "==", orgId), limit(5));
        const snap = await getDocs(q);
        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setActiveChannels(reqs);
      } catch (err) {
        console.error("Failed to load active channels", err);
      }
    };
    fetchChannels();
  }, [orgId]);
  return (
    <div className="flex-1 bg-slate-950 flex flex-col h-full overflow-y-auto text-slate-100 font-sans">
      
      {/* Flagship OS Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 px-8 py-8 relative overflow-hidden shrink-0 border-b border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between relative z-10 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">Operational OS</span>
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              {getDynamicGreeting()}, {userName} 👋
            </h1>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <Bot size={14} className="text-indigo-400" />
              AI Workforce completed 42 tasks while you were offline.
            </p>
          </div>
          
          {/* Real-time Impact Tracker */}
          <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex gap-6 items-center">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Today's Goals</span>
              <div className="flex gap-3 text-xs font-bold text-white mt-1">
                <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> 8 Submits</span>
                <span className="flex items-center gap-1"><Calendar size={12} className="text-blue-400" /> 3 Interviews</span>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-800"></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-wider">AI Sourced Impact</span>
              <div className="flex gap-3 text-xs font-bold text-white mt-1">
                <span className="flex items-center gap-1"><Clock size={12} className="text-amber-400" /> 2.8h Saved</span>
                <span className="text-emerald-400">₹4.6L Saved</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flagship Recruiter OS 3-Column Cockpit Layout */}
      <div className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* COLUMN 1: Left Navigation & Focus Queues (col-span-3) */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold mb-3">
                  Focus Navigation
                </h3>
                <div className="space-y-1.5">
                  {[
                    { label: "🔥 Priority Queue", count: "2 Alerts", color: "text-rose-400 bg-rose-500/10 border-rose-500/10" },
                    { label: "🤖 AI Prepared Matches", count: "12 Ready", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/10" },
                    { label: "📥 Waiting Approvals", count: "7 Items", color: "text-amber-400 bg-amber-500/10 border-amber-500/10" },
                    { label: "👥 Active Pipelines", count: "14 Open", color: "text-slate-400 bg-slate-800/60 border-slate-700/50" },
                    { label: "📅 Today's Interviews", count: "3 Scheduled", color: "text-blue-400 bg-blue-500/10 border-blue-500/10" },
                  ].map((item, idx) => (
                    <button 
                      key={idx} 
                      className="w-full text-left px-4 py-3 rounded-xl border border-slate-900 bg-slate-900/40 hover:bg-slate-900 hover:border-slate-800 flex items-center justify-between transition-all duration-150 group"
                    >
                      <span className="text-xs font-bold text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                      <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${item.color}`}>{item.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Quick Tools */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/20">
                <span className="text-[9px] font-mono uppercase text-slate-500 font-bold block mb-2">Workspace Isolation</span>
                <p className="text-[10px] text-slate-400 font-mono leading-relaxed">
                  Enterprise tenant data is dynamically isolated securely over 10 canonical Business Graph entities.
                </p>
              </div>
            </div>

            {/* COLUMN 2: Middle - Today's Work & Pipelines (col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                <Target size={14} className="text-slate-500" /> Today's Focus Desk
              </h3>

              <div className="space-y-4">
                {/* Priority Alert Box */}
                <div className="p-5 rounded-2xl border border-rose-950 bg-rose-500/5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <AlertCircle size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">Urgent Action Required</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Requirement <strong className="text-white">Senior Frontend Tech Lead</strong> is missing SLA target thresholds. Sourcing speed is below target.
                  </p>
                  <Button variant="outline" className="w-full justify-between group border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs h-9">
                    Address SLA Warning <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>

                {/* Active Pipelines */}
                <div className="space-y-4">
                  <h4 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold">Active Sourcing Channels</h4>
                  
                  <div className="space-y-3">
                    {activeChannels.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40">
                        No active channels.
                      </div>
                    ) : (
                      activeChannels.map((pipe, idx) => {
                        const isHighPriority = pipe.priority === 'High';
                        const badgeColor = isHighPriority ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
                        const badgeText = isHighPriority ? "SLA ALERT" : "OPEN";
                        
                        return (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all duration-200">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <span className={`text-[8px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${badgeColor}`}>{badgeText}</span>
                              <h4 className="text-xs font-black text-white mt-2 leading-tight">{pipe.title || pipe.role}</h4>
                              <p className="text-[10px] text-slate-400 font-mono mt-1">{pipe.organizationId} • {pipe.budget || 'Standard Budget'} • {pipe.status || 'Active'}</p>
                            </div>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-mono uppercase tracking-widest px-3 h-8 self-center shrink-0">
                              Inspect
                            </Button>
                          </div>
                        </div>
                      )})
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 3: Right - AI Copilot & Confidence Meters (col-span-4) */}
            <div className="lg:col-span-4 space-y-6">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" /> AI Agent Copilot
              </h3>

              {/* AI Morning Brief Box */}
              <div className="p-6 rounded-3xl border border-indigo-500/20 bg-gradient-to-b from-indigo-500/5 to-transparent space-y-4">
                <div className="flex items-center gap-2">
                  <Bot size={18} className="text-indigo-400" />
                  <span className="text-xs font-black uppercase text-indigo-300 tracking-wider">Morning Briefing</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Focus on the <strong className="text-white">Senior Java Requirement</strong> first. It has a <strong className="text-emerald-400 font-bold">92% probability of filling</strong> today if we dispatch the 2 candidate matches prepared below.
                </p>
              </div>

              {/* Top AI Match Recommendation with Visual Confidence Meter */}
              <div className="p-6 rounded-3xl border border-slate-800 bg-slate-900 space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-indigo-400">Top Candidate match</span>
                  <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono">94% CONFIDENCE</Badge>
                </div>

                <div>
                  <h4 className="text-sm font-black text-white leading-tight">Sarah Jenkins</h4>
                  <p className="text-xs text-slate-400 font-mono mt-1">Matched for Senior React Developer</p>
                </div>

                {/* AI Confidence Visual Indicator Block */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 uppercase font-bold">
                    <span>AI Confidence</span>
                    <span className="text-emerald-400">HIGH 94%</span>
                  </div>
                  {/* Visual blocks */}
                  <div className="flex gap-1 text-emerald-400 font-mono text-xs select-none">
                    <span>█████████░</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                    Matched via Layer 2 Semantic Inference. Validated with high React placement history and 17 min average vendor response times.
                  </p>
                </div>

                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-mono uppercase font-black text-[10px] tracking-widest h-10 shadow-lg shadow-indigo-500/10">
                  Submit to Client
                </Button>
              </div>

              {/* SLA Optimization Advisory */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <Zap size={14} />
                  <span className="text-[9px] font-mono uppercase font-bold tracking-widest">Sourcing Advisory</span>
                </div>
                <h4 className="text-xs font-bold text-white">Optimize Vendor Routing</h4>
                <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
                  Review top-performing vendors for this requirement based on historic SLA compliance to accelerate shortlisting.
                </p>
                <Button variant="outline" className="w-full text-[10px] font-mono uppercase tracking-widest h-8 border-slate-800 text-slate-300 hover:bg-slate-900">
                  Review Recommendations
                </Button>
              </div>

            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

